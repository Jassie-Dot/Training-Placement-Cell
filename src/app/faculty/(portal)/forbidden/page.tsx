import Link from "next/link";

export default function FacultyForbiddenPage() {
  return <main className="faculty-content"><section className="faculty-error"><h1>Access not available</h1><p>Your faculty account does not have permission to view this section.</p><Link className="faculty-button" href="/faculty/dashboard">Return to overview</Link></section></main>;
}
