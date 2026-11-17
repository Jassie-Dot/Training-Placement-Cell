import "../src/models/user";
import "../src/models/faculty";
import "../src/models/audit-log";
import { connectMongo } from "../src/lib/db/mongoose";
import { teacherEmailSchema } from "../src/lib/auth/validation";
import { User } from "../src/models/user";
import { Faculty } from "../src/models/faculty";
import { AuditLog } from "../src/models/audit-log";
import mongoose, { Types } from "mongoose";
const permissions = ["STUDENTS_READ", "STUDENTS_WRITE", "TRAININGS_MANAGE", "REPORTS_REVIEW", "ANALYTICS_READ", "EXPORT"] as const;
const trainings = ["TR-101", "TR-102", "TR-103", "TR-104"] as const;
async function main() {
  const actorEmailResult = teacherEmailSchema.safeParse(process.env.ACCESS_ACTOR_EMAIL); const targetEmailResult = teacherEmailSchema.safeParse(process.env.TARGET_FACULTY_EMAIL);
  const actorEmail = actorEmailResult.success ? actorEmailResult.data : undefined; const targetEmail = targetEmailResult.success ? targetEmailResult.data : undefined;
  const requestedPermissions = (process.env.TARGET_PERMISSIONS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const requestedTrainings = (process.env.TARGET_TRAINING_CODES ?? "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
  if (!actorEmail || !targetEmail || requestedPermissions.some((value) => !permissions.includes(value as (typeof permissions)[number])) || requestedTrainings.some((value) => !trainings.includes(value as (typeof trainings)[number]))) throw new Error("Set valid Gmail ACCESS_ACTOR_EMAIL and TARGET_FACULTY_EMAIL values, plus valid comma-separated TARGET_PERMISSIONS and TARGET_TRAINING_CODES.");
  await connectMongo();
  const actorUser = await User.findOne({ identifier: actorEmail, role: "TEACHER", status: "ACTIVE", deletedAt: null }).select("_id").lean();
  const actor = actorUser ? await Faculty.findOne({ user: actorUser._id, status: "ACTIVE", deletedAt: null }).select("permissions trainingCodes").lean() : null;
  if (!actor?.permissions.includes("TRAININGS_MANAGE") || actor.trainingCodes.length) throw new Error("The acting account must be an active, institution-wide faculty manager.");
  const targetUser = await User.findOne({ identifier: targetEmail, role: "TEACHER", deletedAt: null }).select("_id").lean();
  const target = targetUser ? await Faculty.findOne({ user: targetUser._id, deletedAt: null }).select("_id permissions trainingCodes").lean() : null;
  if (!target) throw new Error("Target faculty account not found.");
  const before = { permissions: target.permissions, trainingCodes: target.trainingCodes };
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    const result = await Faculty.updateOne({ _id: target._id }, { $set: { permissions: requestedPermissions, trainingCodes: requestedTrainings } }, { runValidators: true, session });
    if (result.matchedCount !== 1) throw new Error("Target faculty account not found.");
    await AuditLog.create([{ actor: new Types.ObjectId(actorUser!._id), action: "FACULTY_PERMISSIONS_CHANGED", entityType: "faculty", entityId: target._id, occurredAt: new Date(), metadata: { before, after: { permissions: requestedPermissions, trainingCodes: requestedTrainings } } }], { session });
  }); } finally { await session.endSession(); }
  console.info(`Access updated for ${targetEmail}.`);
}
main().catch((error: unknown) => { console.error("Faculty access update failed.", error instanceof Error ? error.message : "Unknown error."); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
