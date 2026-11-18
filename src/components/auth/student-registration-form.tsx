"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, LoaderCircle, Lock, Mail, User } from "lucide-react";

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
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password entries.");
      return;
    }
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
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? "Registration could not be completed. Please try again.");
        return;
      }
      setSuccess(result.message ?? "Registration successful! You can now sign in with your email or roll number.");
    } catch {
      setError("Registration service is temporarily unreachable. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }

  const isMongoError = error.toLowerCase().includes("mongodb");

  return (
    <main className="auth-page-root">
      {/* Brand Header */}
      <header className="auth-header">
        <Link href="/" className="auth-brand">
          <span className="auth-brand-icon">
            <GraduationCap size={22} />
          </span>
          <div className="auth-brand-text">
            <strong>GNDEC</strong>
            <small>TRAINING &amp; PLACEMENT CELL</small>
          </div>
        </Link>
      </header>

      {/* Main Card */}
      <section className="auth-card register-wide-card">
        <div className="auth-card-top">
          <span className="auth-role-pill student-pill">STUDENT REGISTRATION</span>
        </div>

        <h1 className="auth-title">Create Student Account</h1>
        <p className="auth-subtitle">
          Enter your university credentials to set up immediate access to your industrial training portal.
        </p>

        {error && (
          <div className="auth-alert error-alert" role="alert">
            <AlertCircle className="alert-icon" size={17} />
            <div className="alert-content">
              <strong>Registration issue</strong>
              <p>{error}</p>
              {isMongoError && (
                <div className="mongo-help-tip">
                  <span>💡 <strong>Quick Fix:</strong> In MongoDB Atlas → <em>Network Access</em>, whitelist <code>0.0.0.0/0</code> (Allow Access from Anywhere) so Vercel can connect.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {success ? (
          <div className="auth-alert success-alert" role="status">
            <CheckCircle2 className="alert-icon" size={20} />
            <div className="alert-content">
              <strong>Account Created Successfully!</strong>
              <p>{success}</p>
              <Link className="auth-btn btn-primary mt-3" href="/student/login">
                <span>Proceed to Student Sign In</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrap">
                <User size={16} className="input-icon" />
                <input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="e.g. Jaskaranveer Singh"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="rollNumber">University Roll Number</label>
                <div className="input-wrap">
                  <input
                    id="rollNumber"
                    name="rollNumber"
                    autoComplete="username"
                    required
                    maxLength={40}
                    placeholder="e.g. 2514592"
                  />
                </div>
              </div>

              <div className="form-group w-32">
                <label htmlFor="semester">Semester</label>
                <div className="input-wrap select-wrap">
                  <select id="semester" name="semester" required defaultValue="3">
                    <option value="" disabled>Select</option>
                    {Array.from({ length: 8 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Sem {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="name@gndec.ac.in or personal email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="department">Department / Branch</label>
              <div className="input-wrap">
                <input
                  id="department"
                  name="department"
                  required
                  maxLength={100}
                  placeholder="e.g. Information Technology"
                  defaultValue="Information Technology"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div className="form-group flex-1">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={72}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
              </div>
            </div>

            <p className="form-note">
              Password must be at least 6 characters. You can sign in immediately after registration without delay.
            </p>

            <button className="auth-btn btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={16} />
                  <span>Creating student account…</span>
                </>
              ) : (
                <>
                  <span>Register Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <footer className="auth-footer">
          <span>Already registered?</span>
          <Link href="/student/login" className="auth-link">
            Sign In here
          </Link>
        </footer>
      </section>

      <div className="auth-nav">
        <Link href="/" className="back-link">
          <ArrowLeft size={14} />
          <span>Back to Main Portal</span>
        </Link>
      </div>

      <style>{cleanRegisterStyles}</style>
    </main>
  );
}

const cleanRegisterStyles = `
/* Clean institutional student registration */
.auth-page-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 18px;
  background-color: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.auth-header {
  margin-bottom: 24px;
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}
.auth-brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #0f2b48;
  color: #ffffff;
  display: grid;
  place-items: center;
}
.auth-brand-text strong {
  display: block;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #0f2b48;
  line-height: 1.1;
}
.auth-brand-text small {
  display: block;
  font-size: 9.5px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.1em;
  margin-top: 2px;
}

.auth-card {
  width: min(100%, 480px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 34px 32px 30px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}
.register-wide-card {
  width: min(100%, 540px);
}

.auth-card-top {
  margin-bottom: 12px;
}
.auth-role-pill {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 4px;
  display: inline-block;
}
.student-pill {
  background: #eff6ff;
  color: #1e40af;
}

.auth-title {
  margin: 0 0 6px;
  font-size: 23px;
  font-weight: 800;
  color: #0f2b48;
  letter-spacing: -0.02em;
}
.auth-subtitle {
  margin: 0 0 22px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.auth-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  margin-bottom: 18px;
  font-size: 12.5px;
  line-height: 1.45;
}
.error-alert {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
.error-alert .alert-icon {
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 1px;
}
.success-alert {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.success-alert .alert-icon {
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 1px;
}
.mongo-help-tip {
  margin-top: 8px;
  padding: 8px 10px;
  background: #ffffff;
  border-radius: 6px;
  border-left: 3px solid #dc2626;
  font-size: 11.5px;
  color: #7f1d1d;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.form-row {
  display: flex;
  gap: 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}
.flex-1 { flex: 1; }
.w-32 { width: 130px; }

.input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  height: 42px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-wrap:focus-within {
  border-color: #0f2b48;
  box-shadow: 0 0 0 3px rgba(15, 43, 72, 0.1);
}
.input-wrap input,
.input-wrap select {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 13px;
  font-family: inherit;
}
.input-wrap input::placeholder {
  color: #9ca3af;
}
.input-icon {
  color: #64748b;
  flex-shrink: 0;
}

.form-note {
  margin: 2px 0 4px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border-radius: 8px;
  border: 0;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 4px;
}
.btn-primary {
  background: #0f2b48;
  color: #ffffff;
}
.btn-primary:hover:not(:disabled) {
  background: #1e3a5f;
}
.btn-primary:disabled {
  opacity: 0.65;
  cursor: wait;
}
.spin-icon {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-footer {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12.5px;
  color: #64748b;
}
.auth-link {
  color: #0f2b48;
  font-weight: 700;
  text-decoration: none;
}
.auth-link:hover {
  text-decoration: underline;
}

.auth-nav {
  margin-top: 22px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: all 0.15s;
}
.back-link:hover {
  color: #0f172a;
  border-color: #cbd5e1;
}

@media (max-width: 600px) {
  .auth-card {
    padding: 24px 18px;
  }
  .form-row {
    flex-direction: column;
    gap: 14px;
  }
  .w-32 {
    width: 100%;
  }
}
`;
