import { NextResponse } from "next/server";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { requireApiRole, requireTrainingPermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Report } from "@/models/report";
import { Enrollment } from "@/models/enrollment";
import { Training } from "@/models/training";
import { Student } from "@/models/student";
import { Notification } from "@/models/notification";
import { AuditLog } from "@/models/audit-log";
import { reviewStatus, type ReviewDecision } from "@/lib/reports/policy";
const decisions = { UNDER_REVIEW: "UNDER_REVIEW", APPROVED: "APPROVED", REJECTED: "REJECTED", RESUBMISSION_REQUESTED: "RESUBMISSION_REQUIRED" } as const;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireApiRole("TEACHER"); const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const body = await request.json(); const rawDecision = body?.decision; const decision = rawDecision as keyof typeof decisions; const remarks = typeof body?.remarks === "string" ? body.remarks.trim() : "";
    if (typeof rawDecision !== "string" || !Object.hasOwn(decisions, rawDecision) || remarks.length > 3000 || (!["APPROVED", "UNDER_REVIEW"].includes(decision) && remarks.length < 3)) return NextResponse.json({ error: "Provide a decision and the required feedback." }, { status: 400 });
    await connectMongo();
    const report = await Report.findOne({ _id: id, deletedAt: null }).select("enrollment reportingPeriod status revisions reviews").lean(); if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const enrollment = await Enrollment.findById(report.enrollment).select("student training").lean(); if (!enrollment) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const training = await Training.findById(enrollment.training).select("code").lean(); if (!training) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    await requireTrainingPermission("REPORTS_REVIEW", training.code);
    let status: string; try { status = reviewStatus(report.status, decision as ReviewDecision); } catch { return NextResponse.json({ error: "This report is no longer awaiting review." }, { status: 409 }); } const now = new Date();
    const reviewVersion = report.revisions.at(-1)?.version ?? 1;
    const student = await Student.findById(enrollment.student).select("user").lean();
    const session = await mongoose.startSession();
    try { await session.withTransaction(async () => {
      const changed = await Report.updateOne({ _id: report._id, status: report.status }, { $set: { status }, $push: { reviews: { reviewer: new Types.ObjectId(principal.userId), decision, previousStatus: report.status, newStatus: status, version: reviewVersion, remarks, reviewedAt: now } } }, { runValidators: true, session });
      if (changed.modifiedCount !== 1) { const conflict = new Error("The report was updated by another reviewer. Refresh and try again."); Object.assign(conflict, { status: 409 }); throw conflict; }
      if (student) await Notification.findOneAndUpdate({ idempotencyKey: `report-decision:${report._id.toString()}:${report.reviews.length + 1}` }, { $setOnInsert: { recipient: student.user, channel: "IN_APP", type: `REPORT_${decision}`, title: decision === "APPROVED" ? "Report approved" : decision === "REJECTED" ? "Report rejected" : decision === "UNDER_REVIEW" ? "Report under review" : "Resubmission requested", body: remarks || (decision === "UNDER_REVIEW" ? "Faculty have started reviewing your report." : "Your report was approved."), metadata: { reportId: report._id.toString(), status } } }, { upsert: true, new: true, session });
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: decision === "APPROVED" ? "REPORT_APPROVED" : decision === "REJECTED" ? "REPORT_REJECTED" : decision === "UNDER_REVIEW" ? "REPORT_REVIEW_STARTED" : "REPORT_RESUBMISSION_REQUESTED", entityType: "report", entityId: report._id, occurredAt: now, metadata: { status, version: reviewVersion, remarks } }], { session });
    }); } finally { await session.endSession(); }
    return NextResponse.json({ reviewed: true, status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Review failed." }, { status: (error as { status?: number }).status ?? 400 }); }
}
