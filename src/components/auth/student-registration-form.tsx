"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, LoaderCircle, Lock, Mail, ShieldAlert, User } from "lucide-react";

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
    <main className="glass-auth-root">
      {/* Ambient background glows */}
      <div className="glass-ambient-orb orb-top-left" />
      <div className="glass-ambient-orb orb-bottom-right" />

      {/* Brand Header */}
      <header className="glass-auth-header">
        <Link href="/" className="glass-auth-brand">
          <span className="brand-icon">
            <GraduationCap size={22} />
          </span>
          <div className="brand-titles">
            <strong>GNDEC</strong>
            <small>TRAINING &amp; PLACEMENT CELL</small>
          </div>
        </Link>
      </header>

      {/* Main Glass Card */}
      <section className="glass-auth-card">
        <div className="card-badge-row">
          <span className="role-pill student-pill">STUDENT REGISTRATION</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Enter your university credentials to set up instant access to your industrial training and placement dashboard.
        </p>

        {error && (
          <div className="glass-auth-alert error-alert" role="alert">
            <AlertCircle className="alert-icon" size={20} />
            <div className="alert-content">
              <strong>Registration issue</strong>
              <p>{error}</p>
              {isMongoError && (
                <div className="mongo-help-tip">
                  <span>💡 <strong>Quick Fix:</strong> In MongoDB Atlas → <em>Network Access</em>, make sure <code>0.0.0.0/0</code> (Allow Access from Anywhere) is whitelisted so Vercel serverless instances can reach the database.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {success ? (
          <div className="glass-auth-alert success-alert" role="status">
            <CheckCircle2 className="alert-icon" size={22} />
            <div className="alert-content">
              <strong>Account Created Successfully!</strong>
              <p>{success}</p>
              <Link className="glass-auth-btn primary-btn mt-3" href="/student/login">
                <span>Proceed to Student Sign In</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        ) : (
          <form className="glass-auth-form" onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-glass-wrap">
                <User size={17} className="input-icon" />
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
                <div className="input-glass-wrap">
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

              <div className="form-group w-36">
                <label htmlFor="semester">Semester</label>
                <div className="input-glass-wrap select-wrap">
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
              <div className="input-glass-wrap">
                <Mail size={17} className="input-icon" />
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
              <div className="input-glass-wrap">
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
                <div className="input-glass-wrap">
                  <Lock size={17} className="input-icon" />
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
                <div className="input-glass-wrap">
                  <Lock size={17} className="input-icon" />
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

            <button className="glass-auth-btn primary-btn submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={18} />
                  <span>Creating student account…</span>
                </>
              ) : (
                <>
                  <span>Register Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <footer className="glass-card-footer">
          <span>Already have an account?</span>
          <Link href="/student/login" className="card-link">
            Sign In here
          </Link>
        </footer>
      </section>

      <div className="glass-auth-nav">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} />
          <span>Back to Portal Directory</span>
        </Link>
      </div>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
.glass-auth-root {
  min-height: 100vh;
  position: relative;
  background: radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
              #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 18px 40px;
  overflow-x: hidden;
  font-family: inherit;
}

.glass-ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}
.orb-top-left {
  top: -60px;
  left: -60px;
  width: 320px;
  height: 320px;
  background: rgba(59, 130, 246, 0.2);
}
.orb-bottom-right {
  bottom: -60px;
  right: -60px;
  width: 360px;
  height: 360px;
  background: rgba(147, 51, 234, 0.16);
}

.glass-auth-header {
  position: relative;
  z-index: 2;
  margin-bottom: 24px;
}
.glass-auth-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #0f172a;
}
.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
}
.brand-titles strong {
  display: block;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #0f172a;
  line-height: 1.1;
}
.brand-titles small {
  display: block;
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.12em;
  margin-top: 3px;
}

.glass-auth-card {
  position: relative;
  z-index: 2;
  width: min(100%, 540px);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 36px 36px 32px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04);
}

.card-badge-row {
  margin-bottom: 12px;
}
.role-pill {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 5px 12px;
  border-radius: 9999px;
  display: inline-block;
}
.student-pill {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.auth-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.auth-subtitle {
  margin: 0 0 24px;
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.55;
}

.glass-auth-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  margin-bottom: 22px;
  font-size: 13px;
  line-height: 1.5;
}
.error-alert {
  background: rgba(254, 242, 242, 0.9);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #991b1b;
}
.error-alert .alert-icon {
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 2px;
}
.success-alert {
  background: rgba(240, 253, 244, 0.95);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #166534;
}
.success-alert .alert-icon {
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 2px;
}
.alert-content strong {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 2px;
}
.mongo-help-tip {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border-left: 3px solid #dc2626;
  font-size: 12px;
  color: #7f1d1d;
}
.mongo-help-tip code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 5px;
  border-radius: 4px;
  font-weight: 700;
}

.glass-auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: flex;
  gap: 14px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.01em;
}
.flex-1 { flex: 1; }
.w-36 { width: 140px; }

.input-glass-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 12px;
  padding: 0 14px;
  height: 44px;
  transition: all 0.2s ease;
}
.input-glass-wrap:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #ffffff;
}
.input-glass-wrap input,
.input-glass-wrap select {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 13.5px;
  font-family: inherit;
}
.input-glass-wrap input::placeholder {
  color: #94a3b8;
}
.input-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.form-note {
  margin: 2px 0 6px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.glass-auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  border-radius: 12px;
  border: 0;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}
.primary-btn {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}
.primary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e40af, #1d4ed8);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}
.primary-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}
.spin-icon {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.glass-card-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}
.card-link {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}
.card-link:hover {
  text-decoration: underline;
}

.glass-auth-nav {
  position: relative;
  z-index: 2;
  margin-top: 24px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.2s;
}
.back-link:hover {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .glass-auth-card {
    padding: 26px 20px;
    border-radius: 18px;
  }
  .form-row {
    flex-direction: column;
    gap: 14px;
  }
  .w-36 {
    width: 100%;
  }
}
`;
