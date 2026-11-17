import Link from "next/link";
import { Download, FileBarChart2 } from "lucide-react";
import { requireFacultyPagePermission } from "@/lib/auth/access";
import { getFacultyOverview } from "@/lib/faculty/dashboard-data";

export const dynamic = "force-dynamic";
export default async function FacultyReportsPage() {
  const principal = await requireFacultyPagePermission("ANALYTICS_READ");
  const data = await getFacultyOverview();
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">REPORTS &amp; EXPORTS</span><h1>Training reports</h1><p>Programs and figures are limited to your authorized training scope.</p></div>{principal.permissions.includes("EXPORT") && <div className="quick-links"><Link className="faculty-button" href="/api/faculty/analytics/export?format=csv">Analytics CSV</Link><Link className="faculty-button" href="/api/faculty/analytics/export?format=xlsx">Analytics Excel</Link></div>}</div><div className="faculty-grid reports-card-grid">{data.trainingSummaries.map((summary) => <article className="faculty-panel report-training-card" key={summary.code}><div className="program-icon"><FileBarChart2 size={18} /></div><h2>{summary.code}</h2><p>{summary.students} enrolled · {summary.submitted} reports · {summary.overdue} overdue</p><div className="quick-links"><Link className="faculty-button" href={`/faculty/trainings/${summary.code}/reports`}>Open report queue</Link>{principal.permissions.includes("EXPORT") && <Link className="faculty-button" href={`/api/faculty/trainings/${summary.code}/students.csv`}><Download size={13} /> Students CSV</Link>}</div></article>)}</div><p className="info-banner">Report queues include review actions. Report exports support CSV and Excel; analytics exports include training, department and semester summaries.</p></main>;
}
