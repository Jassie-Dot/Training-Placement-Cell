"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { GraduationCap, LoaderCircle } from "lucide-react";

export function StudentRegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          rollNumber: form.get("rollNumber"),
          email: form.get("email"),
          department: form.get("department"),
          semester: form.get("semester"),
          password,
        }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) { setError(result.error ?? "Registration could not be completed. Please try again."); return; }
      setSuccess(result.message ?? "If registration is eligible, a verification code will be sent to your @gndec.ac.in address.");
    } catch {
      setError("Registration is temporarily unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="register-page">
    <Link href="/" className="register-brand"><span><GraduationCap size={22} /></span><b>GNDEC <small>TRAINING &amp; PLACEMENT</small></b></Link>
    <section className="register-card">
      <p className="register-kicker">STUDENT PORTAL</p>
      <h1>Create your account</h1>
      <p className="register-intro">Use your university details. Verify your @gndec.ac.in address before signing in.</p>
      {success ? <div className="register-success" role="status">
        <p>{success}</p>
        <Link className="register-submit" href="/student/login">Continue to student login <span>→</span></Link>
      </div> : <form onSubmit={submit}>
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={160} />
        <label htmlFor="rollNumber">University roll number</label>
        <input id="rollNumber" name="rollNumber" autoComplete="username" required maxLength={40} />
        <label htmlFor="email">GNDEC email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} pattern=".+@gndec\.ac\.in" title="Use an email ending in @gndec.ac.in." placeholder="name@gndec.ac.in" />
        <div className="register-grid">
          <div><label htmlFor="department">Department</label><input id="department" name="department" required maxLength={100} /></div>
          <div><label htmlFor="semester">Semester</label><select id="semester" name="semester" required defaultValue=""><option value="" disabled>Select</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></div>
        </div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <p className="register-hint">Use at least 12 characters. Your account remains inactive until you verify your email. Faculty will assign your training after registration.</p>
        {error && <p className="register-error" role="alert">{error}</p>}
        <button className="register-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="register-spin" size={17} /> Creating account…</> : <>Register account <span>→</span></>}</button>
      </form>}
      <p className="register-footer">Already registered? <Link href="/student/login">Sign in</Link></p>
    </section>
    <Link href="/" className="register-back">← Choose another portal</Link>
    <style>{styles}</style>
  </main>;
}

const styles = `.register-page{min-height:100vh;padding:24px 16px;background:#f5f7fa;display:flex;align-items:center;flex-direction:column;color:#172033}.register-brand{display:flex;align-items:center;gap:10px;color:#142b4a;font-size:15px;letter-spacing:.04em}.register-brand>span{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#e8eff8}.register-brand small{display:block;font-size:8px;color:#718096;letter-spacing:.12em;margin-top:3px}.register-card{width:min(100%,480px);margin:22px auto;padding:30px 36px;background:#fff;border:1px solid #e5eaf1;border-radius:12px;box-shadow:0 16px 42px rgba(20,43,74,.07)}.register-kicker{margin:0 0 8px;color:#4772a6;font-size:9px;letter-spacing:.15em;font-weight:700}.register-card h1{margin:0;color:#142b4a;font-size:25px;letter-spacing:-.03em}.register-intro{margin:8px 0 20px;color:#718096;font-size:12px;line-height:1.6}.register-card label{display:block;margin:13px 0 6px;font-size:11px;font-weight:700;color:#38465a}.register-card input,.register-card select{width:100%;height:41px;padding:0 11px;border:1px solid #dbe2eb;border-radius:6px;background:#fff;color:#172033;font:12px Arial,Helvetica,sans-serif}.register-card input:focus,.register-card select:focus{outline:0;border-color:#6b91bf;box-shadow:0 0 0 3px rgba(37,99,235,.08)}.register-grid{display:grid;grid-template-columns:1fr 125px;gap:12px}.register-hint{margin:10px 0;color:#7e8a9b;font-size:10px;line-height:1.5}.register-error{margin:10px 0;color:#b42318;font-size:11px;line-height:1.5}.register-success{color:#356c4d;font-size:12px;line-height:1.6}.register-submit{width:100%;min-height:43px;margin-top:12px;padding:0 16px;background:#142b4a;color:white;border:0;border-radius:6px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer}.register-submit:disabled{opacity:.7;cursor:wait}.register-submit span{font-size:17px;font-weight:400}.register-footer{margin:18px 0 0;padding-top:15px;border-top:1px solid #edf0f4;color:#7e8a9b;text-align:center;font-size:10px}.register-footer a{color:#35669b;font-weight:700}.register-back{margin-top:auto;font-size:11px;color:#557398}.register-spin{animation:register-spin .8s linear infinite}@keyframes register-spin{to{transform:rotate(360deg)}}@media(max-width:500px){.register-page{padding:20px 14px}.register-card{padding:26px 22px}.register-grid{grid-template-columns:1fr 100px}}`;
