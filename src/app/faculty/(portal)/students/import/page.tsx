import Link from "next/link";
import { requireFacultyPagePermission } from "@/lib/auth/access";
import { ImportForm } from "./import-form";
export default async function ImportStudentsPage() {
  await requireFacultyPagePermission("STUDENTS_WRITE");
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">STUDENT MANAGEMENT</span><h1>Import students</h1><p>Preview CSV or Excel rows, resolve validation errors, then confirm a safe transactional import.</p></div><Link href="/faculty/students" className="button button-secondary">Back to students</Link></div><ImportForm /></main>;
}
