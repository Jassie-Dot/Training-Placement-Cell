import { requireRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Notification } from "@/models/notification";
import { StudentWorkspaceShell } from "@/components/student/workspace-shell";
import { markStudentNotificationRead } from "./actions";
export default async function StudentNotificationsPage() { const principal = await requireRole("STUDENT"); await connectMongo(); const rows = await Notification.find({ recipient: principal.userId }).sort({ createdAt: -1 }).limit(100).lean();
  return <StudentWorkspaceShell active="Notifications"><h1>Notifications</h1><div className="student-sections">{rows.map((item) => <article className="student-section" key={item._id.toString()}><h2>{item.title}</h2><p>{item.body}</p><p className="student-muted">{item.createdAt.toLocaleString("en-IN")}{item.readAt ? " · Read" : " · New"}</p>{!item.readAt && <form action={markStudentNotificationRead}><input type="hidden" name="id" value={item._id.toString()} /><button>Mark as read</button></form>}</article>)}{!rows.length && <section className="student-section">You have no notifications.</section>}</div></StudentWorkspaceShell>;
}
