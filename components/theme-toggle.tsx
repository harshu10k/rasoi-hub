"use client";

import { Moon, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getTheme = (): Theme => document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch { /* Private mode: the theme still applies for this visit. */ }
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
}

export function ThemeToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return <button type="button" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)} className={className}>{theme === "dark" ? <SunMedium size={19} /> : <Moon size={19} />}{withLabel && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}</button>;
}
