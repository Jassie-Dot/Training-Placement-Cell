import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Training & Placement | GNDEC Ludhiana",
  description:
    "Training programmes, guidance and placement support from Guru Nanak Dev Engineering College, Ludhiana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
