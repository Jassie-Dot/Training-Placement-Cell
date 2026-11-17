import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenCheck, FileClock, FileText, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { requireFacultyPageTrainingPermission } from "@/lib/auth/access";
import { getTrainingDashboard, isTrainingCode } from "@/lib/faculty/dashboard-data";
import { StatCard } from "@/components/faculty/stat-card";
import { ReportStatusChart } from "@/components/faculty/dashboard-charts";
import { TrainingSubnav } from "@/components/faculty/training-subnav";

export const dynamic = "force-dynamic";
export default async function TrainingDashboard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isTrainingCode(code)) notFound();
  await requireFacultyPageTrainingPermission("ANALYTICS_READ", code);
  const data = await getTrainingDashboard(code);
  if (!data) notFound();
  const { training } = data;
  return <main className="faculty-content"><TrainingSubnav code={code} section="overview" /><div className="training-header-card"><div className="training-header-top"><div><span className="training-code-pill">{training.code}</span><h1>{training.name}</h1><p>{training.description || "Training details have not been configured yet."}</p></div><span className={`status-pill${training.status === "ACTIVE" ? " active" : ""}`}>{training.status}</span></div><div className="training-meta"><span>Start: {training.startDate ? new Date(training.startDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not configured"}</span><span>End: {training.endDate ? new Date(training.endDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not configured"}</span><span>Reporting: every {training.reportingFrequencyDays} days</span></div></div>
    <div className="quick-links"><Link className="faculty-button" href={`/faculty/trainings/${code}/students`}><Users size={14} /> View students</Link><Link className="faculty-button" href={`/faculty/trainings/${code}/reports`}><FileText size={14} /> View reports</Link><Link className="faculty-button" href={`/faculty/trainings/${code}/analytics`}><BarChart3 size={14} /> View analytics</Link><Link className="faculty-button" href={`/api/faculty/trainings/${code}/students.csv`}><ArrowRight size={14} /> Export CSV</Link></div>
    <div className="faculty-grid stat-grid"><StatCard label="Enrolled Students" value={data.students} foot="Active enrollments" icon={<Users size={16} />} /><StatCard label="Reports Submitted" value={data.submitted} foot="Recorded for this program" icon={<FileText size={16} />} /><StatCard label="Pending Review" value={data.pending} foot="Awaiting faculty action" icon={<FileClock size={16} />} /><StatCard label="Reports Approved" value={data.approved} foot="Approved submissions" icon={<BookOpenCheck size={16} />} /><StatCard label="Reports Rejected" value={data.rejected} foot="Resubmission may be needed" icon={<FileText size={16} />} /><StatCard label="Overdue Reports" value={data.overdue} foot="Past due, not submitted" icon={<FileClock size={16} />} /></div>
    <div className="faculty-grid chart-grid"><section className="faculty-panel"><div className="panel-heading"><div><h2>Submission and review status</h2><p>Current report status breakdown for {code}</p></div></div><ReportStatusChart data={data.statuses} /></section><section className="faculty-panel"><div className="panel-heading"><div><h2>Training progress</h2><p>Approved reports compared with active enrolled students</p></div><b className="training-progress-number">{data.progress}%</b></div><div className="progress-track"><span style={{ width: `${data.progress}%` }} /></div><div className="progress-caption">{data.approved} approved reports · {data.students} active enrolled students</div><p className="progress-note">This indicator uses the current approved report count divided by enrolled students; reporting-period requirements will refine completion tracking when configured.</p></section></div>
  </main>;
}
