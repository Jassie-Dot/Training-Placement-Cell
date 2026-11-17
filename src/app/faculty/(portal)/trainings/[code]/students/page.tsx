import Link from "next/link";
import { Download, UserRoundPlus } from "lucide-react";
import { notFound } from "next/navigation";
import { requireFacultyPageTrainingPermission } from "@/lib/auth/access";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";
import { getTrainingStudents } from "@/lib/faculty/student-query";
import { StudentTable } from "@/components/faculty/student-table";
import { TrainingSubnav } from "@/components/faculty/training-subnav";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const numberValue = (value?: string) => value && Number.isFinite(Number(value)) ? Number(value) : undefined;
export const dynamic = "force-dynamic";
export default async function TrainingStudentsPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<SearchParams> }) {
  const [{ code }, search] = await Promise.all([params, searchParams]);
  if (!isTrainingCode(code)) notFound();
  await requireFacultyPageTrainingPermission("STUDENTS_READ", code);
  const page = Math.max(1, numberValue(first(search.page)) ?? 1);
  const filters = { page, pageSize: 20, q: first(search.q), department: first(search.department), minCgpa: numberValue(first(search.minCgpa)), maxCgpa: numberValue(first(search.maxCgpa)), status: first(search.status), sort: first(search.sort), direction: first(search.direction) };
  const data = await getTrainingStudents(code, filters);
  const query = Object.fromEntries(Object.entries(search).map(([key, value]) => [key, first(value)]));
  return <main className="faculty-content"><TrainingSubnav code={code} section="students" /><div className="faculty-page-heading"><div><span className="faculty-eyebrow">{code} · STUDENT MANAGEMENT</span><h1>Training students</h1><p>Only enrollments assigned to {code} appear here.</p></div><div className="faculty-heading-actions"><Link className="faculty-button" href={`/api/faculty/trainings/${code}/students.csv${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).size ? `?${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}` : ""}`}><Download size={14} /> Export CSV</Link><Link className="faculty-button primary" href="/faculty/students/new"><UserRoundPlus size={14} /> Add student</Link></div></div><StudentTable data={data.rows} total={data.total} page={data.page} pageSize={data.pageSize} query={query} code={code} departments={data.departments} /></main>;
}
