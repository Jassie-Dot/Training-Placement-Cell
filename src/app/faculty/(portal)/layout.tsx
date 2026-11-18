import type { ReactNode } from "react";
import { FacultySidebar } from "@/components/faculty/sidebar";
import { FacultyHeader } from "@/components/faculty/header";
import { requireRole } from "@/lib/auth/access";
import { getFacultyName } from "@/lib/faculty/dashboard-data";
import { connectMongo } from "@/lib/db/mongoose";
import { Notification } from "@/models/notification";
import "../faculty.css";

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const principal = await requireRole("TEACHER");
  await connectMongo();
  const [faculty, unreadCount, notices] = await Promise.all([
    getFacultyName(principal.userId),
    Notification.countDocuments({ recipient: principal.userId, channel: "IN_APP", readAt: null }),
    Notification.find({ recipient: principal.userId, channel: "IN_APP" }).sort({ createdAt: -1 }).limit(5).select("title body readAt createdAt").lean(),
  ]);
  return (
    <div className="faculty-frame">
      <FacultySidebar />
      <div className="faculty-main">
        <FacultyHeader
          facultyName={faculty?.fullName ?? "Administrator"}
          email={faculty?.email ?? ""}
          unreadCount={unreadCount}
          notifications={notices.map((notice) => ({
            id: notice._id.toString(),
            title: notice.title,
            body: notice.body,
            unread: !notice.readAt,
          }))}
        />
        {children}
      </div>
    </div>
  );
}
