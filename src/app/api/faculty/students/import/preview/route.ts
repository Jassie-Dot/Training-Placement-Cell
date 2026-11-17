import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { parseImportFile, validateImportRows } from "@/lib/faculty/student-import";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requirePermission("STUDENTS_WRITE");
    const data = await request.formData(); const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV or Excel file." }, { status: 400 });
    const rows = await parseImportFile(file.name, Buffer.from(await file.arrayBuffer()));
    const preview = await validateImportRows(rows);
    return NextResponse.json({ rows: preview });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Import preview failed." }, { status: 400 }); }
}
