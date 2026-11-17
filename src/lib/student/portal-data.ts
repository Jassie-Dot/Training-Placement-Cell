import "server-only";
import { requireRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Student } from "@/models/student";
import { Enrollment } from "@/models/enrollment";
import { ReportingPeriod } from "@/models/reporting-period";
import { Report } from "@/models/report";
export async function getStudentPortalData() {
  const principal = await requireRole("STUDENT"); await connectMongo();
  const student = await Student.findById(principal.studentId).select("fullName rollNumber registrationNumber email department semester academicYear cgpa contactNumber").lean();
  if (!student) return null;
  const enrollments = await Enrollment.find({ student: student._id, status: "ACTIVE", deletedAt: null }).populate("training", "code name description startDate endDate reportingFrequencyDays").lean();
  const trainingIds = enrollments.map((row) => (row.training as unknown as { _id: string })._id);
  const [periods, reports] = await Promise.all([
    ReportingPeriod.find({ training: { $in: trainingIds } }).sort({ startDate: 1 }).lean(),
    Report.find({ enrollment: { $in: enrollments.map((row) => row._id) }, deletedAt: null }).populate({ path: "reportingPeriod", select: "sequence startDate endDate dueDate extensionUntil instructions training" }).sort({ updatedAt: -1 }).lean(),
  ]);
  const current = periods.filter((period) => period.startDate <= new Date() && period.status !== "CLOSED");
  const reportByPeriod = new Map(reports.map((report) => [report.reportingPeriod._id.toString(), report]));
  const required = periods.filter((period) => period.startDate <= new Date()).length;
  const nextDeadline = periods.map((period) => period.extensionUntil ?? period.dueDate).filter((date) => date >= new Date()).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  return { student, enrollments, periods, reports, current, reportByPeriod, stats: { required, submitted: reports.length, approved: reports.filter((report) => report.status === "APPROVED").length, pending: reports.filter((report) => ["SUBMITTED", "UNDER_REVIEW"].includes(report.status)).length, rejected: reports.filter((report) => ["REJECTED", "RESUBMISSION_REQUIRED"].includes(report.status)).length, nextDeadline } };
}
