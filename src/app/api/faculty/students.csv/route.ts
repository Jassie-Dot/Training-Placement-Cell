import { NextRequest } from "next/server";
import { AuthzError, requirePermission } from "@/lib/auth/access";
import { getAllStudents, type AllStudentTableRow } from "@/lib/faculty/student-query";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requirePermission("EXPORT");
    const search = request.nextUrl.searchParams;
    const q = search.get("q") ?? undefined;
    const department = search.get("department") ?? undefined;
    const n = (value: string | null) => value !== null && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 10 ? Number(value) : undefined;
    const minCgpa = n(search.get("minCgpa"));
    const maxCgpa = n(search.get("maxCgpa"));
    const rows: AllStudentTableRow[] = [];
    let page = 1;
    let total = 0;
    do {
      const result = await getAllStudents({ page, pageSize: 100, q, department, minCgpa, maxCgpa, status: search.get("status") ?? undefined });
      rows.push(...result.rows);
      total = result.total;
      page++;
      if (page > 101) return Response.json({ error: "Export exceeds 10,000 rows. Refine your filters." }, { status: 413 });
    } while (rows.length < total);
    const fields = ["rollNumber", "fullName", "department", "semester", "cgpa", "email", "submitted", "approved", "pending", "status"] as const;
    const escape = (value: unknown) => { const text = String(value ?? ""); const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; };
    const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => escape(row[field])).join(","))].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="gndec-students.csv"', "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthzError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
