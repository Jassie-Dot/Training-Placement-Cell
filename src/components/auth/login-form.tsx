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
          "If the account is eligible, a verification code will be sent to its registered email."
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

      {/* Main Clean Card */}
      <section className="auth-card">
        <div className="auth-card-top">
          <span
            className={`auth-role-pill ${
              teacher ? "admin-pill" : "student-pill"
            }`}
          >
            {teacher ? "ADMINISTRATOR ACCESS" : "STUDENT ACCESS"}
          </span>
        </div>

        <h1 className="auth-title">
          {codeRequested && mode === "otp"
            ? "Check your email"
            : teacher
            ? "Administrator Sign In"
            : "Student Sign In"}
        </h1>
        <p className="auth-subtitle">
          {teacher
            ? "Sign in with your registered administrator email to manage student records and excel uploads."
            : "Sign in with your University Roll Number or Registered Email to view your training status."}
        </p>

        {error && (
          <div className="auth-alert error-alert" role="alert">
            <AlertCircle className="alert-icon" size={17} />
            <div className="alert-content">
              <strong>Authentication issue</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {info && (
          <div className="auth-alert info-alert" role="status">
            <div className="alert-content">
              <p>{info}</p>
            </div>
          </div>
        )}

        {mode === "password" && (
          <form className="auth-form" onSubmit={passwordSignIn}>
            <div className="form-group">
              <label htmlFor="identifier-password">
                {teacher ? "Official Email Address" : "Email or University Roll Number"}
              </label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
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
              <div className="input-wrap">
                <LockKeyhole size={16} className="input-icon" />
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
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="auth-btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={16} />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
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
          <form className="auth-form" onSubmit={requestCode}>
            <div className="form-group">
              <label htmlFor="identifier">Registered Email Address</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
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
              className="auth-btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={16} />
                  <span>Sending code…</span>
                </>
              ) : (
                <>
                  <span>Send One-Time Code</span>
                  <ArrowRight size={16} />
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
          <form className="auth-form" onSubmit={verifyCode}>
            <div className="form-group">
              <label htmlFor="otp">Enter 6-digit Code</label>
              <div className="input-wrap otp-wrap">
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
              className="auth-btn btn-primary"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={16} />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <span>Verify and Sign In</span>
                  <ArrowRight size={16} />
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

        <footer className="auth-footer">
          {teacher ? (
            <>
              <span>New administrator?</span>
              <Link href="/faculty/register" className="auth-link">
                Register Admin Account
              </Link>
            </>
          ) : (
            <>
              <span>New student?</span>
              <Link href="/student/register" className="auth-link">
                Create an account
              </Link>
            </>
          )}
        </footer>
      </section>

      <div className="auth-nav">
        <Link href="/" className="back-link">
          <ArrowLeft size={14} />
          <span>Back to Main Portal</span>
        </Link>
      </div>

      <style>{cleanAuthStyles}</style>
    </main>
  );
}

const cleanAuthStyles = `
/* Clean, sleek, professional institutional auth styling (single scrollbar, no flashiness) */
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
  width: min(100%, 460px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 34px 32px 30px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
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
.admin-pill {
  background: #f1f5f9;
  color: #0f2b48;
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
.info-alert {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
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
.input-wrap input {
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
.otp-wrap input {
  text-align: center;
  letter-spacing: 0.25em;
  font-size: 18px;
  font-weight: 700;
}
.input-icon {
  color: #64748b;
  flex-shrink: 0;
}
.password-toggle {
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 4px;
}
.password-toggle:hover {
  color: #0f172a;
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

.toggle-mode-btn {
  background: transparent;
  border: 0;
  color: #0f2b48;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  margin-top: 2px;
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

@media (max-width: 500px) {
  .auth-card {
    padding: 24px 20px;
  }
}
`;
