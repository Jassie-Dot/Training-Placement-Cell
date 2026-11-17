import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/db/mongoose";
import { Enrollment } from "@/models/enrollment";
import { ReportingPeriod } from "@/models/reporting-period";
import { Report } from "@/models/report";
import { Student } from "@/models/student";
import { Notification } from "@/models/notification";
import { sendNotificationEmail } from "@/lib/email/brevo";
import { getPortalSettings, isInstitutionalEmail } from "@/lib/config/system-settings";
function authorized(request: Request) { const secret = process.env.CRON_SECRET; const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""; if (!secret || !token) return false; const a = createHash("sha256").update(secret).digest(); const b = createHash("sha256").update(token).digest(); return timingSafeEqual(a, b); }
function localDay(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function dayDifference(target: Date, current: Date) { return Math.round((Date.parse(`${localDay(target)}T00:00:00Z`) - Date.parse(`${localDay(current)}T00:00:00Z`)) / 86400000); }
async function deliver(userId: string, email: string, key: string, title: string, body: string) {
  await Notification.findOneAndUpdate({ idempotencyKey: `mail:${key}` }, { $setOnInsert: { recipient: userId, channel: "EMAIL", type: "REPORTING_REMINDER", title, body, idempotencyKey: `mail:${key}`, deliveryStatus: "QUEUED", deliveryAttempts: 0 } }, { upsert: true, new: true });
  const now = new Date(); const claimed = await Notification.findOneAndUpdate({ idempotencyKey: `mail:${key}`, deliveryStatus: { $ne: "SENT" }, $or: [{ deliveryLeaseUntil: null }, { deliveryLeaseUntil: { $lt: now } }] }, { $set: { deliveryStatus: "QUEUED", deliveryLeaseUntil: new Date(now.getTime() + 90_000) }, $inc: { deliveryAttempts: 1 } }, { new: true });
  if (!claimed) return;
  try { const id = await sendNotificationEmail(email, title, body); await Notification.updateOne({ _id: claimed._id }, { $set: { deliveryStatus: "SENT", sentAt: now, deliveredAt: now, providerMessageId: id, lastDeliveryErrorCode: null, deliveryLeaseUntil: null } }); }
  catch (error) { await Notification.updateOne({ _id: claimed._id }, { $set: { deliveryStatus: "FAILED", lastDeliveryErrorCode: error instanceof Error ? error.name.slice(0, 80) : "DeliveryError", deliveryLeaseUntil: null } }); }
}
async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: process.env.CRON_SECRET ? 401 : 503 });
  try {
    await connectMongo(); const settings = await getPortalSettings(); const now = new Date(); const periods = await ReportingPeriod.find({ status: { $ne: "CLOSED" }, endDate: { $gte: new Date(now.getTime() - 60 * 86400000) } }).select("_id training sequence dueDate extensionUntil status").limit(500).lean();
    let generated = 0; let mailed = 0;
    for (const period of periods) {
      const deadline = period.extensionUntil ?? period.dueDate; const diff = dayDifference(deadline, now); const type = diff === 5 ? "DEADLINE_REMINDER_5_DAY" : diff === 2 ? "DEADLINE_REMINDER_2_DAY" : diff === 0 ? "DEADLINE_REMINDER_DAY" : diff < 0 ? "REPORT_OVERDUE" : null;
      if (!type) continue;
      const enrollments = await Enrollment.find({ training: period.training, status: "ACTIVE", deletedAt: null }).select("_id student").limit(1000).lean();
      for (const enrollment of enrollments) {
        const report = await Report.findOne({ enrollment: enrollment._id, reportingPeriod: period._id, deletedAt: null }).select("status").lean();
        if (report && !["REJECTED", "RESUBMISSION_REQUIRED"].includes(report.status)) continue;
        const student = await Student.findOne({ _id: enrollment.student, status: "ACTIVE", deletedAt: null }).select("user email").lean(); if (!student) continue;
        const title = type === "REPORT_OVERDUE" ? "Reporting deadline missed" : "Reporting deadline reminder";
        const body = type === "REPORT_OVERDUE" ? `A report for period ${period.sequence} is overdue. Sign in to review your training page and contact faculty if you need assistance.` : `Your report for period ${period.sequence} is due in ${diff} day${diff === 1 ? "" : "s"}. Sign in to submit your PDF.`;
        const key = `${type}:${period._id.toString()}:${enrollment._id.toString()}:${deadline.getTime()}`;
        const notice = await Notification.updateOne({ idempotencyKey: key }, { $setOnInsert: { recipient: student.user, channel: "IN_APP", type, title, body, idempotencyKey: key } }, { upsert: true }); if (notice.upsertedCount) generated++;
        if (settings.reminderEmailsEnabled && student.email && isInstitutionalEmail(student.email, settings.institutionalEmailDomains)) { await deliver(student.user.toString(), student.email, `${key}:${deadline.getTime()}`, title, body); mailed++; }
      }
    }
    return NextResponse.json({ ok: true, periodsChecked: periods.length, notificationsCreated: generated, emailAttempts: mailed });
  } catch { return NextResponse.json({ error: "Scheduled reporting job failed." }, { status: 500 }); }
}
export const GET = run;
export const POST = run;
