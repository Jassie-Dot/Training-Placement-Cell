"use client";
import { useActionState } from "react";
import { createStudentAction } from "../actions";
type TrainingOption = { code: string; name: string };
export function StudentCreateForm({ trainings }: { trainings: TrainingOption[] }) {
  const [state, action, pending] = useActionState(createStudentAction, { error: "" });
  return <form action={action} className="settings-card form-grid">
    <label>Full name<input name="fullName" required minLength={2} maxLength={160} /></label><label>University roll number<input name="rollNumber" required maxLength={40} /></label>
    <label>College registration number<input name="registrationNumber" maxLength={60} /></label><label>GNDEC email address<input name="email" type="email" required maxLength={254} placeholder="name@gndec.ac.in" /></label>
    <label>Department<input name="department" required maxLength={100} /></label><label>Semester<input name="semester" type="number" min="1" max="12" required /></label>
    <label>Academic year<input name="academicYear" maxLength={20} placeholder="Optional" /></label><label>CGPA<input name="cgpa" type="number" min="0" max="10" step="0.01" /></label><label>Contact number<input name="contactNumber" maxLength={24} /></label>
    <fieldset className="wide-field"><legend>Training assignments</legend><div className="checkbox-list">{trainings.map((training) => <label key={training.code}><input type="checkbox" name="trainingCodes" value={training.code} />{training.code} · {training.name}</label>)}</div></fieldset>
    <p className="wide-field muted-copy">Sign-in uses a verification code sent to the registered email. Passwords and roles are never set from this form.</p>
    {state.error && <p className="wide-field login-error" role="alert">{state.error}</p>}<div className="wide-field form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create student"}</button></div>
  </form>;
}
