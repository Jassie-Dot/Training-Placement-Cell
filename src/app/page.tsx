import Link from "next/link";
import { ArrowRight, GraduationCap, UserRoundPlus, UsersRound } from "lucide-react";

const portals = [
  {
    href: "/student/login",
    registerHref: "/student/register",
    label: "Student",
    detail: "Sign in with your @gndec.ac.in address.",
    registerLabel: "Register student account",
    Icon: GraduationCap,
  },
  {
    href: "/faculty/login",
    registerHref: "/faculty/register",
    label: "Teacher",
    detail: "Sign in with your Gmail address.",
    registerLabel: "Register for teacher access",
    Icon: UsersRound,
  },
];

export default function HomePage() {
  return (
    <main className="portal-start">
      <div className="portal-start-brand">
        <span className="portal-start-mark"><GraduationCap size={22} /></span>
        <span><strong>GNDEC</strong><small>TRAINING &amp; PLACEMENT</small></span>
      </div>
      <section className="portal-start-card" aria-labelledby="portal-start-title">
        <p className="portal-start-kicker">SIGN IN OR REGISTER</p>
        <h1 id="portal-start-title">Choose your portal</h1>
        <div className="portal-start-options">
          {portals.map(({ href, registerHref, label, detail, registerLabel, Icon }) => (
            <article className="portal-start-option" key={href}>
              <span className="portal-start-option-icon"><Icon size={21} /></span>
              <div className="portal-start-option-content">
                <Link className="portal-start-login" href={href}>
                  <span className="portal-start-option-copy"><strong>{label}</strong><small>{detail}</small></span>
                  <ArrowRight className="portal-start-arrow" size={18} />
                </Link>
                <Link className="portal-start-register" href={registerHref}><UserRoundPlus size={14} />{registerLabel}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <style>{styles}</style>
    </main>
  );
}

const styles = `.portal-start{min-height:100vh;padding:30px 20px;background:#f5f7fa;display:flex;align-items:center;flex-direction:column;color:#172033}.portal-start-brand{display:flex;align-items:center;gap:10px;color:#142b4a;font-size:15px;letter-spacing:.04em}.portal-start-brand small{display:block;margin-top:3px;color:#718096;font-size:8px;letter-spacing:.12em}.portal-start-mark{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#e8eff8}.portal-start-card{width:min(100%,470px);margin:auto;padding:36px;background:#fff;border:1px solid #e5eaf1;border-radius:12px;box-shadow:0 16px 42px rgba(20,43,74,.07)}.portal-start-kicker{margin:0 0 8px;color:#4772a6;font-size:9px;letter-spacing:.15em;font-weight:700}.portal-start-card h1{margin:0 0 22px;color:#142b4a;font-size:26px;letter-spacing:-.03em}.portal-start-options{display:grid;gap:13px}.portal-start-option{padding:14px;display:flex;align-items:flex-start;gap:13px;border:1px solid #e5eaf1;border-radius:8px}.portal-start-option-icon{width:40px;height:40px;flex:none;border-radius:9px;display:grid;place-items:center;background:#edf3fb;color:#3b6599}.portal-start-option-content{flex:1;min-width:0}.portal-start-login{min-height:40px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#142b4a}.portal-start-option-copy{display:grid;gap:5px}.portal-start-option-copy strong{font-size:13px}.portal-start-option-copy small{color:#718096;font-size:10px;line-height:1.5}.portal-start-arrow{flex:none;color:#557398}.portal-start-register{width:max-content;max-width:100%;margin-top:10px;padding-top:9px;border-top:1px solid #edf0f4;display:flex;align-items:center;gap:6px;color:#35669b;font-size:10px;font-weight:700}.portal-start-login:hover .portal-start-option-copy strong,.portal-start-register:hover{text-decoration:underline}.portal-start-login:focus-visible,.portal-start-register:focus-visible{outline:2px solid #6b91bf;outline-offset:3px;border-radius:3px}@media(max-width:500px){.portal-start{padding:24px 16px}.portal-start-card{padding:28px 22px}.portal-start-card h1{font-size:23px}}`;
