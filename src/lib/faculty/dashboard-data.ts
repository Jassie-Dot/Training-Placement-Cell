import "server-only";
import { connectMongo } from "@/lib/db/mongoose";
import { Student } from "@/models/student";
import { Training } from "@/models/training";
import { Enrollment } from "@/models/enrollment";
import { ReportingPeriod } from "@/models/reporting-period";
import { Report } from "@/models/report";
import { AuditLog } from "@/models/audit-log";
import { Faculty } from "@/models/faculty";
import { requirePermission, requireTrainingPermission } from "@/lib/auth/access";

export const trainingCodes = ["TR-101", "TR-102", "TR-103", "TR-104"] as const;
export type TrainingCode = (typeof trainingCodes)[number];
export function isTrainingCode(value: string): value is TrainingCode { return (trainingCodes as readonly string[]).includes(value); }

export async function getFacultyName(userId: string) {
  await connectMongo();
  const faculty = await Faculty.findOne({ user: userId, status: "ACTIVE", deletedAt: null }).select("fullName email").lean();
  return faculty ? { fullName: faculty.fullName, email: faculty.email } : null;
}

export async function getFacultyOverview() {
  const principal = await requirePermission("ANALYTICS_READ");
  await connectMongo();
  const visibleCodes = principal.trainingCodes.length ? trainingCodes.filter((code) => principal.trainingCodes.includes(code)) : [...trainingCodes];
  const trainings = await Training.find({ code: { $in: visibleCodes } }).select("_id code name description status startDate endDate").lean();
  const visibleTrainingIds = trainings.map((training) => training._id);
  const visibleEnrollments = principal.trainingCodes.length ? await Enrollment.find({ training: { $in: visibleTrainingIds }, deletedAt: null }).distinct("_id") : null;
  const enrollmentScope = visibleEnrollments ? { enrollment: { $in: visibleEnrollments } } : {};
  const [totalStudents, totalEnrollments, reportStats, distributions, activity, overdueByTraining] = await Promise.all([
    principal.trainingCodes.length ? Enrollment.find({ training: { $in: visibleTrainingIds }, deletedAt: null }).distinct("student").then((ids) => Student.countDocuments({ _id: { $in: ids }, status: "ACTIVE", deletedAt: null })) : Student.countDocuments({ status: "ACTIVE", deletedAt: null }),
    Enrollment.countDocuments({ training: { $in: visibleTrainingIds }, status: "ACTIVE", deletedAt: null }),
    Report.aggregate([{ $match: { ...enrollmentScope, deletedAt: null } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Enrollment.aggregate([{ $match: { training: { $in: visibleTrainingIds }, status: "ACTIVE", deletedAt: null } }, { $lookup: { from: "trainings", localField: "training", foreignField: "_id", as: "training" } }, { $unwind: "$training" }, { $group: { _id: "$training.code", students: { $sum: 1 } } }]),
    AuditLog.find(principal.trainingCodes.length ? { entityType: "student", entityId: { $in: await Enrollment.find({ training: { $in: visibleTrainingIds } }).distinct("student") } } : { entityType: { $in: ["report", "student"] } }).sort({ occurredAt: -1 }).limit(8).select("action entityType entityId occurredAt metadata actor").lean(),
    getOverdueByTraining(visibleCodes),
  ]);
  const statusCounts = Object.fromEntries(reportStats.map((item) => [item._id, item.count])) as Record<string, number>;
  const distribution = Object.fromEntries(distributions.map((item) => [item._id, item.students])) as Record<string, number>;
  const trainingSummaries = await Promise.all(trainings.map(async (training) => {
    const [enrolled, reports] = await Promise.all([
      Enrollment.countDocuments({ training: training._id, status: "ACTIVE", deletedAt: null }),
      Report.aggregate([
        { $match: { deletedAt: null } },
        { $lookup: { from: "enrollments", localField: "enrollment", foreignField: "_id", as: "enrollment" } },
        { $unwind: "$enrollment" }, { $match: { "enrollment.training": training._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);
    const byStatus = Object.fromEntries(reports.map((r) => [r._id, r.count])) as Record<string, number>;
    const submitted = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { code: training.code, name: training.name, students: enrolled, submitted, approved: byStatus.APPROVED ?? 0, rejected: (byStatus.REJECTED ?? 0) + (byStatus.RESUBMISSION_REQUIRED ?? 0), approvalRate: submitted ? Math.round(((byStatus.APPROVED ?? 0) / submitted) * 100) : 0, overdue: overdueByTraining[training.code] ?? 0 };
  }));
  const activeEnrollmentRows = await Enrollment.find({ training: { $in: visibleTrainingIds }, status: "ACTIVE", deletedAt: null }).select("_id student training startDate").lean();
  const breakdown = (groupBy: "department" | "semester") => Enrollment.aggregate([
    { $match: { training: { $in: visibleTrainingIds }, status: "ACTIVE", deletedAt: null } },
    { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "student" } }, { $unwind: "$student" },
    { $match: { "student.status": "ACTIVE", "student.deletedAt": null } },
    { $lookup: { from: "reports", let: { enrollmentId: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$enrollment", "$$enrollmentId"] }, { $eq: ["$deletedAt", null] }] } } }, { $project: { status: 1 } }], as: "report" } },
    { $unwind: { path: "$report", preserveNullAndEmptyArrays: true } },
    { $group: { _id: `$student.${groupBy}`, studentIds: { $addToSet: "$student._id" }, submissions: { $sum: { $cond: [{ $ifNull: ["$report._id", false] }, 1, 0] } }, approved: { $sum: { $cond: [{ $eq: ["$report.status", "APPROVED"] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $in: ["$report.status", ["REJECTED", "RESUBMISSION_REQUIRED"]] }, 1, 0] } } } },
    { $project: { students: { $size: "$studentIds" }, submissions: 1, approved: 1, rejected: 1 } }, { $sort: { students: -1, _id: 1 } },
  ]);
  const [departmentRows, semesterRows, duePeriods] = await Promise.all([
    breakdown("department"), breakdown("semester"),
    ReportingPeriod.find({ training: { $in: visibleTrainingIds }, status: { $ne: "CLOSED" }, $expr: { $lt: [{ $ifNull: ["$extensionUntil", "$dueDate"] }, new Date()] } }).select("_id training dueDate extensionUntil").lean(),
  ]);
  const overdueCount = Object.values(overdueByTraining).reduce((sum, count) => sum + count, 0);
  const requiredTasks = duePeriods.reduce((sum, period) => sum + activeEnrollmentRows.filter((row) => row.training.toString() === period.training.toString() && (!row.startDate || row.startDate <= (period.extensionUntil ?? period.dueDate))).length, 0);
  const overdueDenominator = requiredTasks;
  const submittedTasks = requiredTasks ? await Report.countDocuments({ enrollment: { $in: activeEnrollmentRows.map((row) => row._id) }, reportingPeriod: { $in: duePeriods.map((row) => row._id) }, deletedAt: null }) : 0;
  return {
    totalStudents, totalEnrollments, activeTrainings: trainings.filter((t) => t.status === "ACTIVE").length,
    reportsSubmitted: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    pendingReviews: (statusCounts.SUBMITTED ?? 0) + (statusCounts.UNDER_REVIEW ?? 0),
    approved: statusCounts.APPROVED ?? 0, rejected: (statusCounts.REJECTED ?? 0) + (statusCounts.RESUBMISSION_REQUIRED ?? 0),
    overdue: Object.values(overdueByTraining).reduce((a, b) => a + b, 0),
    overduePercentage: overdueDenominator ? Math.round(overdueCount / overdueDenominator * 100) : 0,
    reportingCompliance: requiredTasks ? Math.min(100, Math.round(submittedTasks / requiredTasks * 100)) : 0,
    approvalRatio: submittedTasks ? Math.round((statusCounts.APPROVED ?? 0) / submittedTasks * 100) : 0,
    departmentStats: departmentRows.map((row: { _id: string; students: number; submissions: number; approved: number; rejected: number }) => ({ department: row._id, students: row.students, submissions: row.submissions, approved: row.approved, rejected: row.rejected })),
    semesterStats: semesterRows.map((row: { _id: number; students: number; submissions: number; approved: number; rejected: number }) => ({ semester: row._id, students: row.students, submissions: row.submissions, approved: row.approved, rejected: row.rejected })),
    distribution: visibleCodes.map((code) => ({ code, students: distribution[code] ?? 0 })),
    reportStatuses: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"].map((status) => ({ status: status.replaceAll("_", " "), count: statusCounts[status] ?? 0 })),
    trainingSummaries,
    activity: activity.map((item) => ({ id: item._id.toString(), action: item.action, entityType: item.entityType, occurredAt: item.occurredAt.toISOString(), metadata: item.metadata as Record<string, unknown> })),
  };
}

export async function getOverdueByTraining(codes: readonly TrainingCode[] = trainingCodes) {
  await connectMongo();
  const results = await Promise.all(codes.map(async (code) => {
    const training = await Training.findOne({ code }).select("_id").lean();
    if (!training) return [code, 0] as const;
    const overdue = await ReportingPeriod.aggregate([
      { $match: { training: training._id, status: { $ne: "CLOSED" }, $expr: { $lt: [{ $ifNull: ["$extensionUntil", "$dueDate"] }, new Date()] } } },
      { $lookup: { from: "enrollments", let: { periodId: "$_id", trainingId: "$training", deadline: { $ifNull: ["$extensionUntil", "$dueDate"] } }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ["$training", "$$trainingId"] }, { $eq: ["$status", "ACTIVE"] }, { $eq: ["$deletedAt", null] }, { $or: [{ $eq: ["$startDate", null] }, { $lte: ["$startDate", "$$deadline"] }] }] } } },
        { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "studentRecord" } }, { $match: { "studentRecord.status": "ACTIVE", "studentRecord.deletedAt": null } },
        { $lookup: { from: "reports", let: { enrollmentId: "$_id", periodId: "$$periodId" }, pipeline: [ { $match: { $expr: { $and: [{ $eq: ["$enrollment", "$$enrollmentId"] }, { $eq: ["$reportingPeriod", "$$periodId"] }, { $eq: ["$deletedAt", null] }] } } }, { $limit: 1 } ], as: "report" } },
        { $match: { report: { $eq: [] } } }, { $count: "missing" },
      ], as: "missingReports" } },
      { $unwind: { path: "$missingReports", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, count: { $sum: { $ifNull: ["$missingReports.missing", 0] } } } },
    ]);
    return [code, overdue[0]?.count ?? 0] as const;
  }));
  return Object.fromEntries(results) as Record<TrainingCode, number>;
}

export async function getTrainingDashboard(code: TrainingCode) {
  await requireTrainingPermission("ANALYTICS_READ", code);
  await connectMongo();
  const training = await Training.findOne({ code }).select("code name description status startDate endDate reportingFrequencyDays").lean();
  if (!training) return null;
  const [students, statusRows, overdue] = await Promise.all([
    Enrollment.countDocuments({ training: training._id, status: "ACTIVE", deletedAt: null }),
    Report.aggregate([
      { $match: { deletedAt: null } },
      { $lookup: { from: "enrollments", localField: "enrollment", foreignField: "_id", as: "enrollment" } }, { $unwind: "$enrollment" },
      { $match: { "enrollment.training": training._id } }, { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    getOverdueByTraining([code]),
  ]);
  const statuses = Object.fromEntries(statusRows.map((row) => [row._id, row.count])) as Record<string, number>;
  const submitted = Object.values(statuses).reduce((a, b) => a + b, 0);
  return { training: { ...training, _id: training._id.toString() }, students, submitted, pending: (statuses.SUBMITTED ?? 0) + (statuses.UNDER_REVIEW ?? 0), approved: statuses.APPROVED ?? 0, rejected: (statuses.REJECTED ?? 0) + (statuses.RESUBMISSION_REQUIRED ?? 0), overdue: overdue[code] ?? 0, statuses: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"].map((status) => ({ status: status.replaceAll("_", " "), count: statuses[status] ?? 0 })), progress: students ? Math.min(100, Math.round(((statuses.APPROVED ?? 0) / students) * 100)) : 0 };
}
