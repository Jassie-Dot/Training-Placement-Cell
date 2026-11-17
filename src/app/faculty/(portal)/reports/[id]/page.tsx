import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { requireFacultyPageTrainingPermission, requireRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Report } from "@/models/report";
import { Enrollment } from "@/models/enrollment";
import { Student } from "@/models/student";
import { Training } from "@/models/training";
import { ReportReviewControl } from "@/components/faculty/report-review-control";
export default async function FacultyReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("TEACHER"); const { id } = await params; if (!Types.ObjectId.isValid(id)) notFound(); await connectMongo();
  const reportRef = await Report.findOne({ _id: id, deletedAt: null }).select("enrollment").lean(); if (!reportRef) notFound();
  const enrollment = await Enrollment.findById(reportRef.enrollment).select("student training").lean(); if (!enrollment) notFound();
  const training = await Training.findById(enrollment.training).select("code name").lean(); if (!training) notFound(); await requireFacultyPageTrainingPermission("REPORTS_REVIEW", training.code);
  const report = await Report.findOne({ _id: id, deletedAt: null }).lean(); if (!report) notFound();
  const [student, period] = await Promise.all([Student.findById(enrollment.student).select("fullName rollNumber").lean(), (await import("@/models/reporting-period")).ReportingPeriod.findById(report.reportingPeriod).select("sequence startDate endDate dueDate extensionUntil instructions").lean()]);
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">{training.code} · REPORT REVIEW</span><h1>{student?.fullName ?? "Student"} · {period ? `Period ${period.sequence}` : "Report"}</h1><p>{student?.rollNumber ?? ""} · Current status: {report.status}</p></div><ReportReviewControl reportId={report._id.toString()} status={report.status} /></div><div className="faculty-grid bottom-grid"><section className="faculty-panel"><h2>Submission versions</h2>{report.revisions.map((revision) => <article className="activity-row" key={revision.version}><div><b>Version {revision.version} · {revision.title}</b><small>{revision.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {(revision.sizeBytes / 1024 / 1024).toFixed(2)} MB · {revision.originalFilename}</small><p>{revision.description || "No summary supplied."}</p><a href={`/api/reports/${report._id.toString()}/download?version=${revision.version}`} target="_blank" rel="noreferrer">Secure preview</a></div></article>)}</section><section className="faculty-panel"><h2>Review history</h2>{report.reviews.length ? report.reviews.map((review, index) => <article className="activity-row" key={`${review.reviewedAt.toISOString()}-${index}`}><div><b>{review.decision.replaceAll("_", " ")} · {review.previousStatus} → {review.newStatus}</b><small>{review.reviewedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Version {review.version ?? "Legacy"}</small><p>{review.remarks || "No remarks"}</p></div></article>) : <p>No review history yet.</p>}</section></div><section className="faculty-panel"><h2>Reporting instructions</h2><p>{period?.instructions}</p><p>Period dates: {period?.startDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} – {period?.endDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}. Deadline: {(period?.extensionUntil ?? period?.dueDate)?.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p></section></main>;
}
