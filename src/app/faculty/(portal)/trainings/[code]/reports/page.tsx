import { notFound } from "next/navigation";
import { requireFacultyPageTrainingPermission } from "@/lib/auth/access";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";
import { getTrainingReports, type ReportFilter } from "@/lib/faculty/report-query";
import { TrainingSubnav } from "@/components/faculty/training-subnav";
import { ReportTable } from "@/components/faculty/report-table";
import Link from "next/link";

const statuses: ReportFilter[] = ["ALL", "SUBMITTED", "UNDER_REVIEW", "RESUBMISSION_REQUIRED", "APPROVED", "REJECTED", "OVERDUE"];
type SearchParams = Record<string, string | string[] | undefined>;
export const dynamic = "force-dynamic";
export default async function TrainingReportsPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<SearchParams> }) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  if (!isTrainingCode(code)) notFound();
  const principal = await requireFacultyPageTrainingPermission("REPORTS_REVIEW", code);
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const filter = statuses.includes(statusValue as ReportFilter) ? statusValue as ReportFilter : "ALL";
  const pageParam = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = pageParam && /^\d+$/.test(pageParam) ? Math.max(1, Number(pageParam)) : 1;
  const result = await getTrainingReports(code, filter, page);
  return <main className="faculty-content"><TrainingSubnav code={code} section="reports" /><div className="faculty-page-heading"><div><span className="faculty-eyebrow">{code} · REPORTS</span><h1>Report submissions</h1><p>Review submitted reports, give feedback, and manage resubmission requests.</p></div>{principal.permissions.includes("EXPORT") && <div className="form-actions"><Link className="button button-secondary" href={`/api/faculty/reports/export?training=${code}&status=${filter}&format=csv`}>Export CSV</Link><Link className="button button-secondary" href={`/api/faculty/reports/export?training=${code}&status=${filter}&format=xlsx`}>Export Excel</Link></div>}</div><ReportTable code={code} filter={filter} data={result.rows as never[]} total={result.total} page={result.page} pageSize={result.pageSize} /></main>;
}
