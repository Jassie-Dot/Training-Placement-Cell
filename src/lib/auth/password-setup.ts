import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectMongo } from "@/lib/db/mongoose";
import { User } from "@/models/user";

const newPasswordSchema = z.string().min(12).max(200);

/** Issue only to a verified recipient through the future invitation/reset mailer. Store the hash, never the token. */
export async function createPasswordSetupToken(userId: string) {
  await connectMongo();
  const user = await User.findOne({ _id: userId, status: { $in: ["ACTIVE", "PENDING_SETUP"] }, deletedAt: null }).select("_id");
  if (!user) throw new Error("Account is unavailable.");
  const token = randomBytes(32).toString("base64url");
  user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  return token;
}

/** Consume a one-time setup/reset token and atomically activate the account with the new password. */
export async function consumePasswordSetupToken(token: string, password: string) {
  const parsed = newPasswordSchema.safeParse(password);
  if (!parsed.success || token.length < 32 || token.length > 128) return false;
  await connectMongo();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(parsed.data, 12);
  const result = await User.updateOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() }, status: { $in: ["ACTIVE", "PENDING_SETUP"] }, deletedAt: null }, {
    $set: { passwordHash, passwordSetAt: new Date(), mustChangePassword: false, status: "ACTIVE" },
    $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
  });
  return result.modifiedCount === 1;
}
