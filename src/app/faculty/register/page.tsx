import Link from "next/link";
import { GraduationCap, Mail } from "lucide-react";

export default function FacultyRegistrationPage() {
  return <main className="faculty-register-page">
    <Link href="/" className="faculty-register-brand"><span><GraduationCap size={22} /></span><b>GNDEC <small>TRAINING &amp; PLACEMENT</small></b></Link>
    <section className="faculty-register-card">
      <span className="faculty-register-icon"><Mail size={21} /></span>
      <p>TEACHER PORTAL</p>
      <h1>Request teacher access</h1>
      <p className="faculty-register-copy">Teacher accounts are created by the portal administrator. Ask the GNDEC Training &amp; Placement administrator to provision your account using your <strong>Gmail</strong> address.</p>
      <Link className="faculty-register-button" href="/faculty/login">Continue to teacher login</Link>
    </section>
    <Link href="/" className="faculty-register-back">← Choose another portal</Link>
    <style>{styles}</style>
  </main>;
}

const styles = `.faculty-register-page{min-height:100vh;padding:30px 20px 24px;background:#f5f7fa;display:flex;align-items:center;flex-direction:column;color:#172033}.faculty-register-brand{display:flex;align-items:center;gap:10px;color:#142b4a;font-size:15px;letter-spacing:.04em}.faculty-register-brand>span{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#e8eff8}.faculty-register-brand small{display:block;font-size:8px;color:#718096;letter-spacing:.12em;margin-top:3px}.faculty-register-card{width:min(100%,430px);margin:auto;padding:35px 38px;background:#fff;border:1px solid #e5eaf1;border-radius:12px;box-shadow:0 16px 42px rgba(20,43,74,.07)}.faculty-register-icon{width:43px;height:43px;border-radius:11px;background:#edf3fb;color:#3b6599;display:grid;place-items:center}.faculty-register-card>p:first-of-type{margin:21px 0 8px;color:#4772a6;font-size:9px;letter-spacing:.15em;font-weight:700}.faculty-register-card h1{margin:0;color:#142b4a;font-size:26px;letter-spacing:-.03em}.faculty-register-copy{margin:12px 0 20px;color:#718096;font-size:12px;line-height:1.7}.faculty-register-copy strong{color:#38465a}.faculty-register-button{width:100%;min-height:44px;padding:0 16px;background:#142b4a;color:#fff;border-radius:6px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}.faculty-register-back{margin-top:auto;font-size:11px;color:#557398}@media(max-width:500px){.faculty-register-page{padding:24px 16px 20px}.faculty-register-card{padding:30px 24px}.faculty-register-card h1{font-size:24px}}`;
