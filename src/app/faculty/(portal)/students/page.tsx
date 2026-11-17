import Link from "next/link";
import { Download, UserPlus } from "lucide-react";
import { requireFacultyPagePermission } from "@/lib/auth/access";
import { getAllStudents } from "@/lib/faculty/student-query";
import { StudentTable } from "@/components/faculty/student-table";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const n = (value?: string) => value && Number.isFinite(Number(value)) ? Number(value) : undefined;
export const dynamic = "force-dynamic";
export default async function FacultyStudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireFacultyPagePermission("STUDENTS_READ");
  const params = await searchParams;
  const filters = { page: Math.max(1, n(first(params.page)) ?? 1), pageSize: 20, q: first(params.q), department: first(params.department), minCgpa: n(first(params.minCgpa)), maxCgpa: n(first(params.maxCgpa)), status: first(params.status), sort: first(params.sort), direction: first(params.direction) };
  const result = await getAllStudents(filters);
  const query = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, first(value)]));
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">STUDENT MANAGEMENT</span><h1>All students</h1><p>Server-paginated records in your authorized training scope.</p></div><div className="faculty-heading-actions"><Link className="faculty-button" href={`/api/faculty/students.csv?${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}`}><Download size={14} /> Export CSV</Link><Link className="faculty-button" href="/faculty/students/import"><Download size={14} /> Import</Link><Link className="faculty-button primary" href="/faculty/students/new"><UserPlus size={14} /> Add student</Link></div></div><StudentTable data={result.rows} total={result.total} page={result.page} pageSize={result.pageSize} query={query} departments={result.departments} hideTraining /></main>;
}
