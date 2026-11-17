import { Clock3, FileCheck2, FilePlus2, UserRoundPlus } from "lucide-react";

function describe(action: string, entityType: string) {
  const normalized = `${action} ${entityType}`.toLowerCase();
  if (normalized.includes("student") && normalized.includes("creat")) return { text: "Student record added", icon: <UserRoundPlus size={15} /> };
  if (normalized.includes("approv")) return { text: "Report approved", icon: <FileCheck2 size={15} /> };
  if (normalized.includes("reject")) return { text: "Report rejected", icon: <FileCheck2 size={15} /> };
  return { text: "Report submitted", icon: <FilePlus2 size={15} /> };
}
export function RecentActivity({ items }: { items: { id: string; action: string; entityType: string; occurredAt: string }[] }) {
  return <div className="activity-list">{items.length ? items.map((item) => { const details = describe(item.action, item.entityType); return <div className="activity-row" key={item.id}><span className="activity-dot">{details.icon}</span><div><b>{details.text}</b><small><Clock3 size={11} style={{ verticalAlign: "-2px" }} /> {new Date(item.occurredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</small></div></div>; }) : <div className="empty-inline">No recent activity recorded.</div>}</div>;
}
