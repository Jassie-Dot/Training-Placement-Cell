import { requirePermission } from "@/lib/auth/access";
export async function GET() {
  await requirePermission("STUDENTS_WRITE");
  const body = "fullName,rollNumber,registrationNumber,email,department,semester,academicYear,cgpa,contactNumber,trainingCode\r\n";
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=student-import-template.csv", "Cache-Control": "private, no-store" } });
}
