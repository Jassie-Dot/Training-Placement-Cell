"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Bell, BookOpenCheck, ChevronDown, ChevronLeft, ChevronRight, FileBarChart2, GraduationCap, LayoutDashboard, Menu, Settings2, Upload, UserPlus, Users, X } from "lucide-react";

const trainings = ["TR-101", "TR-102", "TR-103", "TR-104"];
export function FacultySidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeTraining = trainings.find((code) => path.startsWith(`/faculty/trainings/${code}`));
  const linkClass = (href: string) => `faculty-nav-link${path === href ? " active" : ""}`;
  const sidebarClass = `faculty-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`;
  const closeMobile = () => setMobileOpen(false);
  return <>
    <button className="mobile-sidebar-toggle" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={closeMobile} />}
    <aside className={sidebarClass}>
      <Link className="faculty-brand" href="/faculty/dashboard" onClick={closeMobile}><span className="faculty-brand-icon"><GraduationCap size={23} /></span><span className="sidebar-label"><b>GNDEC</b><small>TRAINING &amp; PLACEMENT</small></span></Link>
      <button className="sidebar-collapse" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
      <nav className="faculty-nav" aria-label="Faculty navigation">
        <span className="nav-section sidebar-label">OVERVIEW</span><Link title="Overview" className={linkClass("/faculty/dashboard")} href="/faculty/dashboard" onClick={closeMobile}><LayoutDashboard size={18} /><span className="sidebar-label">Dashboard</span></Link>
        <span className="nav-section sidebar-label">STUDENT MANAGEMENT</span>
        <Link title="All Students" className={linkClass("/faculty/students")} href="/faculty/students" onClick={closeMobile}><Users size={18} /><span className="sidebar-label">All Students</span></Link>
        <Link title="Add Student" className={linkClass("/faculty/students/new")} href="/faculty/students/new" onClick={closeMobile}><UserPlus size={18} /><span className="sidebar-label">Add Student</span></Link>
        <Link title="Import Students" className={linkClass("/faculty/students/import")} href="/faculty/students/import" onClick={closeMobile}><Upload size={18} /><span className="sidebar-label">Import Students</span></Link>
        <span className="nav-section sidebar-label">TRAINING PROGRAMS</span>
        {trainings.map((code) => <details className="training-nav-group" key={code} open={activeTraining === code}>
          <summary title={code} className={`faculty-nav-link${activeTraining === code ? " active" : ""}`}><BookOpenCheck size={18} /><span className="sidebar-label">{code}</span><ChevronDown className="training-chevron sidebar-label" size={14} /></summary>
          <div className="training-subnav"><Link href={`/faculty/trainings/${code}`} onClick={closeMobile}>Overview</Link><Link href={`/faculty/trainings/${code}/students`} onClick={closeMobile}>Students</Link><Link href={`/faculty/trainings/${code}/reports`} onClick={closeMobile}>Reports</Link><Link href={`/faculty/trainings/${code}/analytics`} onClick={closeMobile}>Analytics</Link></div>
        </details>)}
        <span className="nav-section sidebar-label">OTHER</span>
        <Link title="Notifications" className={linkClass("/faculty/notifications")} href="/faculty/notifications" onClick={closeMobile}><Bell size={18} /><span className="sidebar-label">Notifications</span></Link>
        <Link title="Reports & Exports" className={linkClass("/faculty/reports")} href="/faculty/reports" onClick={closeMobile}><FileBarChart2 size={18} /><span className="sidebar-label">Reports &amp; Exports</span></Link>
        <Link title="Settings" className={linkClass("/faculty/settings")} href="/faculty/settings" onClick={closeMobile}><Settings2 size={18} /><span className="sidebar-label">Settings</span></Link>
      </nav>
      <div className="sidebar-footer"><Activity size={16} /><span className="sidebar-label">Secure faculty workspace</span></div>
    </aside>
  </>;
}
