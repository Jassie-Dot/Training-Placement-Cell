import { randomUUID, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { getPortalSettings } from "@/lib/config/system-settings";
import { signedPrivateUploadUrl } from "@/lib/storage/s3";
import { Enrollment } from "@/models/enrollment";
import { ReportingPeriod } from "@/models/reporting-period";
import { Report } from "@/models/report";
import { RateLimitBucket } from "@/models/rate-limit-bucket";
function rateKey(userId: string) { const secret = process.env.AUTH_SECRET; if (!secret) throw new Error("Authentication configuration is unavailable."); return createHmac("sha256", secret).update(`report-upload:${userId}`).digest("hex"); }
async function allowed(userId: string) {
  const now = new Date(); const threshold = new Date(now.getTime() - 15 * 60_000); const key = rateKey(userId);
  const pipeline = [{ $set: { windowStart: { $cond: [{ $lte: [{ $ifNull: ["$windowStart", new Date(0)] }, threshold] }, now, "$windowStart"] }, count: { $cond: [{ $lte: [{ $ifNull: ["$windowStart", new Date(0)] }, threshold] }, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] }, expiresAt: new Date(now.getTime() + 86400000) } }];
  let bucket;
  try { bucket = await RateLimitBucket.findOneAndUpdate({ _id: key }, pipeline, { upsert: true, new: true }).lean(); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; bucket = await RateLimitBucket.findOneAndUpdate({ _id: key }, pipeline, { new: true }).lean(); }
  return Boolean(bucket && bucket.count <= 10);
}
export async function POST(request: Request) {
  try {
    const principal = await requireApiRole("STUDENT"); if (!principal.studentId) return NextResponse.json({ error: "Student profile is unavailable." }, { status: 403 });
    if (!(await allowed(principal.userId))) return NextResponse.json({ error: "Too many upload attempts. Try again later." }, { status: 429 });
    const body = await request.json(); const periodId = String(body?.reportingPeriodId ?? ""); const filename = String(body?.fileName ?? ""); const size = Number(body?.sizeBytes); const type = String(body?.contentType ?? "");
    if (!/^[a-f\d]{24}$/i.test(periodId) || filename.length > 255 || !filename.toLowerCase().endsWith(".pdf") || type !== "application/pdf" || !Number.isInteger(size) || size < 1) return NextResponse.json({ error: "Choose a PDF file and an active reporting period." }, { status: 400 });
    const settings = await getPortalSettings(); if (size > settings.reportMaxSizeBytes) return NextResponse.json({ error: "The selected PDF exceeds the configured file size limit." }, { status: 413 });
    await connectMongo(); const period = await ReportingPeriod.findOne({ _id: periodId, status: { $ne: "CLOSED" } }).lean(); if (!period) return NextResponse.json({ error: "Reporting period is unavailable." }, { status: 404 });
    const now = new Date(); if (now < period.startDate || now > (period.extensionUntil ?? period.dueDate)) return NextResponse.json({ error: "This reporting period is not currently accepting submissions." }, { status: 409 });
    const enrollment = await Enrollment.findOne({ student: principal.studentId, training: period.training, status: "ACTIVE", deletedAt: null }).select("_id").lean(); if (!enrollment) return NextResponse.json({ error: "You are not enrolled in this training." }, { status: 403 });
    const existing = await Report.findOne({ enrollment: enrollment._id, reportingPeriod: period._id, deletedAt: null }).select("status").lean(); if (existing && !["REJECTED", "RESUBMISSION_REQUIRED"].includes(existing.status)) return NextResponse.json({ error: "A report already exists for this period." }, { status: 409 });
    const key = `pending-uploads/${principal.studentId}/${period._id.toString()}/${randomUUID()}.pdf`; const url = await signedPrivateUploadUrl(key, principal.studentId, period._id.toString(), size);
    return NextResponse.json({ uploadUrl: url, storageKey: key, headers: { "Content-Type": "application/pdf", "x-amz-meta-studentid": principal.studentId, "x-amz-meta-periodid": period._id.toString() } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload preparation failed." }, { status: (error as { status?: number }).status ?? 400 }); }
}
