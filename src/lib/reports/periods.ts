import "server-only";
import mongoose, { Types } from "mongoose";
import { connectMongo } from "@/lib/db/mongoose";
import { requireTrainingPermission } from "@/lib/auth/access";
import { Training } from "@/models/training";
import { ReportingPeriod } from "@/models/reporting-period";
import { Enrollment } from "@/models/enrollment";
import { Notification } from "@/models/notification";
import { AuditLog } from "@/models/audit-log";
import { Student } from "@/models/student";
import { getPortalSettings } from "@/lib/config/system-settings";
import { buildPeriodDates, parsePortalDate } from "@/lib/reports/period-utils";
async function insertNotifications(rows: Parameters<typeof Notification.insertMany>[0]) {
  const docs = rows as Record<string, unknown>[];
  for (let i = 0; i < docs.length; i += 500) {
    try { await Notification.insertMany(docs.slice(i, i + 500), { ordered: false }); }
    catch (error) { const writeErrors = (error as { writeErrors?: { code: number }[] }).writeErrors; if ((error as { code?: number }).code !== 11000 && (!writeErrors?.length || writeErrors.some((item) => item.code !== 11000))) throw error; }
  }
}
export async function configureReportingPeriods(code: string, rawStart: string, rawEnd: string, instructions: string) {
  const principal = await requireTrainingPermission("TRAININGS_MANAGE", code);
  const start = parsePortalDate(rawStart); const end = parsePortalDate(rawEnd); const settings = await getPortalSettings();
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end || !instructions.trim() || instructions.length > 3000) throw new Error("Check the date range and instructions.");
  await connectMongo();
  const training = await Training.findOne({ code, status: "ACTIVE" }).select("_id reportingFrequencyDays").lean();
  if (!training) throw new Error("Active training program not found.");
  const dates = buildPeriodDates(start, end, training.reportingFrequencyDays || settings.reportingIntervalDays);
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    for (const item of dates) await ReportingPeriod.updateOne({ training: training._id, sequence: item.sequence }, { $setOnInsert: { ...item, training: training._id, status: item.startDate <= new Date() ? "OPEN" : "SCHEDULED", instructions: instructions.trim(), createdBy: new Types.ObjectId(principal.userId) } }, { upsert: true, session, runValidators: true });
    await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "REPORTING_PERIODS_CONFIGURED", entityType: "training", entityId: training._id, occurredAt: new Date(), metadata: { code, startDate: start, endDate: end, createdCount: dates.length } }], { session });
  }); } finally { await session.endSession(); }
  const periods = await ReportingPeriod.find({ training: training._id, sequence: { $in: dates.map((period) => period.sequence) } }).select("_id sequence").lean();
  const enrollments = await Enrollment.find({ training: training._id, status: "ACTIVE", deletedAt: null }).select("_id student").lean();
  const students = await Student.find({ _id: { $in: enrollments.map((row) => row.student) }, status: "ACTIVE", deletedAt: null }).select("_id user").lean();
  const userByStudent = new Map(students.map((student) => [student._id.toString(), student.user]));
  const notices = periods.flatMap((period) => enrollments.flatMap((enrollment) => { const recipient = userByStudent.get(enrollment.student.toString()); return recipient ? [{ recipient, channel: "IN_APP", type: "REPORTING_PERIOD_CREATED", title: `Reporting period ${period.sequence} is available`, body: `A reporting period is available for ${code}. Check your training page for instructions and deadlines.`, idempotencyKey: `period:${period._id.toString()}:enrollment:${enrollment._id.toString()}` }] : []; }));
  await insertNotifications(notices);
  return { count: dates.length };
}
export async function updatePeriod(code: string, id: string, mode: "EXTEND" | "CLOSE", date?: string) {
  const principal = await requireTrainingPermission("TRAININGS_MANAGE", code);
  if (!Types.ObjectId.isValid(id)) throw new Error("Reporting period not found.");
  await connectMongo();
  const initial = await ReportingPeriod.findById(id).populate("training", "code");
  if (!initial || (initial.training as unknown as { code: string }).code !== code) throw new Error("Reporting period not found.");
  const session = await mongoose.startSession(); const trainingId = initial.training._id; let extensionUntil: Date | null = initial.extensionUntil ?? null;
  try { await session.withTransaction(async () => {
    const period = await ReportingPeriod.findOne({ _id: id, training: trainingId }).session(session);
    if (!period) throw new Error("Reporting period not found.");
    if (mode === "EXTEND") { const extensionStart = parsePortalDate(date ?? ""); const extension = new Date(extensionStart.getTime() + 86400000 - 1); if (!Number.isFinite(extension.getTime()) || extension <= (period.extensionUntil ?? period.dueDate)) throw new Error("Extension must be later than the current deadline."); period.extensionUntil = extension; extensionUntil = extension; }
    else { period.status = "CLOSED"; period.closedAt = new Date(); }
    await period.save({ session });
    await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: mode === "EXTEND" ? "REPORTING_DEADLINE_EXTENDED" : "REPORTING_PERIOD_CLOSED", entityType: "reportingPeriod", entityId: period._id, occurredAt: new Date(), metadata: { code, extensionUntil: period.extensionUntil } }], { session });
  }); } finally { await session.endSession(); }
  if (mode === "EXTEND" && extensionUntil) {
    const enrollments = await Enrollment.find({ training: trainingId, status: "ACTIVE", deletedAt: null }).select("_id student").lean();
    const students = await Student.find({ _id: { $in: enrollments.map((row) => row.student) } }).select("_id user").lean(); const userByStudent = new Map(students.map((student) => [student._id.toString(), student.user]));
    const notices = enrollments.flatMap((enrollment) => { const recipient = userByStudent.get(enrollment.student.toString()); return recipient ? [{ recipient, channel: "IN_APP", type: "DEADLINE_EXTENDED", title: "Reporting deadline extended", body: `The deadline for this period was extended to ${extensionUntil!.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`, idempotencyKey: `period-extension:${id}:${extensionUntil!.getTime()}:${enrollment._id.toString()}` }] : []; });
    await insertNotifications(notices);
  }
}
