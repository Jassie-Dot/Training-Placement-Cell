"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = ["#3b82f6", "#f59e0b", "#16a34a", "#dc2626"];
export function TrainingDistributionChart({ data }: { data: { code: string; students: number }[] }) {
  if (!data.some((item) => item.students > 0)) return <div className="chart-empty">No enrollment data to display yet.</div>;
  return <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 4 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="code" tick={{ fontSize: 9, fill: "#738198" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#8995a4" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 7, border: "1px solid #e5eaf1", fontSize: 11 }} /><Bar dataKey="students" name="Enrolled students" fill="#4678ad" radius={[4, 4, 0, 0]} maxBarSize={46} /></BarChart></ResponsiveContainer></div>;
}

export function ReportStatusChart({ data }: { data: { status: string; count: number }[] }) {
  if (!data.some((item) => item.count > 0)) return <div className="chart-empty">No report submissions to display yet.</div>;
  return <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="status" innerRadius={54} outerRadius={82} paddingAngle={3} stroke="none">{data.map((item, index) => <Cell key={item.status} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 7, border: "1px solid #e5eaf1", fontSize: 11 }} /><text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#142b4a" fontSize="20" fontWeight="700">{data.reduce((sum, item) => sum + item.count, 0)}</text><text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" fill="#8491a2" fontSize="9">reports</text></PieChart></ResponsiveContainer><div className="chart-legend">{data.map((item, index) => <span key={item.status}><i style={{ backgroundColor: colors[index % colors.length] }} />{item.status} <b>{item.count}</b></span>)}</div></div>;
}
