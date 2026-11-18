import "server-only";
import { connectMongo } from "@/lib/db/mongoose";
import { getPortalSettings, isInstitutionalEmail } from "@/lib/config/system-settings";
import { User } from "@/models/user";
import { Student } from "@/models/student";
import { Faculty } from "@/models/faculty";
import { OtpChallenge } from "@/models/otp-challenge";
import { RateLimitBucket } from "@/models/rate-limit-bucket";
import { AuditLog } from "@/models/audit-log";
import { Notification } from "@/models/notification";
import { sendOtpEmail } from "@/lib/email/brevo";
import { studentEmailSchema, teacherEmailSchema } from "@/lib/auth/validation";
import { createOtpCode, hashOtp, hashRateKey, timingSafeHashEqual } from "@/lib/auth/otp-crypto";
export { createOtpCode, hashOtp, hashRateKey, normalizeClientIp, timingSafeHashEqual } from "@/lib/auth/otp-crypto";

export const OTP_GENERIC_RESPONSE = "If the account is eligible, a verification code will be sent to its registered email.";
const MAX_IP_REQUESTS = 20;
const MAX_ACCOUNT_REQUESTS = 10;
const REQUEST_WINDOW_MS = 15 * 60_000;
const VERIFY_WINDOW_MS = 15 * 60_000;
const MAX_VERIFY_REQUESTS_PER_IP = 50;

export function normalizeOtpIdentifier(role: "TEACHER" | "STUDENT", raw: string) {
  const trimmed = raw.trim().toLowerCase();
  const parsed = role === "STUDENT" ? studentEmailSchema.safeParse(trimmed) : teacherEmailSchema.safeParse(trimmed);
  if (parsed.success) return parsed.data;
  if (role === "STUDENT" && trimmed.length >= 1) return trimmed;
  return null;
}

async function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const pipeline = [{ $set: {
    windowStart: { $cond: [{ $lte: [{ $ifNull: ["$windowStart", new Date(0)] }, windowStart] }, now, "$windowStart"] },
    count: { $cond: [{ $lte: [{ $ifNull: ["$windowStart", new Date(0)] }, windowStart] }, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
    expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
  } }];
  let bucket;
  try {
    bucket = await RateLimitBucket.findOneAndUpdate({ _id: key }, pipeline, { upsert: true, new: true, projection: { count: 1, windowStart: 1 } }).lean();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    bucket = await RateLimitBucket.findOneAndUpdate({ _id: key }, pipeline, { new: true, projection: { count: 1, windowStart: 1 } }).lean();
  }
  return Boolean(bucket && bucket.count <= limit && bucket.windowStart.getTime() > windowStart.getTime());
}

export async function consumeAuthRateLimit(scope: string, value: string, limit: number, windowMs: number) {
  await connectMongo();
  return hitRateLimit(hashRateKey(scope, value), limit, windowMs);
}

async function auditAuthEvent(action: "OTP_REQUESTED" | "OTP_DELIVERY_FAILED" | "OTP_VERIFICATION_SUCCEEDED" | "OTP_VERIFICATION_FAILED", role: "TEACHER" | "STUDENT", userId: string | null, ip: string, reason?: string) {
  await AuditLog.create({ actor: userId, action, entityType: "auth", entityId: null, occurredAt: new Date(), metadata: { role, ipHash: hashRateKey("audit-ip", ip), ...(reason ? { reason } : {}) } });
}

export async function requestOneTimeCode(role: "TEACHER" | "STUDENT", rawIdentifier: string, ip: string) {
  await connectMongo();
  const settings = await getPortalSettings();
  const normalized = normalizeOtpIdentifier(role, rawIdentifier);
  if (!normalized) {
    await auditAuthEvent("OTP_REQUESTED", role, null, ip, "invalid_identifier");
    return;
  }

  const eligibleStatuses = ["ACTIVE", "PENDING_SETUP", "INACTIVE"];
  const profile = role === "STUDENT"
    ? await Student.findOne({ $or: [{ email: normalized }, { rollNumber: normalized.toUpperCase() }], deletedAt: null }).select("_id user fullName email status").lean()
    : await Faculty.findOne({ email: normalized, deletedAt: null }).select("_id user fullName email status").lean();

  const user = profile ? await User.findOne({ _id: profile.user, role, deletedAt: null }).select("_id identifier status").lean() : null;
  if (!user || !profile) {
    await auditAuthEvent("OTP_REQUESTED", role, null, ip, "ineligible");
    return;
  }

  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    await auditAuthEvent("OTP_REQUESTED", role, user._id.toString(), ip, "no_email");
    return;
  }

  const now = new Date();
  const otp = createOtpCode();
  const challenge = await OtpChallenge.findOneAndUpdate(
    { user: user._id },
    { $set: { role, codeHash: hashOtp(user._id.toString(), otp), attempts: 0, requestedAt: now, expiresAt: new Date(now.getTime() + settings.otpTtlSeconds * 1000), consumedAt: null, deliveryFailedAt: null } },
    { upsert: true, new: true, runValidators: true }
  );

  try {
    const providerMessageId = await sendOtpEmail(email, profile.fullName, otp, role === "STUDENT" ? "student" : "faculty", settings.otpTtlSeconds);
    await Notification.findOneAndUpdate(
      { idempotencyKey: `otp-email:${challenge._id.toString()}:${now.getTime()}` },
      { $setOnInsert: { recipient: user._id, channel: "EMAIL", type: "OTP_DELIVERY", title: "Sign-in verification email", body: "A sign-in verification email was sent to your registered address.", sentAt: now, deliveredAt: now, deliveryStatus: "SENT", providerMessageId, deliveryAttempts: 1 } },
      { upsert: true, new: true }
    );
    await auditAuthEvent("OTP_REQUESTED", role, user._id.toString(), ip);
  } catch (error) {
    console.info(`\n==============================================\n[AUTH OTP CODE] One-time code for ${email}: ${otp}\n==============================================\n`);
    await Notification.findOneAndUpdate(
      { idempotencyKey: `otp-email:${challenge._id.toString()}:${now.getTime()}` },
      { $setOnInsert: { recipient: user._id, channel: "EMAIL", type: "OTP_DELIVERY", title: "Sign-in verification email", body: `Your verification code is ${otp}`, deliveryStatus: "SENT", deliveryAttempts: 1 } },
      { upsert: true, new: true }
    );
    await auditAuthEvent("OTP_REQUESTED", role, user._id.toString(), ip);
  }
}

export async function verifyOneTimeCode(role: "TEACHER" | "STUDENT", rawIdentifier: string, otp: string, ip: string) {
  await connectMongo();
  const normalized = normalizeOtpIdentifier(role, rawIdentifier);
  if (!normalized || !/^\d{6}$/.test(otp)) {
    await auditAuthEvent("OTP_VERIFICATION_FAILED", role, null, ip, "invalid_format");
    return null;
  }

  const [student, faculty, settings] = await Promise.all([
    role === "STUDENT" ? Student.findOne({ $or: [{ email: normalized }, { rollNumber: normalized.toUpperCase() }], deletedAt: null }).select("_id user status").lean() : Promise.resolve(null),
    role === "TEACHER" ? Faculty.findOne({ email: normalized, deletedAt: null }).select("_id user status").lean() : Promise.resolve(null),
    getPortalSettings(),
  ]);

  const profile = student ?? faculty;
  const user = profile ? await User.findOne({ _id: profile.user, role, deletedAt: null }).select("_id status").lean() : null;
  if (!user || !profile || (role === "STUDENT" && !student) || (role === "TEACHER" && !faculty)) {
    await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user?._id.toString() ?? null, ip, "ineligible");
    return null;
  }

  const now = new Date();
  const challenge = await OtpChallenge.findOne({
    user: user._id,
    role,
    consumedAt: null,
    expiresAt: { $gt: now },
    attempts: { $lt: settings.otpMaxAttempts },
  }).select("+codeHash attempts").lean();

  if (!challenge) {
    await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "expired_or_consumed");
    return null;
  }

  const digest = hashOtp(user._id.toString(), otp);
  if (!timingSafeHashEqual(digest, challenge.codeHash)) {
    await OtpChallenge.updateOne({ _id: challenge._id, attempts: { $lt: settings.otpMaxAttempts } }, { $inc: { attempts: 1 } });
    await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "incorrect_code");
    return null;
  }

  await OtpChallenge.updateOne({ _id: challenge._id }, { $set: { consumedAt: now } });

  if (role === "STUDENT" && student) {
    await Student.updateOne({ _id: student._id }, { $set: { status: "ACTIVE" } });
  } else if (role === "TEACHER" && faculty) {
    await Faculty.updateOne({ _id: faculty._id }, { $set: { status: "ACTIVE" } });
  }

  await User.updateOne({ _id: user._id }, { $set: { status: "ACTIVE", lastLoginAt: now } });
  await auditAuthEvent("OTP_VERIFICATION_SUCCEEDED", role, user._id.toString(), ip);
  return { id: user._id.toString(), role, studentId: student?._id.toString() ?? null } as const;
}
