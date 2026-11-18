import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { importStudentRows } from "@/lib/faculty/student-import";
import { invalidateFacultyCache } from "@/lib/faculty/dashboard-data";

export async function POST(request: Request) {
  try {
    await requirePermission("STUDENTS_WRITE");
    const result = await importStudentRows(await request.json());
    invalidateFacultyCache();
    return NextResponse.json(result, { status: 201 });
  } catch (error) { const status = (error as { status?: number }).status ?? 400; return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status }); }
}
