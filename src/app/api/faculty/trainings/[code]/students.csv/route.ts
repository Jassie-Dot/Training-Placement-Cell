import { NextRequest } from "next/server";
import { AuthzError, requireTrainingPermission } from "@/lib/auth/access";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";
import { getTrainingStudents } from "@/lib/faculty/student-query";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!isTrainingCode(code)) return Response.json({ error: "Training not found." }, { status: 404 });
    await requireTrainingPermission("EXPORT", code);
    const search = request.nextUrl.searchParams;
    const q = search.get("q") ?? undefined;
    const department = search.get("department") ?? undefined;
    const minCgpa = search.has("minCgpa") ? Number(search.get("minCgpa")) : undefined;
    const maxCgpa = search.has("maxCgpa") ? Number(search.get("maxCgpa")) : undefined;
    let page = 1;
    let total = 0;
    const rows = [] as Awaited<ReturnType<typeof getTrainingStudents>>["rows"];
    do {
      const result = await getTrainingStudents(code, { page, pageSize: 100, q, department, minCgpa, maxCgpa, status: search.get("status") ?? undefined });
      total = result.total;
      rows.push(...result.rows);
      page++;
      if (page > 101) return Response.json({ error: "Export exceeds 10,000 rows. Refine your filters." }, { status: 413 });
    } while (rows.length < total);
    const fields = ["rollNumber", "fullName", "department", "semester", "cgpa", "email", "submitted", "approved", "pending", "status"] as const;
    const escape = (value: unknown) => { const text = String(value ?? ""); const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; };
    const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => escape(row[field])).join(","))].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${code}-students.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthzError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
