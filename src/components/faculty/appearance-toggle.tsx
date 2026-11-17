"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export function AppearanceToggle() {
  const dark = useSyncExternalStore((notify) => { window.addEventListener("storage", notify); window.addEventListener("faculty-appearance-change", notify); return () => { window.removeEventListener("storage", notify); window.removeEventListener("faculty-appearance-change", notify); }; }, () => localStorage.getItem("faculty-appearance") === "dark", () => false);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  function toggle() { const next = !dark; localStorage.setItem("faculty-appearance", next ? "dark" : "light"); document.documentElement.dataset.theme = next ? "dark" : "light"; window.dispatchEvent(new Event("faculty-appearance-change")); }
  return <button type="button" className="faculty-button" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} appearance`}>{dark ? <Sun size={14} /> : <Moon size={14} />}{dark ? "Dark" : "Light"}</button>;
}
