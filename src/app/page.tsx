import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles, UserRoundPlus, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="portal-landing">
      {/* Background ambient lighting effects */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      {/* Header */}
      <header className="portal-header">
        <div className="portal-brand">
          <span className="brand-logo">
            <GraduationCap size={24} />
          </span>
          <div className="brand-text">
            <strong>GNDEC</strong>
            <small>TRAINING &amp; PLACEMENT CELL</small>
          </div>
        </div>
        <div className="portal-status-pill">
          <span className="live-dot" />
          <span>System Online</span>
        </div>
      </header>

      {/* Center Hero & Portal Cards */}
      <section className="portal-center-wrap">
        <div className="portal-hero-text">
          <span className="glass-kicker">
            <Sparkles size={14} /> OFFICIAL PORTAL
          </span>
          <h1>Training &amp; Placement Portal</h1>
          <p>
            Secure, centralized platform for student industrial training, project evaluations, verified certificates, and administrator records management.
          </p>
        </div>

        <div className="portal-cards-grid">
          {/* STUDENT PORTAL CARD */}
          <article className="portal-glass-card student-card">
            <div className="card-top">
              <span className="card-icon-wrap icon-student">
                <GraduationCap size={28} />
              </span>
              <span className="card-role-badge">STUDENT</span>
            </div>
            <div className="card-content">
              <h2>Student Portal</h2>
              <p>
                Sign in with your University Roll Number or Registered Email. View your personalized training assignments, evaluation marks, attendance, and certificates.
              </p>
            </div>
            <div className="card-actions">
              <Link className="portal-btn btn-primary" href="/student/login">
                <span>Student Sign In</span>
                <ArrowRight size={18} />
              </Link>
              <Link className="portal-btn btn-glass" href="/student/register">
                <UserRoundPlus size={16} />
                <span>Create Student Account</span>
              </Link>
            </div>
          </article>

          {/* ADMIN PORTAL CARD (Replaces Teacher) */}
          <article className="portal-glass-card admin-card">
            <div className="card-top">
              <span className="card-icon-wrap icon-admin">
                <ShieldCheck size={28} />
              </span>
              <span className="card-role-badge badge-admin">ADMINISTRATOR</span>
            </div>
            <div className="card-content">
              <h2>Admin Portal</h2>
              <p>
                Dedicated control panel for training placement administrators. Upload student data spreadsheets, manage certificates, and mirror student dashboard views.
              </p>
            </div>
            <div className="card-actions">
              <Link className="portal-btn btn-admin" href="/faculty/login">
                <span>Admin Sign In</span>
                <ArrowRight size={18} />
              </Link>
              <Link className="portal-btn btn-glass" href="/faculty/register">
                <Users size={16} />
                <span>Admin Registration</span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="portal-footer">
        <p>© Guru Nanak Dev Engineering College · Training &amp; Placement Department</p>
      </footer>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
.portal-landing {
  min-height: 100vh;
  position: relative;
  background: radial-gradient(circle at 10% 20%, #0f1e36 0%, #0a1324 100%);
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.45;
}
.orb-1 {
  width: 450px;
  height: 450px;
  background: #3b82f6;
  top: -100px;
  left: -100px;
}
.orb-2 {
  width: 500px;
  height: 500px;
  background: #8b5cf6;
  bottom: -150px;
  right: -100px;
}
.orb-3 {
  width: 350px;
  height: 350px;
  background: #06b6d4;
  top: 40%;
  left: 60%;
}

.portal-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px max(24px, calc((100vw - 1200px)/2));
}

.portal-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: grid;
  place-items: center;
  color: #60a5fa;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
.brand-text strong {
  display: block;
  font-size: 16px;
  letter-spacing: 0.05em;
  color: #ffffff;
}
.brand-text small {
  display: block;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: #94a3b8;
}

.portal-status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 11px;
  color: #cbd5e1;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
}

.portal-center-wrap {
  position: relative;
  z-index: 10;
  width: min(1080px, calc(100% - 36px));
  margin: auto;
  padding: 20px 0 60px;
  text-align: center;
}

.glass-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.3);
  color: #93c5fd;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.portal-hero-text h1 {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #ffffff 30%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.portal-hero-text p {
  max-width: 680px;
  margin: 0 auto 46px;
  font-size: clamp(14px, 2vw, 16px);
  color: #94a3b8;
  line-height: 1.65;
}

.portal-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  text-align: left;
}

.portal-glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.portal-glass-card:hover {
  transform: translateY(-4px);
  border-color: rgba(96, 165, 250, 0.4);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.5), 0 0 30px rgba(59, 130, 246, 0.15);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.card-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: grid;
  place-items: center;
}
.icon-student {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(6, 182, 212, 0.2));
  border: 1px solid rgba(37, 99, 235, 0.4);
  color: #60a5fa;
}
.icon-admin {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #c084fc;
}

.card-role-badge {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: rgba(37, 99, 235, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(37, 99, 235, 0.3);
}
.badge-admin {
  background: rgba(139, 92, 246, 0.15);
  color: #d8b4fe;
  border-color: rgba(139, 92, 246, 0.3);
}

.card-content h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 10px;
  color: #ffffff;
}

.card-content p {
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 28px;
  min-height: 60px;
}

.card-actions {
  display: grid;
  gap: 12px;
  margin-top: auto;
}

.portal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
}
.btn-primary:hover {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.5);
}

.btn-admin {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.35);
}
.btn-admin:hover {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.5);
}

.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
}
.btn-glass:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.portal-footer {
  position: relative;
  z-index: 10;
  margin-top: auto;
  padding: 20px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

@media (max-width: 640px) {
  .portal-cards-grid {
    grid-template-columns: 1fr;
  }
}
`;
