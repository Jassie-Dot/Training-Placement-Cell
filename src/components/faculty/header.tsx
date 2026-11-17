"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronDown, CircleUserRound, Search, Check, LogOut } from "lucide-react";
import { facultySignOut } from "@/app/faculty/actions";
import { markFacultyNotificationRead } from "@/app/faculty/notification-actions";
import { AppearanceToggle } from "@/components/faculty/appearance-toggle";

type Notice = { id: string; title: string; body: string; unread: boolean };
export function FacultyHeader({ facultyName, email, unreadCount, notifications }: { facultyName: string; email: string; unreadCount: number; notifications: Notice[] }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  function search(event: FormEvent) { event.preventDefault(); const value = query.trim(); if (value) router.push(`/faculty/search?q=${encodeURIComponent(value)}`); }
  return <header className="faculty-header"><div className="faculty-search"><Search size={17} /><form onSubmit={search}><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students or training…" aria-label="Search students or training" /><kbd>/</kbd></form></div><div className="faculty-header-actions">
    <details className="notification-menu"><summary aria-label={`Notifications, ${unreadCount} unread`}><Bell size={19} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}</summary><div className="notification-popover"><div className="notification-popover-head"><b>Notifications</b><Link href="/faculty/notifications">View all</Link></div>{notifications.length ? notifications.map((notice) => <div className={`notification-item${notice.unread ? " unread" : ""}`} key={notice.id}><div><b>{notice.title}</b><p>{notice.body}</p></div>{notice.unread && <form action={markFacultyNotificationRead.bind(null, notice.id)}><button aria-label="Mark as read"><Check size={15} /></button></form>}</div>) : <p className="notification-empty">No notifications yet.</p>}</div></details>
    <details className="faculty-profile-menu"><summary><span className="faculty-avatar"><CircleUserRound size={18} /></span><span className="faculty-profile-text"><b>{facultyName}</b><small>{email || "Faculty account"}</small></span><ChevronDown size={14} /></summary><div className="profile-popover"><Link href="/faculty/settings">Account settings</Link><form action={facultySignOut}><button><LogOut size={15} /> Sign out</button></form></div></details>
    <AppearanceToggle />
  </div></header>;
}
