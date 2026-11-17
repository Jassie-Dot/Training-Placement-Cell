"use client";

export default function FacultyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="faculty-content"><section className="faculty-error"><h1>We could not load this page</h1><p>The request failed. Your account is unchanged; try again in a moment.</p><button className="faculty-button primary" onClick={() => reset()}>Try again</button></section></main>;
}
