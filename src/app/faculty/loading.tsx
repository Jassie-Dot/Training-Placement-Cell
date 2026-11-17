export default function FacultyLoading() {
  return <main className="faculty-content" aria-label="Loading faculty page"><div className="faculty-skeleton-heading" /><div className="faculty-grid stat-grid">{Array.from({ length: 6 }, (_, i) => <div className="faculty-skeleton-card" key={i} />)}</div><div className="faculty-skeleton-panel" /></main>;
}
