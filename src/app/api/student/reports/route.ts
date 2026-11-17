import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { requireApiRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { getPortalSettings } from "@/lib/config/system-settings";
import { deletePrivatePdf, inspectPendingPdf, promotePendingPdf } from "@/lib/storage/s3";
import { Enrollment } from "@/models/enrollment";
import { ReportingPeriod } from "@/models/reporting-period";
import { Report } from "@/models/report";
import { AuditLog } from "@/models/audit-log";
import { Notification } from "@/models/notification";
import { Faculty } from "@/models/faculty";
import { User } from "@/models/user";
import { Training } from "@/models/training";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let pendingKey: string | null = null; let finalKey: string | null = null;
  try {
    const principal = await requireApiRole("STUDENT"); if (!principal.studentId) return NextResponse.json({ error: "Student profile is unavailable." }, { status: 403 });
    const body = await request.json(); const periodId = String(body?.reportingPeriodId ?? ""); const title = String(body?.title ?? "").trim(); const description = String(body?.description ?? "").trim(); const fileName = String(body?.fileName ?? ""); const storageKey = String(body?.storageKey ?? "");
    if (!Types.ObjectId.isValid(periodId) || title.length < 2 || title.length > 180 || description.length > 5000 || fileName.length < 5 || fileName.length > 255 || !fileName.toLowerCase().endsWith(".pdf") || !new RegExp(`^pending-uploads/${principal.studentId}/${periodId}/[a-f0-9-]{36}\\.pdf$`).test(storageKey)) return NextResponse.json({ error: "Check the report details and uploaded PDF." }, { status: 400 });
    pendingKey = storageKey;
    const settings = await getPortalSettings(); const inspected = await inspectPendingPdf(storageKey);
    if (inspected.studentId !== principal.studentId || inspected.periodId !== periodId || inspected.contentType !== "application/pdf" || inspected.sizeBytes < 1 || inspected.sizeBytes > settings.reportMaxSizeBytes || !inspected.signatureValid) { await deletePrivatePdf(storageKey).catch(() => undefined); pendingKey = null; return NextResponse.json({ error: "The stored file failed PDF, ownership, or size validation." }, { status: 400 }); }
    await connectMongo(); const period = await ReportingPeriod.findOne({ _id: periodId, status: { $ne: "CLOSED" } }).lean(); if (!period) { await deletePrivatePdf(storageKey).catch(() => undefined); pendingKey = null; return NextResponse.json({ error: "Reporting period is unavailable." }, { status: 404 }); }
    const now = new Date(); if (now < period.startDate || now > (period.extensionUntil ?? period.dueDate)) { await deletePrivatePdf(storageKey).catch(() => undefined); pendingKey = null; return NextResponse.json({ error: "This reporting period is not currently accepting submissions." }, { status: 409 }); }
    const enrollment = await Enrollment.findOne({ student: principal.studentId, training: period.training, status: "ACTIVE", deletedAt: null }).select("_id").lean(); if (!enrollment) { await deletePrivatePdf(storageKey).catch(() => undefined); pendingKey = null; return NextResponse.json({ error: "You are not enrolled in this training." }, { status: 403 }); }
    const existing = await Report.findOne({ enrollment: enrollment._id, reportingPeriod: period._id, deletedAt: null }).select("_id status revisions").lean();
    if (existing && !["REJECTED", "RESUBMISSION_REQUIRED"].includes(existing.status)) { await deletePrivatePdf(storageKey).catch(() => undefined); pendingKey = null; return NextResponse.json({ error: "A report already exists for this period and is not open for resubmission." }, { status: 409 }); }
    const revision = (existing?.revisions.length ?? 0) + 1; finalKey = `reports/${principal.studentId}/${period._id.toString()}/${randomUUID()}.pdf`; await promotePendingPdf(storageKey, finalKey);
    const safeFilename = fileName.replace(/[\\/\r\n]/g, "_").slice(0, 255); const session = await mongoose.startSession();
    try { await session.withTransaction(async () => {
      let reportId = existing?._id ?? null;
      if (existing) {
        const updated = await Report.updateOne({ _id: existing._id, status: { $in: ["REJECTED", "RESUBMISSION_REQUIRED"] }, "revisions.version": revision - 1 }, { $set: { status: "SUBMITTED" }, $push: { revisions: { version: revision, title, description, storageKey: finalKey, originalFilename: safeFilename, contentType: "application/pdf", sizeBytes: inspected.sizeBytes, submittedAt: now } } }, { session, runValidators: true });
        if (updated.modifiedCount !== 1) throw new Error("The report changed while you were resubmitting. Refresh and try again.");
      } else { const [created] = await Report.create([{ enrollment: enrollment._id, reportingPeriod: period._id, status: "SUBMITTED", revisions: [{ version: 1, title, description, storageKey: finalKey, originalFilename: safeFilename, contentType: "application/pdf", sizeBytes: inspected.sizeBytes, submittedAt: now }] }], { session }); reportId = created._id; }
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "REPORT_SUBMITTED", entityType: "report", entityId: reportId, occurredAt: now, metadata: { periodId, version: revision, sizeBytes: inspected.sizeBytes } }], { session });
      const training = await Training.findById(period.training).select("code").session(session).lean();
      const facultyRows = training ? await Faculty.find({ status: "ACTIVE", $or: [{ trainingCodes: { $size: 0 } }, { trainingCodes: training.code }] }).select("user").session(session).lean() : [];
      const users = await User.find({ _id: { $in: facultyRows.map((row) => row.user) }, status: "ACTIVE" }).select("_id").session(session).lean();
      await Notification.insertMany(users.map((user) => ({ recipient: user._id, channel: "IN_APP", type: "REPORT_SUBMITTED", title: "New student report submitted", body: "A student submitted a report that is ready for review.", idempotencyKey: `report-submitted:${reportId?.toString()}:${revision}:${user._id.toString()}` })), { session, ordered: false }).catch((error: unknown) => { const writeErrors = (error as { writeErrors?: { code: number }[] }).writeErrors; if ((error as { code?: number }).code !== 11000 && (!writeErrors?.length || writeErrors.some((item) => item.code !== 11000))) throw error; });
    }); } finally { await session.endSession(); }
    finalKey = null;
    return NextResponse.json({ submitted: true, version: revision }, { status: 201 });
  } catch (error) {
    if (pendingKey) await deletePrivatePdf(pendingKey).catch(() => undefined);
    if (finalKey) await deletePrivatePdf(finalKey).catch(() => undefined);
    const status = (error as { status?: number }).status ?? 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Report submission failed." }, { status });
  }
}
