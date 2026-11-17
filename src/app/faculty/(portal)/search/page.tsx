import Link from "next/link";
import { requireFacultyPagePermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Student } from "@/models/student";
import { Training } from "@/models/training";
import { Enrollment } from "@/models/enrollment";

export const dynamic = "force-dynamic";
export default async function FacultySearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const principal = await requireFacultyPagePermission("STUDENTS_READ");
  const params = await searchParams;
  const value = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 100) ?? "";
  if (!value) return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">GLOBAL SEARCH</span><h1>Search</h1><p>Search students by name, roll number, or email and training programs by code.</p></div></div><div className="faculty-panel">Use the search box above, or press / to focus it.</div></main>;
  await connectMongo();
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(escaped, "i");
  const allowedCodes = principal.trainingCodes.length ? principal.trainingCodes : ["TR-101", "TR-102", "TR-103", "TR-104"];
  const codeMatches = allowedCodes.filter((code) => code.toLowerCase().includes(value.toLowerCase()));
  const visibleStudentIds = principal.trainingCodes.length ? await Enrollment.find({ training: { $in: await Training.find({ code: { $in: principal.trainingCodes } }).distinct("_id") }, deletedAt: null }).distinct("student") : null;
  const [students, trainings] = await Promise.all([
    Student.find({ status: "ACTIVE", deletedAt: null, ...(visibleStudentIds ? { _id: { $in: visibleStudentIds } } : {}), $or: [{ fullName: rx }, { rollNumber: rx }, { email: rx }] }).sort({ fullName: 1 }).limit(25).select("fullName rollNumber department semester").lean(),
    Training.find({ code: { $in: codeMatches } }).select("code name status").lean(),
  ]);
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">GLOBAL SEARCH</span><h1>Results for “{value}”</h1><p>Search is performed on the server and limited to 25 student matches.</p></div></div><div className="faculty-grid search-results-grid"><section className="faculty-panel"><div className="panel-heading"><h2>Students ({students.length})</h2></div>{students.length ? students.map((student) => <Link className="search-result" key={student._id.toString()} href={`/faculty/students/${student._id.toString()}`}><b>{student.fullName}</b><span>{student.rollNumber} · {student.department} · Semester {student.semester}</span></Link>) : <div className="empty-inline">No matching students.</div>}</section><section className="faculty-panel"><div className="panel-heading"><h2>Training programs ({trainings.length})</h2></div>{trainings.length ? trainings.map((training) => <Link className="search-result" key={training.code} href={`/faculty/trainings/${training.code}`}><b>{training.code} · {training.name}</b><span>{training.status}</span></Link>) : <div className="empty-inline">No matching training codes.</div>}</section></div></main>;
}
