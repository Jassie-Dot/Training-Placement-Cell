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
const MAX_IP_REQUESTS = 10;
const MAX_ACCOUNT_REQUESTS = 3;
const REQUEST_WINDOW_MS = 15 * 60_000;
const VERIFY_WINDOW_MS = 15 * 60_000;
const MAX_VERIFY_REQUESTS_PER_IP = 30;

export function normalizeOtpIdentifier(role: "TEACHER" | "STUDENT", raw: string) {
  const parsed = role === "STUDENT" ? studentEmailSchema.safeParse(raw) : teacherEmailSchema.safeParse(raw);
  if (!parsed.success) return null;
  return String(parsed.data).toLowerCase();
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
  const accountKey = hashRateKey(`otp-request-${role}`, normalized ?? rawIdentifier.trim().toLowerCase().slice(0, 254));
  const ipKey = hashRateKey("otp-request-ip", ip);
  const [ipAllowed, accountWindowAllowed, resendAllowed] = await Promise.all([
    hitRateLimit(ipKey, MAX_IP_REQUESTS, REQUEST_WINDOW_MS),
    hitRateLimit(accountKey, MAX_ACCOUNT_REQUESTS, REQUEST_WINDOW_MS),
    hitRateLimit(`${accountKey}:cooldown`, 1, settings.otpResendCooldownSeconds * 1000),
  ]);
  if (!normalized || !ipAllowed || !accountWindowAllowed || !resendAllowed) {
    await auditAuthEvent("OTP_REQUESTED", role, null, ip, "rate_limited_or_ineligible");
    return;
  }

  const eligibleStatuses = role === "STUDENT" ? ["ACTIVE", "PENDING_SETUP"] : ["ACTIVE"];
  const profile = role === "STUDENT"
    ? await Student.findOne({ email: normalized, deletedAt: null }).select("_id user fullName email status").lean()
    : await Faculty.findOne({ email: normalized, deletedAt: null }).select("_id user fullName email status").lean();
  const user = profile ? await User.findOne({ _id: profile.user, role, status: { $in: eligibleStatuses }, deletedAt: null }).select("_id identifier status").lean() : null;
  const profileEligible = role === "STUDENT"
    ? profile && (profile.status === "ACTIVE" || (user?.status === "PENDING_SETUP" && profile.status === "INACTIVE"))
    : profile?.status === "ACTIVE";
  if (!user || !profileEligible) { await auditAuthEvent("OTP_REQUESTED", role, null, ip, "ineligible"); return; }
  const email = profile?.email?.trim().toLowerCase();
  if (!profile || !email || !isInstitutionalEmail(email, settings.institutionalEmailDomains)) { await auditAuthEvent("OTP_REQUESTED", role, user._id.toString(), ip, "ineligible"); return; }

  const now = new Date();
  const otp = createOtpCode();
  const challenge = await OtpChallenge.findOneAndUpdate({ user: user._id }, { $set: { role, codeHash: hashOtp(user._id.toString(), otp), attempts: 0, requestedAt: now, expiresAt: new Date(now.getTime() + settings.otpTtlSeconds * 1000), consumedAt: null, deliveryFailedAt: null } }, { upsert: true, new: true, runValidators: true });
  try {
    const providerMessageId = await sendOtpEmail(email, profile.fullName, otp, role === "STUDENT" ? "student" : "faculty", settings.otpTtlSeconds);
    await Notification.findOneAndUpdate({ idempotencyKey: `otp-email:${challenge._id.toString()}:${now.getTime()}` }, { $setOnInsert: { recipient: user._id, channel: "EMAIL", type: "OTP_DELIVERY", title: "Sign-in verification email", body: "A sign-in verification email was sent to your registered address.", sentAt: now, deliveredAt: now, deliveryStatus: "SENT", providerMessageId, deliveryAttempts: 1 } }, { upsert: true, new: true });
    await auditAuthEvent("OTP_REQUESTED", role, user._id.toString(), ip);
  } catch (error) {
    await OtpChallenge.updateOne({ _id: challenge._id }, { $set: { deliveryFailedAt: new Date() } });
    const errorCode = error instanceof Error ? error.name.slice(0, 80) : "DeliveryError";
    await Notification.findOneAndUpdate({ idempotencyKey: `otp-email:${challenge._id.toString()}:${now.getTime()}` }, { $setOnInsert: { recipient: user._id, channel: "EMAIL", type: "OTP_DELIVERY", title: "Sign-in verification email", body: "A sign-in verification email could not be delivered.", deliveryStatus: "FAILED", lastDeliveryErrorCode: errorCode, deliveryAttempts: 1 } }, { upsert: true, new: true });
    await auditAuthEvent("OTP_DELIVERY_FAILED", role, user._id.toString(), ip, errorCode);
  }
}

export async function verifyOneTimeCode(role: "TEACHER" | "STUDENT", rawIdentifier: string, otp: string, ip: string) {
  await connectMongo();
  const normalized = normalizeOtpIdentifier(role, rawIdentifier);
  if (!normalized || !/^\d{6}$/.test(otp)) { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, null, ip, "invalid_format"); return null; }
  if (!(await hitRateLimit(hashRateKey("otp-verify-ip", ip), MAX_VERIFY_REQUESTS_PER_IP, VERIFY_WINDOW_MS))) { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, null, ip, "rate_limited"); return null; }
  const eligibleStatuses = role === "STUDENT" ? ["ACTIVE", "PENDING_SETUP"] : ["ACTIVE"];
  const [student, faculty, settings] = await Promise.all([
    role === "STUDENT" ? Student.findOne({ email: normalized, deletedAt: null }).select("_id user status").lean() : Promise.resolve(null),
    role === "TEACHER" ? Faculty.findOne({ email: normalized, deletedAt: null }).select("_id user status").lean() : Promise.resolve(null),
    getPortalSettings(),
  ]);
  const profile = student ?? faculty;
  const user = profile ? await User.findOne({ _id: profile.user, role, status: { $in: eligibleStatuses }, deletedAt: null }).select("_id status").lean() : null;
  const profileEligible = role === "STUDENT"
    ? student && (student.status === "ACTIVE" || (user?.status === "PENDING_SETUP" && student.status === "INACTIVE"))
    : faculty?.status === "ACTIVE";
  if (!user || !profileEligible || (role === "STUDENT" && !student) || (role === "TEACHER" && !faculty)) { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user?._id.toString() ?? null, ip, "ineligible"); return null; }
  const now = new Date();
  const challenge = await OtpChallenge.findOne({ user: user._id, role, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: settings.otpMaxAttempts } }).select("+codeHash attempts").lean();
  if (!challenge) { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "expired_or_consumed"); return null; }
  const digest = hashOtp(user._id.toString(), otp);
  if (!timingSafeHashEqual(digest, challenge.codeHash)) {
    await OtpChallenge.updateOne({ _id: challenge._id, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: settings.otpMaxAttempts } }, { $inc: { attempts: 1 } });
    await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "incorrect_code");
    return null;
  }
  const consumed = await OtpChallenge.updateOne({ _id: challenge._id, role, codeHash: digest, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: settings.otpMaxAttempts } }, { $set: { consumedAt: now } });
  if (consumed.modifiedCount !== 1) { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "concurrent_or_replayed"); return null; }
  if (role === "STUDENT" && user.status === "PENDING_SETUP" && student?.status === "INACTIVE") {
    const studentActivated = await Student.updateOne({ _id: student._id, user: user._id, status: "INACTIVE", deletedAt: null }, { $set: { status: "ACTIVE" } });
    if (studentActivated.modifiedCount !== 1) { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "student_profile_not_eligible"); return null; }
  }
  const activated = await User.updateOne({ _id: user._id, role, status: { $in: eligibleStatuses }, deletedAt: null }, { $set: { status: "ACTIVE", lastLoginAt: now } });
  if (activated.modifiedCount !== 1 && user.status !== "ACTIVE") { await auditAuthEvent("OTP_VERIFICATION_FAILED", role, user._id.toString(), ip, "account_not_eligible"); return null; }
  await auditAuthEvent("OTP_VERIFICATION_SUCCEEDED", role, user._id.toString(), ip);
  return { id: user._id.toString(), role, studentId: student?._id.toString() ?? null } as const;
}
