import { notFound } from "next/navigation";
import { requireFacultyPageTrainingPermission } from "@/lib/auth/access";
import { getTrainingDashboard, isTrainingCode } from "@/lib/faculty/dashboard-data";
import { StatCard } from "@/components/faculty/stat-card";
import { ReportStatusChart, TrainingDistributionChart } from "@/components/faculty/dashboard-charts";
import { TrainingSubnav } from "@/components/faculty/training-subnav";
import { ClipboardCheck, FileClock, Users } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function TrainingAnalyticsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isTrainingCode(code)) notFound();
  await requireFacultyPageTrainingPermission("ANALYTICS_READ", code);
  const data = await getTrainingDashboard(code);
  if (!data) notFound();
  return <main className="faculty-content"><TrainingSubnav code={code} section="analytics" /><div className="faculty-page-heading"><div><span className="faculty-eyebrow">{code} · ANALYTICS</span><h1>Training analytics</h1><p>Metrics calculated from enrollments and report records.</p></div></div><div className="faculty-grid stat-grid"><StatCard label="Enrolled Students" value={data.students} foot="Active enrollments" icon={<Users size={16} />} /><StatCard label="Reports Submitted" value={data.submitted} foot="All reporting periods" icon={<ClipboardCheck size={16} />} /><StatCard label="Overdue Reports" value={data.overdue} foot="Missing past-due submissions" icon={<FileClock size={16} />} /></div><div className="faculty-grid chart-grid"><section className="faculty-panel"><div className="panel-heading"><div><h2>Submissions and decisions</h2><p>Status distribution for {code}</p></div></div><ReportStatusChart data={data.statuses} /></section><section className="faculty-panel"><div className="panel-heading"><div><h2>Completion progress</h2><p>Current approved reports relative to active enrollment</p></div><b>{data.progress}%</b></div><TrainingDistributionChart data={[{ code, students: data.students }]} /><div className="progress-track"><span style={{ width: `${data.progress}%` }} /></div><div className="progress-caption">{data.approved} approved / {data.students} students</div></section></div></main>;
}
