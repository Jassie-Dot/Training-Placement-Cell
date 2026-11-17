"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";

type Mode = "otp" | "password";
export function LoginForm({ role }: { role: "teacher" | "student" }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("otp");
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
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [codeRequested]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true); setError(""); setInfo("");
    try {
      const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: teacher ? "TEACHER" : "STUDENT", identifier }) });
      const result = await response.json() as { message?: string; error?: string; retryAfterSeconds?: number };
      if (!response.ok) { setError(result.error ?? "Verification is temporarily unavailable. Please try again."); return; }
      setCodeRequested(true); setSecondsLeft(result.retryAfterSeconds ?? 60); setInfo(result.message ?? "If the account is eligible, a code will be sent to its registered email.");
    } catch { setError("Verification is temporarily unavailable. Please try again."); }
    finally { setLoading(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const result = await signIn(`${role}-otp`, { identifier, otp: code, redirect: false });
      if (result?.error) { setError("The code could not be verified. It may be incorrect, expired, or already used."); setLoading(false); return; }
      window.location.assign(destination);
    } catch { setError("Sign-in is temporarily unavailable. Please try again."); setLoading(false); }
  }

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await signIn(role, { identifier, password, redirect: false });
      if (result?.error) { setError("Those sign-in details could not be verified. Check them and try again."); setLoading(false); return; }
      window.location.assign(destination);
    } catch { setError("Sign-in is temporarily unavailable. Please try again."); setLoading(false); }
  }

  return <main className="login-page"><Link href="/" className="login-brand"><span><GraduationCap size={22} /></span><b>GNDEC <small>TRAINING &amp; PLACEMENT</small></b></Link><section className="login-card"><div className="login-symbol">{teacher ? <UserRound size={21} /> : <GraduationCap size={23} />}</div><p className="login-kicker">{teacher ? "TEACHER PORTAL" : "STUDENT PORTAL"}</p><h1>{codeRequested && mode === "otp" ? "Check your email" : teacher ? "Welcome back" : "Sign in to continue"}</h1><p className="login-subtitle">{teacher ? "Use your Gmail address registered to your teacher account." : "Use your registered @gndec.ac.in email."}</p>
    {mode === "otp" && !codeRequested && <form onSubmit={requestCode}><label htmlFor="identifier">Registered email address</label><div className="login-input-wrap"><Mail size={17} /><input id="identifier" name="identifier" type="email" autoComplete="username" required maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={teacher ? "name@gmail.com" : "name@gndec.ac.in"} /></div>{error && <p className="login-error" role="alert">{error}</p>}<button className="login-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Sending…</> : <>Send sign-in code <span>→</span></>}</button><button className="login-mode-link" type="button" onClick={() => { setMode("password"); setError(""); }}>Use password instead</button></form>}
    {mode === "otp" && codeRequested && <form onSubmit={verifyCode}><p className="otp-delivery-note">If the account is eligible, a verification code will be sent to its registered email. It expires in five minutes by default and can only be used once.</p><label htmlFor="otp">Six-digit code</label><div className="login-input-wrap otp-input"><Mail size={17} /><input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></div>{error && <p className="login-error" role="alert">{error}</p>}{info && <p className="login-info" role="status">{info}</p>}<button className="login-submit" disabled={loading || code.length !== 6}>{loading ? <><LoaderCircle className="spin" size={17} /> Verifying…</> : <>Verify and sign in <span>→</span></>}</button><div className="otp-actions"><button type="button" disabled={loading || secondsLeft > 0} onClick={() => { setCodeRequested(false); setCode(""); setInfo(""); }}>Use a different account</button><button type="button" disabled={loading || secondsLeft > 0} onClick={() => void requestCode()}>{secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}</button></div><p className="login-security-note">Never share this code. GNDEC staff will not ask you for it.</p><button className="login-mode-link" type="button" onClick={() => { setMode("password"); setError(""); }}>Use password instead</button></form>}
    {mode === "password" && <form onSubmit={passwordSignIn}><label htmlFor="identifier-password">Registered email address</label><div className="login-input-wrap"><Mail size={17} /><input id="identifier-password" name="identifier" type="email" autoComplete="username" required maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={teacher ? "name@gmail.com" : "name@gndec.ac.in"} /></div><label htmlFor="password">Password</label><div className="login-input-wrap"><LockKeyhole size={17} /><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /><button className="password-toggle" type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{error && <p className="login-error" role="alert">{error}</p>}<button className="login-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Verifying…</> : <>Sign in <span>→</span></>}</button><button className="login-mode-link" type="button" onClick={() => { setMode("otp"); setCodeRequested(false); setError(""); }}>Sign in with email code</button></form>}
    <p className="login-help">{teacher ? <>Teacher accounts require administrator provisioning. <Link href="/faculty/register" style={{ color: "#35669b", fontWeight: 700 }}>Register for teacher access</Link>. Use Gmail.</> : <>New student? <Link href="/student/register" style={{ color: "#35669b", fontWeight: 700 }}>Create an account</Link>. Use your @gndec.ac.in email.</>}</p></section><Link className="login-back" href="/">← Back to the GNDEC T&amp;P portal</Link><style>{styles}</style></main>;
}

const styles = `.login-page{min-height:100vh;padding:30px 20px 24px;background:#f5f7fa;display:flex;align-items:center;flex-direction:column;color:#172033}.login-brand{display:flex;align-items:center;gap:10px;color:#142b4a;font-size:15px;letter-spacing:.04em}.login-brand>span{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#e8eff8}.login-brand small{display:block;font-size:8px;color:#718096;letter-spacing:.12em;margin-top:3px}.login-card{width:min(100%,430px);margin:auto;padding:35px 38px;background:#fff;border:1px solid #e5eaf1;border-radius:12px;box-shadow:0 16px 42px rgba(20,43,74,.07)}.login-symbol{width:43px;height:43px;border-radius:11px;background:#edf3fb;color:#3b6599;display:grid;place-items:center}.login-kicker{margin:21px 0 8px;color:#4772a6;font-size:9px;letter-spacing:.15em;font-weight:700}.login-card h1{margin:0;color:#142b4a;font-size:27px;letter-spacing:-.03em}.login-subtitle{margin:9px 0 25px;color:#718096;font-size:12px;line-height:1.6}.login-card label{display:block;margin:17px 0 7px;font-size:11px;font-weight:700;color:#38465a}.login-input-wrap{height:45px;border:1px solid #dbe2eb;border-radius:6px;display:flex;align-items:center;gap:10px;padding:0 12px;color:#8a97a8}.login-input-wrap:focus-within{border-color:#6b91bf;box-shadow:0 0 0 3px rgba(37,99,235,.08)}.login-input-wrap input{height:100%;width:100%;border:0;outline:0;color:#172033;background:transparent;font-size:12px}.login-input-wrap input::placeholder{color:#a3adba}.otp-input input{text-align:center;letter-spacing:.3em;font-size:18px}.password-toggle{display:grid;place-items:center;border:0;background:transparent;color:#8491a2;cursor:pointer;padding:4px}.login-error{color:#b42318;font-size:11px;line-height:1.5;margin:12px 0}.login-info{color:#356c4d;background:#eff8f2;border-radius:5px;padding:9px;font-size:10px;line-height:1.5}.login-submit{width:100%;height:45px;margin-top:23px;background:#142b4a;color:white;border:0;border-radius:6px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer}.login-submit:disabled{opacity:.7;cursor:wait}.login-submit span{font-size:17px;font-weight:400}.login-help{margin:20px 0 0;padding-top:17px;border-top:1px solid #edf0f4;color:#7e8a9b;font-size:10px;line-height:1.65}.login-back{font-size:11px;color:#557398}.login-mode-link,.otp-actions button{display:block;margin:14px auto 0;border:0;background:transparent;color:#35669b;font-size:10px;cursor:pointer}.otp-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.otp-actions button{margin:13px 0 0}.otp-actions button:disabled{color:#9ba6b3;cursor:default}.otp-delivery-note,.login-security-note{color:#768398;font-size:10px;line-height:1.6}.otp-delivery-note{margin:0 0 15px}.login-security-note{text-align:center;margin:13px 0 0}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:500px){.login-page{padding:24px 16px 20px}.login-card{padding:30px 24px}.login-card h1{font-size:24px}}`;
