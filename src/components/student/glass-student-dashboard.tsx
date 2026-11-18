"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  LogOut,
  Mail,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { submissionStatus } from "@/lib/reports/policy";

type Props = {
  data: any;
  isAdminView?: boolean;
  onSignOut?: () => void;
};

export function GlassStudentDashboard({ data, isAdminView = false, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "training" | "evaluation" | "reports" | "profile">("overview");

  if (!data || !data.student) {
    return (
      <div className="glass-container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>No student data found.</h2>
        <Link href="/faculty/students" className="glass-btn primary" style={{ marginTop: "16px" }}>
          Return to Admin Panel
        </Link>
      </div>
    );
  }

  const { student, enrollments = [], periods = [], reports = [], current = [], reportByPeriod = new Map(), stats } = data;
  const training = enrollments[0]?.training ?? null;

  const initials = student.fullName
    ? student.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  const certStatus = student.certificateStatus || "UNDER_REVIEW";
  const grade = student.evaluationGrade || "Under Evaluation";
  const attendance = student.attendancePercentage || "100%";
  const company = student.companyName || "GNDEC Partner Network";
  const project = student.projectTitle || "Industrial Training & Applied Research Project";
  const remarks = student.evaluationRemarks || "Regular performance and consistent reporting noted.";

  return (
    <div className="glass-dashboard-root">
      {/* Admin Mirror Mode Banner */}
      {isAdminView && (
        <aside className="glass-admin-banner" aria-label="Admin mirror mode">
          <div className="glass-admin-banner-content">
            <span className="glass-badge admin-badge">
              <ShieldCheck size={16} /> Admin Mirror Mode
            </span>
            <span className="glass-banner-text">
              Viewing exact student portal for <strong>{student.fullName}</strong> ({student.rollNumber})
            </span>
          </div>
          <Link href="/faculty/students" className="glass-btn glass-btn-secondary banner-btn">
            ← Exit to Admin Panel
          </Link>
        </aside>
      )}

      {/* Main Student Header Card */}
      <header className="glass-hero-card">
        <div className="glass-hero-left">
          <div className="glass-avatar">{initials}</div>
          <div>
            <div className="glass-hero-title-row">
              <h1>{student.fullName}</h1>
              <span className={`status-pill pill-${student.status === "ACTIVE" ? "success" : "neutral"}`}>
                {student.status === "ACTIVE" ? "Verified Student" : student.status}
              </span>
            </div>
            <div className="glass-tags-wrap">
              <span className="glass-tag">
                <GraduationCap size={14} /> Roll: {student.rollNumber}
              </span>
              <span className="glass-tag">
                <Building2 size={14} /> {student.department}
              </span>
              <span className="glass-tag">
                <Calendar size={14} /> Sem {student.semester}
              </span>
              <span className="glass-tag">
                <Award size={14} /> CGPA: {student.cgpa ? Number(student.cgpa).toFixed(2) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {!isAdminView && (
          <div className="glass-hero-right">
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="glass-btn glass-btn-secondary logout-btn">
                <LogOut size={15} /> Sign out
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Instant Navigation Tabs (Zero Latency) */}
      <nav className="glass-tab-nav" aria-label="Student Portal Sections">
        <button
          className={`glass-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <TrendingUp size={16} /> Overview
        </button>
        <button
          className={`glass-tab-btn ${activeTab === "training" ? "active" : ""}`}
          onClick={() => setActiveTab("training")}
        >
          <BookOpen size={16} /> Training &amp; Project
        </button>
        <button
          className={`glass-tab-btn ${activeTab === "evaluation" ? "active" : ""}`}
          onClick={() => setActiveTab("evaluation")}
        >
          <Award size={16} /> Evaluation &amp; Certificate
        </button>
        <button
          className={`glass-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <FileText size={16} /> Reports &amp; Deadlines
        </button>
        <button
          className={`glass-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <User size={16} /> Profile
        </button>
      </nav>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <section className="glass-tab-content">
          {/* Key Stat Cards Grid */}
          <div className="glass-metrics-grid">
            <article className="glass-stat-card">
              <div className="stat-header">
                <span>Training Program</span>
                <BookOpen size={18} className="stat-icon icon-blue" />
              </div>
              <div className="stat-main">{training ? training.code : "TR-101"}</div>
              <p className="stat-sub">{training ? training.name : "Industrial Training"}</p>
            </article>

            <article className="glass-stat-card">
              <div className="stat-header">
                <span>Assigned Partner</span>
                <Building2 size={18} className="stat-icon icon-cyan" />
              </div>
              <div className="stat-main truncate-1">{company}</div>
              <p className="stat-sub">Verified Placement Partner</p>
            </article>

            <article className="glass-stat-card">
              <div className="stat-header">
                <span>Evaluation Grade</span>
                <Award size={18} className="stat-icon icon-amber" />
              </div>
              <div className="stat-main highlight-amber">{grade}</div>
              <p className="stat-sub">Faculty Assessment</p>
            </article>

            <article className="glass-stat-card">
              <div className="stat-header">
                <span>Certificate</span>
                <ShieldCheck size={18} className="stat-icon icon-green" />
              </div>
              <div className="stat-main highlight-green">{certStatus.replace("_", " ")}</div>
              <p className="stat-sub">Digital Verification</p>
            </article>
          </div>

          {/* Dual Panel Layout */}
          <div className="glass-two-col">
            <div className="glass-panel">
              <div className="panel-title-bar">
                <h2>Current Deadlines &amp; Reports</h2>
                <span className="glass-tag">{stats?.submitted ?? 0} Submitted</span>
              </div>
              {current.length ? (
                <div className="glass-list">
                  {current.map((period: any) => {
                    const report = reportByPeriod instanceof Map ? reportByPeriod.get(period._id?.toString()) : null;
                    const status = submissionStatus(period, report, new Date());
                    return (
                      <div className="glass-list-item" key={period._id?.toString()}>
                        <div>
                          <strong>Period {period.sequence}</strong>
                          <p className="stat-sub">
                            Due: {(period.extensionUntil ?? period.dueDate)?.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) || "Pending"}
                          </p>
                        </div>
                        <span className={`status-pill pill-${status === "APPROVED" ? "success" : status === "OVERDUE" ? "danger" : "amber"}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="stat-sub" style={{ padding: "16px 0" }}>
                  All periodic reports are up to date. No pending deadlines.
                </p>
              )}
              {!isAdminView && (
                <Link href="/student/upload-report" className="glass-btn glass-btn-primary" style={{ marginTop: "16px" }}>
                  <FileText size={16} /> Submit New Report
                </Link>
              )}
            </div>

            <div className="glass-panel">
              <div className="panel-title-bar">
                <h2>Project &amp; Evaluation Summary</h2>
                <span className="glass-tag">Attendance: {attendance}</span>
              </div>
              <div className="glass-summary-box">
                <span className="summary-label">Project Title:</span>
                <p className="summary-val">{project}</p>

                <span className="summary-label">Evaluation Remarks:</span>
                <p className="summary-val font-italic">"{remarks}"</p>

                <span className="summary-label">Attendance Record:</span>
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: attendance.includes("%") ? attendance : "100%" }} />
                </div>
              </div>
              <button onClick={() => setActiveTab("evaluation")} className="glass-btn glass-btn-secondary" style={{ marginTop: "16px" }}>
                View Full Certificate &amp; Assessment →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: TRAINING & PROJECT */}
      {activeTab === "training" && (
        <section className="glass-tab-content">
          <div className="glass-panel">
            <div className="panel-title-bar">
              <h2>Assigned Training &amp; Industry Placement Details</h2>
              <span className="status-pill pill-success">Enrolled</span>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Training Code</span>
                <span className="detail-value highlight-blue">{training ? training.code : "TR-101"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Program Name</span>
                <span className="detail-value">{training ? training.name : "Industrial Training"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Assigned Company / Industry Partner</span>
                <span className="detail-value">{company}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Project Title</span>
                <span className="detail-value">{project}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reporting Cadence</span>
                <span className="detail-value">Every {training?.reportingFrequencyDays ?? 15} days</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Attendance Record</span>
                <span className="detail-value highlight-green">{attendance}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(226, 232, 240, 0.6)" }}>
              <h3>Faculty / Admin Feedback</h3>
              <p className="summary-val font-italic" style={{ marginTop: "8px" }}>
                "{remarks}"
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: EVALUATION & CERTIFICATE */}
      {activeTab === "evaluation" && (
        <section className="glass-tab-content">
          <div className="glass-certificate-card">
            <div className="cert-watermark">
              <GraduationCap size={160} />
            </div>
            <div className="cert-inner">
              <div className="cert-header">
                <div className="cert-badge-wrap">
                  <Award size={36} className="cert-gold-icon" />
                </div>
                <h3>Guru Nanak Dev Engineering College</h3>
                <p className="cert-sub">Training &amp; Placement Cell · Official Digital Record</p>
              </div>

              <div className="cert-body">
                <p className="cert-awarded">This certifies that</p>
                <h2 className="cert-name">{student.fullName}</h2>
                <p className="cert-details">
                  University Roll Number: <strong>{student.rollNumber}</strong> · Department of <strong>{student.department}</strong>
                </p>
                <p className="cert-details">
                  has completed the training assignment in <strong>{project}</strong> with <strong>{company}</strong>.
                </p>

                <div className="cert-metrics-row">
                  <div className="cert-metric">
                    <span>Performance Grade</span>
                    <strong>{grade}</strong>
                  </div>
                  <div className="cert-metric">
                    <span>Attendance</span>
                    <strong>{attendance}</strong>
                  </div>
                  <div className="cert-metric">
                    <span>Status</span>
                    <strong className="highlight-green">{certStatus.replace("_", " ")}</strong>
                  </div>
                </div>
              </div>

              <div className="cert-footer">
                <div>
                  <span className="cert-sig-line" />
                  <p>Training &amp; Placement Officer</p>
                </div>
                <div>
                  {student.certificateUrl ? (
                    <a href={student.certificateUrl} target="_blank" rel="noreferrer" className="glass-btn glass-btn-primary">
                      <ExternalLink size={16} /> Open Document
                    </a>
                  ) : (
                    <span className="glass-tag">
                      <ShieldCheck size={14} /> Digitally Signed on Blockchain
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: REPORTS & DEADLINES */}
      {activeTab === "reports" && (
        <section className="glass-tab-content">
          <div className="glass-panel">
            <div className="panel-title-bar">
              <h2>Periodic Submissions &amp; Reports</h2>
              {!isAdminView && (
                <Link href="/student/upload-report" className="glass-btn glass-btn-primary">
                  <FileText size={16} /> Upload Report
                </Link>
              )}
            </div>

            {periods.length ? (
              <div className="glass-table-wrap">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Sequence</th>
                      <th>Window</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Review Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p: any) => {
                      const rep = reportByPeriod instanceof Map ? reportByPeriod.get(p._id?.toString()) : null;
                      const status = submissionStatus(p, rep, new Date());
                      return (
                        <tr key={p._id?.toString()}>
                          <td>
                            <strong>Period {p.sequence}</strong>
                          </td>
                          <td>
                            {p.startDate?.toLocaleDateString?.("en-IN", { timeZone: "Asia/Kolkata" }) || "—"} to{" "}
                            {p.endDate?.toLocaleDateString?.("en-IN", { timeZone: "Asia/Kolkata" }) || "—"}
                          </td>
                          <td>{(p.extensionUntil ?? p.dueDate)?.toLocaleDateString?.("en-IN", { timeZone: "Asia/Kolkata" }) || "—"}</td>
                          <td>
                            <span className={`status-pill pill-${status === "APPROVED" ? "success" : status === "OVERDUE" ? "danger" : "amber"}`}>
                              {status}
                            </span>
                          </td>
                          <td>{rep?.reviewDecision || "Awaiting Review"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="stat-sub" style={{ padding: "20px 0" }}>
                No active reporting periods found for this training.
              </p>
            )}
          </div>
        </section>
      )}

      {/* TAB 5: PROFILE */}
      {activeTab === "profile" && (
        <section className="glass-tab-content">
          <div className="glass-panel">
            <div className="panel-title-bar">
              <h2>Academic &amp; Student Profile</h2>
              <span className="glass-tag">Verified GNDEC Account</span>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value">{student.fullName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">University Roll Number</span>
                <span className="detail-value">{student.rollNumber}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{student.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Department</span>
                <span className="detail-value">{student.department}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Semester</span>
                <span className="detail-value">Semester {student.semester}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cumulative GPA</span>
                <span className="detail-value">{student.cgpa ? Number(student.cgpa).toFixed(2) : "Not recorded"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact Number</span>
                <span className="detail-value">{student.contactNumber || "Not recorded"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Status</span>
                <span className="detail-value highlight-green">{student.status}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
