"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type Mode = "otp" | "password";

export function LoginForm({ role }: { role: "teacher" | "student" }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [codeRequested, setCodeRequested] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const teacher = role === "teacher";
  const destination = teacher ? "/faculty/dashboard" : "/student/dashboard";

  useEffect(() => {
    if (!codeRequested) return;
    const timer = window.setInterval(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [codeRequested]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: teacher ? "TEACHER" : "STUDENT",
          identifier,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
        retryAfterSeconds?: number;
      };
      if (!response.ok) {
        setError(
          result.error ?? "Verification is temporarily unavailable. Please try again."
        );
        return;
      }
      setCodeRequested(true);
      setSecondsLeft(result.retryAfterSeconds ?? 60);
      setInfo(
        result.message ??
          "If the account is eligible, a code will be sent to its registered email."
      );
    } catch {
      setError("Verification service unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn(`${role}-otp`, {
        identifier,
        otp: code,
        redirect: false,
      });
      if (result?.error) {
        setError(
          "The verification code could not be verified. It may be incorrect, expired, or already used."
        );
        setLoading(false);
        return;
      }
      window.location.assign(destination);
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
      setLoading(false);
    }
  }

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn(role, {
        identifier,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(
          "Invalid credentials. Please verify your email / roll number and password."
        );
        setLoading(false);
        return;
      }
      window.location.assign(destination);
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="glass-auth-root">
      {/* Background ambient lighting */}
      <div className="glass-auth-backdrop" aria-hidden="true">
        <div className="glass-ambient-orb orb-top-left" />
        <div className="glass-ambient-orb orb-bottom-right" />
      </div>

      {/* Header */}
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
          <span
            className={`role-pill ${
              teacher ? "admin-pill" : "student-pill"
            }`}
          >
            {teacher ? "ADMINISTRATOR PORTAL" : "STUDENT PORTAL"}
          </span>
        </div>

        <h1 className="auth-title">
          {codeRequested && mode === "otp"
            ? "Check your email"
            : teacher
            ? "Admin Sign In"
            : "Student Sign In"}
        </h1>
        <p className="auth-subtitle">
          {teacher
            ? "Sign in with your registered administrator email and password to manage student records."
            : "Sign in with your registered email or university roll number to view your training status."}
        </p>

        {error && (
          <div className="glass-auth-alert error-alert" role="alert">
            <AlertCircle className="alert-icon" size={18} />
            <div className="alert-content">
              <strong>Authentication issue</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {info && (
          <div className="glass-auth-alert info-alert" role="status">
            <div className="alert-content">
              <p>{info}</p>
            </div>
          </div>
        )}

        {mode === "password" && (
          <form className="glass-auth-form" onSubmit={passwordSignIn}>
            <div className="form-group">
              <label htmlFor="identifier-password">
                {teacher ? "Admin Email Address" : "Email or University Roll Number"}
              </label>
              <div className="input-glass-wrap">
                <Mail size={17} className="input-icon" />
                <input
                  id="identifier-password"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    teacher
                      ? "admin@gmail.com"
                      : "email@gndec.ac.in or 2514592"
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-glass-wrap">
                <LockKeyhole size={17} className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={200}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              className="glass-auth-btn primary-btn submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={18} />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              className="toggle-mode-btn"
              type="button"
              onClick={() => {
                setMode("otp");
                setCodeRequested(false);
                setError("");
              }}
            >
              Sign in with Email OTP code instead
            </button>
          </form>
        )}

        {mode === "otp" && !codeRequested && (
          <form className="glass-auth-form" onSubmit={requestCode}>
            <div className="form-group">
              <label htmlFor="identifier">Registered Email Address</label>
              <div className="input-glass-wrap">
                <Mail size={17} className="input-icon" />
                <input
                  id="identifier"
                  name="identifier"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={teacher ? "admin@gmail.com" : "student@gndec.ac.in"}
                />
              </div>
            </div>

            <button
              className="glass-auth-btn primary-btn submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={18} />
                  <span>Sending code…</span>
                </>
              ) : (
                <>
                  <span>Send One-Time Code</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              className="toggle-mode-btn"
              type="button"
              onClick={() => {
                setMode("password");
                setError("");
              }}
            >
              Use password instead
            </button>
          </form>
        )}

        {mode === "otp" && codeRequested && (
          <form className="glass-auth-form" onSubmit={verifyCode}>
            <div className="form-group">
              <label htmlFor="otp">Enter 6-digit Code</label>
              <div className="input-glass-wrap otp-wrap">
                <Mail size={17} className="input-icon" />
                <input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                />
              </div>
            </div>

            <button
              className="glass-auth-btn primary-btn submit-btn"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={18} />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <span>Verify and Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="otp-actions-row">
              <button
                type="button"
                className="sub-action-btn"
                disabled={loading || secondsLeft > 0}
                onClick={() => {
                  setCodeRequested(false);
                  setCode("");
                  setInfo("");
                }}
              >
                Use different account
              </button>
              <button
                type="button"
                className="sub-action-btn"
                disabled={loading || secondsLeft > 0}
                onClick={() => void requestCode()}
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
              </button>
            </div>

            <button
              className="toggle-mode-btn"
              type="button"
              onClick={() => {
                setMode("password");
                setError("");
              }}
            >
              Use password instead
            </button>
          </form>
        )}

        <footer className="glass-card-footer">
          {teacher ? (
            <>
              <span>New administrator?</span>
              <Link href="/faculty/register" className="card-link">
                Register Admin Account
              </Link>
            </>
          ) : (
            <>
              <span>New student?</span>
              <Link href="/student/register" className="card-link">
                Create an account
              </Link>
            </>
          )}
        </footer>
      </section>

      <div className="glass-auth-nav">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} />
          <span>Back to Portal Directory</span>
        </Link>
      </div>

      <style>{loginStyles}</style>
    </main>
  );
}

const loginStyles = `
.glass-auth-root {
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 18px;
  font-family: inherit;
}

.glass-auth-backdrop {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
              #f8fafc;
}

.glass-ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.6;
}
.orb-top-left {
  top: -40px;
  left: -40px;
  width: 340px;
  height: 340px;
  background: rgba(59, 130, 246, 0.22);
}
.orb-bottom-right {
  bottom: -40px;
  right: -40px;
  width: 380px;
  height: 380px;
  background: rgba(147, 51, 234, 0.18);
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
  width: min(100%, 460px);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 36px 34px 32px;
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
.admin-pill {
  background: rgba(147, 51, 234, 0.1);
  color: #7e22ce;
  border: 1px solid rgba(147, 51, 234, 0.2);
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
  padding: 13px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
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
.info-alert {
  background: rgba(239, 246, 255, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #1e40af;
}

.glass-auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
}

.input-glass-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 12px;
  padding: 0 14px;
  height: 45px;
  transition: all 0.2s ease;
}
.input-glass-wrap:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #ffffff;
}
.input-glass-wrap input {
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
.otp-wrap input {
  text-align: center;
  letter-spacing: 0.25em;
  font-size: 18px;
  font-weight: 700;
}
.input-icon {
  color: #94a3b8;
  flex-shrink: 0;
}
.password-toggle {
  border: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 4px;
}
.password-toggle:hover {
  color: #334155;
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
  margin-top: 6px;
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

.toggle-mode-btn {
  background: transparent;
  border: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  margin-top: 4px;
}
.toggle-mode-btn:hover {
  text-decoration: underline;
}

.otp-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
}
.sub-action-btn {
  background: transparent;
  border: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px;
}
.sub-action-btn:hover:not(:disabled) {
  color: #0f172a;
}
.sub-action-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
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

@media (max-width: 500px) {
  .glass-auth-card {
    padding: 26px 20px;
    border-radius: 18px;
  }
}
`;
