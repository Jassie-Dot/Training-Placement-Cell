import type { ReactNode } from "react";

export function StatCard({ label, value, foot, icon }: { label: string; value: number | string; foot: string; icon: ReactNode }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>;
}
