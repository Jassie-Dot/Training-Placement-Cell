"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileClock,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Search,
  Sparkles,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/faculty/stat-card";
import { ReportStatusChart, TrainingDistributionChart } from "@/components/faculty/dashboard-charts";
import { RecentActivity } from "@/components/faculty/recent-activity";
import { ImportForm } from "@/app/faculty/(portal)/students/import/import-form";
import { CustomSelect } from "@/components/ui/custom-select";
import type { AllStudentTableRow } from "@/lib/faculty/student-query";
import type { FacultyOverview } from "@/lib/faculty/dashboard-data";

type Tab = "overview" | "students" | "import" | "trainings" | "reports";

export type AdminDashboardProps = {
  facultyName: string;
  permissions: string[];
  overview: FacultyOverview;
  students: AllStudentTableRow[];
  departments: string[];
  totalStudents: number;
  initialTab?: Tab;
};

export function GlassAdminDashboard({
  facultyName,
  permissions,
  overview,
  students,
  departments,
  totalStudents,
  initialTab = "overview",
}: AdminDashboardProps) {
  // Instant client-side tab switching (0ms latency)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Live client-side student search and department filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.fullName.toLowerCase().includes(q) ||
        student.rollNumber.toLowerCase().includes(q) ||
        (student.email && student.email.toLowerCase().includes(q));

      const matchesDept = selectedDept === "ALL" || student.department === selectedDept;
      const matchesStatus = selectedStatus === "ALL" || student.status === selectedStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [students, searchQuery, selectedDept, selectedStatus]);

  const date = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <main className="faculty-content">
      {/* Top Banner / Welcome Row */}
      <div className="faculty-page-heading">
        <div>
          <span className="faculty-eyebrow">
            <Sparkles size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
            ADMINISTRATOR WORKSPACE
          </span>
          <h1>Welcome, {facultyName.split(" ")[0] || "Administrator"}</h1>
          <p>{date} · Centralized student training records and live portal management.</p>
        </div>
        <div className="faculty-heading-actions">
          <button
            className={`faculty-button ${activeTab === "import" ? "primary" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <Upload size={14} />
            <span>Upload Excel</span>
          </button>
          <button
            className={`faculty-button ${activeTab === "students" ? "primary" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            <Users size={14} />
            <span>Students Directory</span>
          </button>
        </div>
      </div>

      {/* FAST ZERO-LATENCY TAB NAVIGATION BAR */}
      <div className="admin-tabs-nav" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <LayoutDashboard size={16} />
          <span>Overview &amp; Metrics</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "students"}
          className={`admin-tab-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => setActiveTab("students")}
        >
          <Users size={16} />
          <span>All Students</span>
          <span className="tab-counter-badge">{filteredStudents.length}</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "import"}
          className={`admin-tab-btn ${activeTab === "import" ? "active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          <FileSpreadsheet size={16} />
          <span>Import Excel / CSV</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "trainings"}
          className={`admin-tab-btn ${activeTab === "trainings" ? "active" : ""}`}
          onClick={() => setActiveTab("trainings")}
        >
          <BookOpenCheck size={16} />
          <span>Training Programs ({overview.trainingSummaries.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "reports"}
          className={`admin-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <FileText size={16} />
          <span>Compliance &amp; Reports</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === "overview" && (
        <div className="admin-tab-pane animate-fade-in">
          {/* Top Stat Grid */}
          <div className="faculty-grid stat-grid">
            <StatCard
              label="Total Enrolled Students"
              value={overview.totalStudents}
              foot="Active student records managed by you"
              icon={<Users size={17} />}
            />
            <StatCard
              label="Active Programs"
              value={overview.activeTrainings}
              foot="Configured TR programs"
              icon={<ClipboardCheck size={17} />}
            />
            <StatCard
              label="Reports Submitted"
              value={overview.reportsSubmitted}
              foot="All recorded student reports"
              icon={<FileText size={17} />}
            />
            <StatCard
              label="Pending Reviews"
              value={overview.pendingReviews}
              foot="Awaiting administrator review"
              icon={<FileClock size={17} />}
            />
            <StatCard
              label="Approved Reports"
              value={overview.approved}
              foot={`Approval ratio: ${overview.approvalRatio}%`}
              icon={<CheckCircle2 size={17} />}
            />
            <StatCard
              label="Reporting Compliance"
              value={`${overview.reportingCompliance}%`}
              foot="Submission rate for active periods"
              icon={<BarChart3 size={17} />}
            />
          </div>

          {/* Charts Grid */}
          <div className="faculty-grid chart-grid">
            <section className="faculty-panel">
              <div className="panel-heading">
                <div>
                  <h2>Program Enrollment Distribution</h2>
                  <p>Students currently assigned across each training code</p>
                </div>
              </div>
              <TrainingDistributionChart data={overview.distribution} />
            </section>

            <section className="faculty-panel">
              <div className="panel-heading">
                <div>
                  <h2>Submission &amp; Review Status</h2>
                  <p>Status breakdown of student evaluations and progress</p>
                </div>
              </div>
              <ReportStatusChart data={overview.reportStatuses} />
            </section>
          </div>

          {/* Bottom Grid: Training Performance & Recent Activity */}
          <div className="faculty-grid bottom-grid">
            <section className="faculty-panel">
              <div className="panel-heading">
                <div>
                  <h2>Training Program Performance</h2>
                  <p>Approval rates and status breakdown per training</p>
                </div>
              </div>
              <div className="training-performance">
                {overview.trainingSummaries.map((training) => (
                  <div className="performance-row" key={training.code}>
                    <b>{training.code}</b>
                    <div className="performance-bar">
                      <span style={{ width: `${training.approvalRate}%` }} />
                    </div>
                    <span className="performance-value">
                      {training.approvalRate}% · {training.approved}/{training.submitted} approved
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="faculty-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Portal Activity</h2>
                  <p>Latest updates, submissions, and additions</p>
                </div>
              </div>
              <RecentActivity items={overview.activity} />
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: ALL STUDENTS (WITH INSTANT CLIENT SEARCH & MIRROR MODE) */}
      {activeTab === "students" && (
        <div className="admin-tab-pane animate-fade-in">
          <section className="data-panel">
            {/* Live Filter Bar */}
            <div className="data-toolbar">
              <div className="client-search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Instant search by name, roll number, or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="client-search-input"
                />
              </div>

              <div className="client-filters-row">
                <div style={{ minWidth: "170px" }}>
                  <CustomSelect
                    name="selectedDept"
                    value={selectedDept}
                    onChange={(val) => setSelectedDept(val)}
                    options={[
                      { value: "ALL", label: "All Departments" },
                      ...departments.map((dept) => ({ value: dept, label: dept })),
                    ]}
                  />
                </div>

                <div style={{ minWidth: "150px" }}>
                  <CustomSelect
                    name="selectedStatus"
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val)}
                    options={[
                      { value: "ALL", label: "All Statuses" },
                      { value: "ACTIVE", label: "Active" },
                      { value: "INACTIVE", label: "Inactive" },
                      { value: "GRADUATED", label: "Graduated" },
                    ]}
                  />
                </div>

                <button
                  className="faculty-button primary"
                  onClick={() => setActiveTab("import")}
                  style={{ padding: "8px 14px", fontSize: "12px", height: "42px" }}
                >
                  <Upload size={14} />
                  <span>Import via Excel</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="table-scroll">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>University Roll No</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>CGPA</th>
                    <th>Status</th>
                    <th>Training Programs</th>
                    <th style={{ textAlign: "right" }}>Actions (Mirror View)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <strong>{student.rollNumber}</strong>
                        </td>
                        <td>{student.fullName}</td>
                        <td>{student.department}</td>
                        <td>Sem {student.semester}</td>
                        <td>{student.cgpa !== null ? student.cgpa.toFixed(2) : "—"}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              student.status === "ACTIVE" ? "active" : ""
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td>
                          {student.trainingLabels?.length ? (
                            <span className="training-tags-wrap">
                              {student.trainingLabels.map((tag) => (
                                <span key={tag} className="training-tag-pill">
                                  {tag}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {/* Pinkfarm-style Storefront Mirror Button */}
                          <Link
                            href={`/faculty/students/${student.id}/preview`}
                            className="mirror-student-btn"
                            title="Open exact live dashboard that this student sees"
                          >
                            <Eye size={13} />
                            <span>View as Student</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-inline">
                          No students matched your search filter.{" "}
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedDept("ALL");
                              setSelectedStatus("ALL");
                            }}
                            style={{
                              background: "transparent",
                              border: "0",
                              color: "#2563eb",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="table-footer">
              <span>
                Showing {filteredStudents.length} of {totalStudents} student record(s)
              </span>
              <span style={{ color: "#64748b", fontSize: "11.5px" }}>
                💡 Click <strong>View as Student</strong> on any student row to view their personalized glass dashboard in Mirror Mode.
              </span>
            </footer>
          </section>
        </div>
      )}

      {/* TAB 3: UPLOAD EXCEL / CSV DATA */}
      {activeTab === "import" && (
        <div className="admin-tab-pane animate-fade-in">
          <ImportForm />
        </div>
      )}

      {/* TAB 4: TRAINING PROGRAMS */}
      {activeTab === "trainings" && (
        <div className="admin-tab-pane animate-fade-in">
          <div className="faculty-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {overview.trainingSummaries.map((prog) => (
              <div key={prog.code} className="faculty-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span className="training-tag-pill" style={{ fontSize: "12px", padding: "4px 10px" }}>
                      {prog.code}
                    </span>
                    <span className="status-pill active">ACTIVE</span>
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                    {prog.name}
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b" }}>
                    Institutional industrial training program for GNDEC students.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px", background: "rgba(248, 250, 252, 0.8)", borderRadius: "10px", marginBottom: "16px" }}>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Enrolled</small>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>{prog.students}</strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Submitted</small>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>{prog.submitted}</strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Approved</small>
                      <strong style={{ fontSize: "16px", color: "#16a34a" }}>{prog.approved}</strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Overdue</small>
                      <strong style={{ fontSize: "16px", color: prog.overdue > 0 ? "#dc2626" : "#64748b" }}>
                        {prog.overdue}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Link
                    prefetch={true}
                    href={`/faculty/trainings/${prog.code}`}
                    className="faculty-button primary"
                    style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}
                  >
                    <span>View Program</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMPLIANCE & REPORTS */}
      {activeTab === "reports" && (
        <div className="admin-tab-pane animate-fade-in">
          <div className="faculty-grid bottom-grid">
            <section className="faculty-panel">
              <div className="panel-heading">
                <div>
                  <h2>Department-wise Performance</h2>
                  <p>Students and reports submitted per department</p>
                </div>
              </div>
              <div className="activity-list">
                {overview.departmentStats.map((item) => (
                  <div className="activity-row" key={item.department}>
                    <div>
                      <b>{item.department}</b>
                      <small>
                        {item.students} students · {item.submissions} reports · {item.approved} approved
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="faculty-panel">
              <div className="panel-heading">
                <div>
                  <h2>Semester-wise Performance</h2>
                  <p>Students and submissions breakdown per semester</p>
                </div>
              </div>
              <div className="activity-list">
                {overview.semesterStats.map((item) => (
                  <div className="activity-row" key={item.semester}>
                    <div>
                      <b>Semester {item.semester}</b>
                      <small>
                        {item.students} students · {item.submissions} reports · {item.approved} approved
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Scoped CSS for fast tabs & animations */}
      <style>{adminDashboardStyles}</style>
    </main>
  );
}

const adminDashboardStyles = `
.admin-tabs-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 6px;
  border-radius: 14px;
  margin-bottom: 24px;
  overflow-x: auto;
  box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03);
}

.admin-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 10px;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.admin-tab-btn:hover {
  background: rgba(241, 245, 249, 0.8);
  color: #0f172a;
}

.admin-tab-btn.active {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
}

.tab-counter-badge {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 800;
}
.admin-tab-btn:not(.active) .tab-counter-badge {
  background: #e2e8f0;
  color: #475569;
}

.animate-fade-in {
  animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

.client-search-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
}
.client-search-wrap .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}
.client-search-input {
  width: 100%;
  height: 40px;
  padding: 0 14px 0 36px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  outline: 0;
  transition: all 0.2s;
}
.client-search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.client-filters-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.client-filter-select {
  height: 40px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  outline: 0;
  cursor: pointer;
}
.client-filter-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.training-tags-wrap {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}
.training-tag-pill {
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.mirror-student-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-weight: 700;
  font-size: 12px;
  text-decoration: none;
  border: 1px solid rgba(37, 99, 235, 0.25);
  transition: all 0.15s ease;
  white-space: nowrap;
}
.mirror-student-btn:hover {
  background: #2563eb;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}
`;
