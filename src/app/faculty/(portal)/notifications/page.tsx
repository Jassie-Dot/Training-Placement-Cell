import { requireRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Notification } from "@/models/notification";
import { markAllFacultyNotificationsRead, markFacultyNotificationRead } from "@/app/faculty/notification-actions";

export const dynamic = "force-dynamic";
export default async function FacultyNotificationsPage() {
  const principal = await requireRole("TEACHER");
  await connectMongo();
  const notifications = await Notification.find({ recipient: principal.userId, channel: "IN_APP" }).sort({ createdAt: -1 }).limit(100).select("title body type readAt createdAt").lean();
  const unread = notifications.filter((item) => !item.readAt).length;
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">FACULTY PORTAL</span><h1>Notifications</h1><p>{unread} unread · In-app notifications for your account.</p></div>{unread > 0 && <form action={markAllFacultyNotificationsRead}><button className="faculty-button">Mark all as read</button></form>}</div><section className="notification-list-page">{notifications.length ? notifications.map((item) => <article className={`notification-card${item.readAt ? "" : " unread"}`} key={item._id.toString()}><span className="notification-card-dot" /><div className="notification-card-body"><b>{item.title}</b><p>{item.body}</p><small>{item.type.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</small></div>{!item.readAt && <form action={markFacultyNotificationRead.bind(null, item._id.toString())}><button className="faculty-button">Mark read</button></form>}</article>) : <div className="faculty-panel empty-large">No notifications yet. New report and system notices will appear here.</div>}</section></main>;
}
