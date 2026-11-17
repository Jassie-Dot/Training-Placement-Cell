import Link from "next/link";
import { requireFacultyPagePermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Training } from "@/models/training";
import { StudentCreateForm } from "./student-create-form";

export default async function AddStudentPage() {
  const principal = await requireFacultyPagePermission("STUDENTS_WRITE");
  await connectMongo();
  const scope = principal.trainingCodes.length ? { code: { $in: principal.trainingCodes } } : {};
  const trainings = await Training.find({ ...scope, status: "ACTIVE" }).select("code name").sort({ code: 1 }).lean();
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">STUDENT MANAGEMENT</span><h1>Add student</h1><p>Create a student account and optionally assign active training programs.</p></div><Link href="/faculty/students" className="button button-secondary">Back to students</Link></div>
    <StudentCreateForm trainings={trainings} /></main>;
}
