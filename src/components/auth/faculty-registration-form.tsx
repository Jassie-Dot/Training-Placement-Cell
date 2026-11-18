"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { GraduationCap, LoaderCircle, UserRound } from "lucide-react";

export function FacultyRegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/faculty/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password,
        }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? "Registration could not be completed.");
        return;
      }
      setSuccess(result.message ?? "Teacher account created successfully!");
    } catch {
      setError("Registration is temporarily unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="faculty-register-page">
      <Link href="/" className="faculty-register-brand">
        <span><GraduationCap size={22} /></span>
        <b>GNDEC <small>TRAINING &amp; PLACEMENT</small></b>
      </Link>
      <section className="faculty-register-card">
        <span className="faculty-register-icon"><UserRound size={21} /></span>
        <p>TEACHER PORTAL</p>
        <h1>Create faculty account</h1>
        <p className="faculty-register-copy">Register your faculty account with your name and email to manage student trainings and reports.</p>

        {success ? (
          <div className="register-success" role="status">
            <p style={{ color: "#2d7a4d", marginBottom: "16px", fontWeight: 600 }}>{success}</p>
            <Link className="faculty-register-button" href="/faculty/login">Continue to teacher login</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="fullName" style={{ display: "block", margin: "13px 0 6px", fontSize: "11px", fontWeight: 700, color: "#38465a" }}>Full Name</label>
            <input id="fullName" name="fullName" required minLength={2} maxLength={160} style={inputStyle} placeholder="Dr. John Doe" />

            <label htmlFor="email" style={{ display: "block", margin: "13px 0 6px", fontSize: "11px", fontWeight: 700, color: "#38465a" }}>Email Address</label>
            <input id="email" name="email" type="email" required maxLength={254} style={inputStyle} placeholder="teacher@gmail.com" />

            <label htmlFor="password" style={{ display: "block", margin: "13px 0 6px", fontSize: "11px", fontWeight: 700, color: "#38465a" }}>Password</label>
            <input id="password" name="password" type="password" required minLength={6} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="Minimum 6 characters" />

            <label htmlFor="confirmPassword" style={{ display: "block", margin: "13px 0 6px", fontSize: "11px", fontWeight: 700, color: "#38465a" }}>Confirm Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} maxLength={72} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Confirm your password" />

            {error && <p style={{ color: "#b42318", fontSize: "11px", margin: "12px 0" }}>{error}</p>}

            <button className="faculty-register-button" type="submit" disabled={loading} style={{ width: "100%", marginTop: "16px", cursor: "pointer" }}>
              {loading ? <><LoaderCircle className="spin" size={17} /> Creating account…</> : <>Register as Faculty <span>→</span></>}
            </button>
          </form>
        )}

        <p style={{ marginTop: "18px", paddingTop: "15px", borderTop: "1px solid #edf0f4", color: "#7e8a9b", textAlign: "center", fontSize: "11px" }}>
          Already registered? <Link href="/faculty/login" style={{ color: "#35669b", fontWeight: 700 }}>Sign in</Link>
        </p>
      </section>
      <Link href="/" className="faculty-register-back">← Choose another portal</Link>
      <style>{styles}</style>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  height: "41px",
  padding: "0 11px",
  border: "1px solid #dbe2eb",
  borderRadius: "6px",
  background: "#fff",
  color: "#172033",
  fontSize: "12px",
  boxSizing: "border-box" as const,
};

const styles = `.faculty-register-page{min-height:100vh;padding:30px 20px 24px;background:#f5f7fa;display:flex;align-items:center;flex-direction:column;color:#172033}.faculty-register-brand{display:flex;align-items:center;gap:10px;color:#142b4a;font-size:15px;letter-spacing:.04em}.faculty-register-brand>span{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#e8eff8}.faculty-register-brand small{display:block;font-size:8px;color:#718096;letter-spacing:.12em;margin-top:3px}.faculty-register-card{width:min(100%,430px);margin:auto;padding:35px 38px;background:#fff;border:1px solid #e5eaf1;border-radius:12px;box-shadow:0 16px 42px rgba(20,43,74,.07)}.faculty-register-icon{width:43px;height:43px;border-radius:11px;background:#edf3fb;color:#3b6599;display:grid;place-items:center}.faculty-register-card>p:first-of-type{margin:21px 0 8px;color:#4772a6;font-size:9px;letter-spacing:.15em;font-weight:700}.faculty-register-card h1{margin:0;color:#142b4a;font-size:26px;letter-spacing:-.03em}.faculty-register-copy{margin:12px 0 20px;color:#718096;font-size:12px;line-height:1.7}.faculty-register-button{width:100%;min-height:44px;padding:0 16px;background:#142b4a;color:#fff;border-radius:6px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;border:none;text-decoration:none}.faculty-register-back{margin-top:auto;font-size:11px;color:#557398}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:500px){.faculty-register-page{padding:24px 16px 20px}.faculty-register-card{padding:30px 24px}.faculty-register-card h1{font-size:24px}}`;
