import Link from "next/link";

export function TrainingSubnav({ code, section }: { code: string; section: string }) {
  const links = [{ label: "Overview", path: `/faculty/trainings/${code}` }, { label: "Students", path: `/faculty/trainings/${code}/students` }, { label: "Reports", path: `/faculty/trainings/${code}/reports` }, { label: "Periods", path: `/faculty/trainings/${code}/periods` }, { label: "Analytics", path: `/faculty/trainings/${code}/analytics` }];
  return <nav className="training-tabs" aria-label={`${code} sections`}>{links.map((link) => <Link className={section === link.label.toLowerCase() ? "selected" : ""} key={link.path} href={link.path}>{link.label}</Link>)}</nav>;
}
