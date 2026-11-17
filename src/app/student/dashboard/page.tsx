import Link from "next/link";
import { getStudentPortalData } from "@/lib/student/portal-data";
import { StudentWorkspaceShell } from "@/components/student/workspace-shell";
import { studentSignOut } from "@/app/student/actions";
import { submissionStatus } from "@/lib/reports/policy";
export default async function StudentDashboard() {
  const data = await getStudentPortalData(); if (!data) return null;
  const { student, enrollments, current, reportByPeriod, stats } = data;
  return <StudentWorkspaceShell active="Dashboard"><div className="student-inline" style={{ justifyContent: "space-between" }}><div><p className="student-muted">STUDENT OVERVIEW</p><h1>Welcome, {student.fullName}</h1><p className="student-muted">{student.rollNumber} · {student.department} · Semester {student.semester} · CGPA {student.cgpa ?? "Not provided"}</p></div><form action={studentSignOut}><button type="submit">Sign out</button></form></div>
    <div className="student-card-grid">{[["Reports required", stats.required], ["Reports submitted", stats.submitted], ["Approved", stats.approved], ["Pending review", stats.pending], ["Rejected / resubmission", stats.rejected], ["Next deadline", stats.nextDeadline?.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "—"]].map(([label, value]) => <article className="student-card" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="student-sections"><section className="student-section"><h2>Assigned training</h2>{enrollments.length ? enrollments.map((row) => { const training = row.training as unknown as { code: string; name: string }; return <p key={training.code}><strong>{training.code}</strong> · {training.name}</p>; }) : <p className="student-muted">No active training assignment. Contact your faculty coordinator.</p>}<Link className="student-button" href="/student/training">View training</Link></section>
      <section className="student-section"><h2>Current reporting periods</h2>{current.length ? current.map((period) => { const report = reportByPeriod.get(period._id.toString()); return <p key={period._id.toString()}>Period {period.sequence} · due {(period.extensionUntil ?? period.dueDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · <span className="student-status">{submissionStatus(period, report, new Date())}</span></p>; }) : <p className="student-muted">There are no open reporting periods for your training.</p>}<Link className="student-button" href="/student/upload-report">Submit a report</Link></section></div>
  </StudentWorkspaceShell>;
}
