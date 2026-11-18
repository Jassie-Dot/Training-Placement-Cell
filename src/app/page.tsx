import Link from "next/link";
import { ArrowRight, FileSpreadsheet, GraduationCap, Lock, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="institutional-portal">
      {/* Top University Brand Bar */}
      <header className="inst-header">
        <div className="inst-header-inner">
          <div className="inst-brand">
            <span className="inst-brand-logo">
              <GraduationCap size={22} />
            </span>
            <div className="inst-brand-titles">
              <strong>GURU NANAK DEV ENGINEERING COLLEGE</strong>
              <small>TRAINING &amp; PLACEMENT CELL · LUDHIANA, PUNJAB</small>
            </div>
          </div>
          <div className="inst-badge">
            <span className="pulse-indicator" />
            <span>Portal Active · Session 2026</span>
          </div>
        </div>
      </header>

      {/* Main Center Section */}
      <section className="inst-hero-section">
        <div className="inst-hero-text">
          <span className="inst-category-pill">OFFICIAL ACADEMIC PORTAL</span>
          <h1>Training &amp; Placement Management System</h1>
          <p>
            Centralized platform for GNDEC students and training administration. Access verified industrial training records, project evaluations, attendance, and official completion certificates.
          </p>
        </div>

        {/* Portal Options Grid */}
        <div className="inst-grid">
          {/* STUDENT CARD */}
          <article className="inst-card">
            <div className="inst-card-header">
              <div className="inst-icon-box student-icon">
                <GraduationCap size={24} />
              </div>
              <span className="inst-role-tag student-tag">STUDENT PORTAL</span>
            </div>

            <div className="inst-card-body">
              <h2>Student Access</h2>
              <p>
                Sign in with your University Roll Number or Registered Email. View your personalized industrial training status, evaluation marks, company details, attendance, and download certificates.
              </p>
            </div>

            <div className="inst-card-actions">
              <Link className="inst-btn btn-navy" href="/student/login">
                <span>Sign In as Student</span>
                <ArrowRight size={16} />
              </Link>
              <Link className="inst-btn btn-outline" href="/student/register">
                <UserPlus size={15} />
                <span>Create Student Account</span>
              </Link>
            </div>
          </article>

          {/* ADMINISTRATOR CARD */}
          <article className="inst-card">
            <div className="inst-card-header">
              <div className="inst-icon-box admin-icon">
                <ShieldCheck size={24} />
              </div>
              <span className="inst-role-tag admin-tag">ADMINISTRATOR PORTAL</span>
            </div>

            <div className="inst-card-body">
              <h2>Admin Workspace</h2>
              <p>
                Dedicated control panel for training placement administrators. Upload standardized student Excel/CSV spreadsheets, record evaluations, issue certificates, and mirror student dashboard views.
              </p>
            </div>

            <div className="inst-card-actions">
              <Link className="inst-btn btn-slate" href="/faculty/login">
                <span>Admin Sign In</span>
                <ArrowRight size={16} />
              </Link>
              <Link className="inst-btn btn-outline" href="/faculty/register">
                <Users size={15} />
                <span>Admin Registration</span>
              </Link>
            </div>
          </article>
        </div>

        {/* Quick Help / Highlights */}
        <div className="inst-highlights">
          <div className="highlight-item">
            <FileSpreadsheet size={18} className="highlight-icon" />
            <div>
              <strong>Excel Data Synchronization</strong>
              <span>Bulk upload student records and certificates via standardized templates.</span>
            </div>
          </div>
          <div className="highlight-item">
            <UserCheck size={18} className="highlight-icon" />
            <div>
              <strong>Personalized Student View</strong>
              <span>Students see only their individual training progress and evaluation marks.</span>
            </div>
          </div>
          <div className="highlight-item">
            <Lock size={18} className="highlight-icon" />
            <div>
              <strong>Authorized &amp; Verified</strong>
              <span>Secure authentication for university students and designated placement admins.</span>
            </div>
          </div>
        </div>
      </section>

      {/* University Footer */}
      <footer className="inst-footer">
        <div className="inst-footer-inner">
          <p>© Guru Nanak Dev Engineering College (GNDEC), Ludhiana · Training &amp; Placement Department</p>
          <p className="footer-sub">Autonomous institution under UGC Act · Affiliated to IKGPTU Jalandhar</p>
        </div>
      </footer>

      <style>{institutionalStyles}</style>
    </main>
  );
}

const institutionalStyles = `
/* Clean, sleek, institutional university theme (no flashiness, single scrollbar) */
.institutional-portal {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Header */
.inst-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 24px;
}
.inst-header-inner {
  max-width: 1140px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.inst-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.inst-brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #0f2b48;
  color: #ffffff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.inst-brand-titles strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #0f2b48;
  line-height: 1.2;
}
.inst-brand-titles small {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
  margin-top: 2px;
}

.inst-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
}
.pulse-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
}

/* Hero Section */
.inst-hero-section {
  flex: 1;
  max-width: 1040px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 24px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.inst-hero-text {
  text-align: center;
  max-width: 760px;
  margin-bottom: 40px;
}
.inst-category-pill {
  display: inline-block;
  background: #e2e8f0;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 14px;
}
.inst-hero-text h1 {
  font-size: 32px;
  font-weight: 800;
  color: #0f2b48;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
  line-height: 1.25;
}
.inst-hero-text p {
  font-size: 15px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

/* Cards Grid */
.inst-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  width: 100%;
  margin-bottom: 40px;
}

.inst-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.inst-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.inst-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.inst-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}
.student-icon {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #dbeafe;
}
.admin-icon {
  background: #f8fafc;
  color: #0f2b48;
  border: 1px solid #e2e8f0;
}

.inst-role-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 6px;
}
.student-tag {
  background: #f1f5f9;
  color: #1e3a8a;
}
.admin-tag {
  background: #f1f5f9;
  color: #334155;
}

.inst-card-body h2 {
  font-size: 21px;
  font-weight: 750;
  color: #0f2b48;
  margin: 0 0 10px;
}
.inst-card-body p {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.55;
  margin: 0 0 24px;
}

.inst-card-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inst-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
}
.btn-navy {
  background: #0f2b48;
  color: #ffffff;
}
.btn-navy:hover {
  background: #1e3a5f;
}
.btn-slate {
  background: #1e293b;
  color: #ffffff;
}
.btn-slate:hover {
  background: #334155;
}
.btn-outline {
  background: #ffffff;
  color: #334155;
  border: 1px solid #d1d5db;
}
.btn-outline:hover {
  background: #f8fafc;
  border-color: #9ca3af;
}

/* Highlights */
.inst-highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  width: 100%;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}
.highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.highlight-icon {
  color: #0f2b48;
  flex-shrink: 0;
  margin-top: 2px;
}
.highlight-item strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #0f2b48;
  margin-bottom: 2px;
}
.highlight-item span {
  display: block;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

/* Footer */
.inst-footer {
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 24px 20px;
  text-align: center;
  margin-top: auto;
}
.inst-footer-inner p {
  margin: 0;
  font-size: 12.5px;
  color: #475569;
  font-weight: 500;
}
.inst-footer-inner .footer-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

/* Mobile Responsiveness & Touch Fluidity */
@media (max-width: 820px) {
  .inst-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .inst-highlights {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .inst-hero-section {
    padding: 32px 16px 40px;
  }
  .inst-hero-text h1 {
    font-size: 25px;
  }
  .inst-card {
    padding: 24px 20px;
  }
}
`;
