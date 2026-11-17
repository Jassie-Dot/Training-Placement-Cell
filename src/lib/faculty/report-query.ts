import "server-only";
import { connectMongo } from "@/lib/db/mongoose";
import { Training } from "@/models/training";
import { Report } from "@/models/report";
import { ReportingPeriod } from "@/models/reporting-period";
import type { TrainingCode } from "@/lib/faculty/dashboard-data";
import { requireTrainingPermission } from "@/lib/auth/access";

export type ReportFilter = "ALL" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "RESUBMISSION_REQUIRED" | "OVERDUE";
export async function getTrainingReports(code: TrainingCode, filter: ReportFilter = "ALL", page = 1, pageSize = 20) {
  await requireTrainingPermission("REPORTS_REVIEW", code);
  await connectMongo();
  const training = await Training.findOne({ code }).select("_id code").lean();
  if (!training) return { rows: [], total: 0, page, pageSize };
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const safePage = Math.max(1, page);
  if (filter === "OVERDUE") {
    const [result] = await ReportingPeriod.aggregate([
      { $match: { training: training._id, status: { $ne: "CLOSED" }, $expr: { $lt: [{ $ifNull: ["$extensionUntil", "$dueDate"] }, new Date()] } } },
      { $lookup: { from: "enrollments", let: { periodId: "$_id", trainingId: "$training", periodSequence: "$sequence", dueDate: { $ifNull: ["$extensionUntil", "$dueDate"] } }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ["$training", "$$trainingId"] }, { $eq: ["$status", "ACTIVE"] }, { $eq: ["$deletedAt", null] }] } } },
        { $lookup: { from: "reports", let: { enrollmentId: "$_id", periodId: "$$periodId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$enrollment", "$$enrollmentId"] }, { $eq: ["$reportingPeriod", "$$periodId"] }, { $eq: ["$deletedAt", null] }] } } }, { $limit: 1 }], as: "reports" } },
        { $match: { $expr: { $eq: [{ $size: "$reports" }, 0] } } }, { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "student" } }, { $unwind: "$student" }, { $match: { "student.status": "ACTIVE", "student.deletedAt": null } },
        { $project: { id: { $concat: [{ $toString: "$$periodId" }, "-", { $toString: "$_id" }] }, student: { fullName: "$student.fullName", rollNumber: "$student.rollNumber" }, code: { $literal: code }, period: { $concat: ["Report ", { $toString: "$$periodSequence" }] }, dueDate: "$$dueDate", submittedAt: { $literal: null }, status: { $literal: "OVERDUE" } } },
      ], as: "overdueRows" } },
      { $unwind: "$overdueRows" }, { $replaceRoot: { newRoot: "$overdueRows" } }, { $sort: { "student.rollNumber": 1, dueDate: 1 } },
      { $facet: { rows: [{ $skip: (safePage - 1) * safePageSize }, { $limit: safePageSize }], total: [{ $count: "value" }] } },
    ]);
    return { rows: result?.rows ?? [], total: result?.total?.[0]?.value ?? 0, page: safePage, pageSize: safePageSize };
  }
  const match: Record<string, unknown> = { deletedAt: null };
  if (filter !== "ALL") match.status = filter;
  const [result] = await Report.aggregate([
    { $match: match },
    { $lookup: { from: "enrollments", localField: "enrollment", foreignField: "_id", as: "enrollment" } }, { $unwind: "$enrollment" },
    { $match: { "enrollment.training": training._id } },
    { $lookup: { from: "students", localField: "enrollment.student", foreignField: "_id", as: "student" } }, { $unwind: "$student" },
    { $lookup: { from: "reportingPeriods", localField: "reportingPeriod", foreignField: "_id", as: "period" } }, { $unwind: "$period" },
    { $sort: { updatedAt: -1, _id: -1 } },
    { $facet: { rows: [{ $skip: (safePage - 1) * safePageSize }, { $limit: safePageSize }, { $project: { id: { $toString: "$_id" }, student: { fullName: "$student.fullName", rollNumber: "$student.rollNumber" }, code: training.code, period: { $concat: ["Report ", { $toString: "$period.sequence" }] }, submittedAt: { $arrayElemAt: ["$revisions.submittedAt", -1] }, dueDate: "$period.dueDate", status: 1 } }], total: [{ $count: "value" }] } },
  ]);
  return { rows: result?.rows ?? [], total: result?.total?.[0]?.value ?? 0, page: safePage, pageSize: safePageSize };
}
