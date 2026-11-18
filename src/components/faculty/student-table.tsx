"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import type { StudentTableRow } from "@/lib/faculty/student-query";

type Row = StudentTableRow & { trainingLabels?: string[] };
const helper = createColumnHelper<Row>();
const baseColumns = [
  helper.accessor("rollNumber", { header: "University Roll Number", cell: (info) => <Link href={`/faculty/students/${info.row.original.id}`}>{info.getValue()}</Link> }),
  helper.accessor("fullName", { header: "Student Name" }), helper.accessor("department", { header: "Department" }),
  helper.accessor("semester", { header: "Semester" }), helper.accessor("cgpa", { header: "CGPA", cell: (info) => info.getValue() ?? "—" }),
  helper.accessor("email", { header: "Email", cell: (info) => info.getValue() || "—" }),
  helper.accessor("submitted", { header: "Reports Submitted" }), helper.accessor("approved", { header: "Approved" }),
  helper.accessor("pending", { header: "Pending" }), helper.accessor("status", { header: "Training Status", cell: (info) => <span className={`status-pill${info.getValue() === "ACTIVE" ? " active" : ""}`}>{info.getValue()}</span> }),
  helper.display({ id: "training", header: "Training", cell: (info) => info.row.original.trainingLabels?.join(", ") || "—" }),
  helper.display({
    id: "actions",
    header: "Mirror View",
    cell: (info) => (
      <Link
        href={`/faculty/students/${info.row.original.id}/preview`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 11px",
          borderRadius: "20px",
          background: "rgba(37, 99, 235, 0.12)",
          color: "#1d4ed8",
          fontWeight: 700,
          fontSize: "12px",
          textDecoration: "none",
          border: "1px solid rgba(37, 99, 235, 0.25)",
          whiteSpace: "nowrap",
        }}
      >
        👁️ View as Student
      </Link>
    ),
  }),
] as ColumnDef<Row>[];

export function StudentTable({ data, total, page, pageSize, query, code, departments, hideTraining = false }: { data: Row[]; total: number; page: number; pageSize: number; query: Record<string, string | undefined>; code?: string; departments: string[]; hideTraining?: boolean }) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ training: !hideTraining });
  const columns = useMemo(() => hideTraining ? baseColumns.filter((column) => (column as { id?: string }).id !== "training") : baseColumns, [hideTraining]);
  // TanStack's table instance is intentionally used imperatively for dynamic columns.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { columnVisibility }, onColumnVisibilityChange: setColumnVisibility, getCoreRowModel: getCoreRowModel() });
  const router = useRouter();
  const basePath = code ? `/faculty/trainings/${code}/students` : "/faculty/students";
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function href(targetPage: number) { const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); }); params.set("page", String(targetPage)); return `${basePath}?${params.toString()}`; }
  return <section className="data-panel"><div className="data-toolbar"><form action={basePath} method="get"><input type="search" name="q" defaultValue={query.q} placeholder="Search name, roll number, email" /><select name="department" defaultValue={query.department ?? ""}><option value="">All departments</option>{departments.map((department) => <option key={department}>{department}</option>)}</select><input name="minCgpa" type="number" min="0" max="10" step="0.01" defaultValue={query.minCgpa} placeholder="Min CGPA" /><input name="maxCgpa" type="number" min="0" max="10" step="0.01" defaultValue={query.maxCgpa} placeholder="Max CGPA" /><select name="status" defaultValue={query.status ?? "ACTIVE"}>{(hideTraining ? ["ACTIVE", "INACTIVE", "GRADUATED"] : ["ACTIVE", "COMPLETED", "WITHDRAWN"]).map((status) => <option key={status} value={status}>{status}</option>)}</select><button className="faculty-button primary" type="submit">Filter</button></form><details className="column-picker"><summary>Columns ▾</summary><div className="column-picker-menu">{table.getAllLeafColumns().map((column) => <label key={column.id}><input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />{String(column.columnDef.header ?? column.id)}</label>)}</div></details></div>
    <div className="table-scroll"><table className="faculty-table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => { const sortable = header.column.getCanSort() && ["rollNumber", "fullName", "department", "semester", "cgpa"].includes(header.column.id); const active = query.sort === header.column.id; const nextDirection = active && query.direction !== "desc" ? "desc" : "asc"; return <th key={header.id}>{header.isPlaceholder ? null : sortable ? <button className="sort-button" onClick={() => { const params = new URLSearchParams(window.location.search); params.set("sort", header.column.id); params.set("direction", nextDirection); params.delete("page"); router.push(`${basePath}?${params.toString()}`); }}>{flexRender(header.column.columnDef.header, header.getContext())}{active ? (query.direction === "desc" ? " ↓" : " ↑") : " ↕"}</button> : flexRender(header.column.columnDef.header, header.getContext())}</th>; })}</tr>)}</thead><tbody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={table.getVisibleLeafColumns().length}><div className="empty-inline">No students match these filters.</div></td></tr>}</tbody></table></div>
    <footer className="table-footer"><span>{total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : "No students"}</span><div className="pagination-links">{page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}<span>Page {page} of {pages}</span>{page < pages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}</div></footer>
  </section>;
}
