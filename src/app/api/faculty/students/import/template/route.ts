import { requirePermission } from "@/lib/auth/access";

export async function GET() {
  await requirePermission("STUDENTS_WRITE");
  const headers = [
    "fullName",
    "rollNumber",
    "email",
    "department",
    "semester",
    "trainingCode",
    "companyName",
    "projectTitle",
    "evaluationGrade",
    "attendance",
    "certificateStatus",
    "remarks",
    "cgpa",
    "contactNumber",
  ].join(",");

  const sampleRow1 = [
    '"Jaskaranveer Singh"',
    '"2104592"',
    '"jaskaranveer2521071@gndec.ac.in"',
    '"Information Technology"',
    '"6"',
    '"TR-101"',
    '"Google Cloud Partner Labs"',
    '"AI-Powered Placement & Training Analytics"',
    '"A+"',
    '"98%"',
    '"ISSUED"',
    '"Distinction in project presentation and reporting"',
    '"9.2"',
    '"9876543210"',
  ].join(",");

  const sampleRow2 = [
    '"Simran Kaur"',
    '"2104593"',
    '"simrankaur@gndec.ac.in"',
    '"Computer Science"',
    '"6"',
    '"TR-101"',
    '"Microsoft Technology Center"',
    '"Cloud Native Enterprise Microservices"',
    '"A"',
    '"95%"',
    '"VERIFIED"',
    '"Strong performance in industrial training"',
    '"8.9"',
    '"9876543211"',
  ].join(",");

  const body = `${headers}\r\n${sampleRow1}\r\n${sampleRow2}\r\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=training-placement-student-template.csv",
      "Cache-Control": "private, no-store",
    },
  });
}
