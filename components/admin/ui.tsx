"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { RecipeStatus } from "@/lib/types";

export const btn = {
  primary: "inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#c8501e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a9411a] disabled:opacity-50",
  approve: "inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2f7b4e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#256540] disabled:opacity-50",
  ghost: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#eadfd2] bg-white px-4 py-2.5 text-sm font-bold text-[#39241b] hover:border-[#ff920d] disabled:opacity-50",
  danger: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#f0c2b2] bg-white px-4 py-2.5 text-sm font-bold text-[#b33f20] hover:bg-[#fff0e8] disabled:opacity-50",
};

export function PageHeader({ title, subtitle, onRefresh, children }: { title: string; subtitle?: string; onRefresh?: () => void; children?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
    <div className="min-w-0"><h1 className="font-serif text-3xl font-bold text-[#39241b] sm:text-4xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-[#927b6d]">{subtitle}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}{onRefresh && <button type="button" onClick={onRefresh} aria-label="Refresh" title="Refresh" className="grid h-10 w-10 place-items-center rounded-xl border border-[#eadfd2] bg-white text-[#765f51] hover:text-[#c8501e]"><RefreshCw size={16} /></button>}</div>
  </div>;
}

export function StatTile({ label, value, hint, tone = "default", href }: { label: string; value: number | string; hint?: string; tone?: "default" | "warn" | "good" | "bad"; href?: string }) {
  const accent = { default: "text-[#39241b]", warn: "text-[#b96100]", good: "text-[#2f7b4e]", bad: "text-[#b33f20]" }[tone];
  const body = <><p className="text-xs font-bold uppercase tracking-wider text-[#a99587]">{label}</p><p className={`mt-1 font-serif text-3xl font-bold ${accent}`}>{value}</p>{hint && <p className="mt-0.5 text-xs text-[#927b6d]">{hint}</p>}</>;
  const cls = "block rounded-2xl border border-[#eadfd2] bg-white p-4";
  return href ? <Link href={href} className={`${cls} hover:border-[#ff920d]`}>{body}</Link> : <div className={cls}>{body}</div>;
}

const statusStyle: Record<RecipeStatus, string> = { approved: "bg-[#edf8ee] text-[#2f7b4e]", pending: "bg-[#fff4df] text-[#8a5a00]", rejected: "bg-[#fff0e8] text-[#b33f20]" };
export function StatusBadge({ status }: { status: RecipeStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${statusStyle[status]}`}>{status}</span>;
}

export function RoleBadge({ role, banned }: { role: "user" | "admin" | "owner"; banned?: boolean }) {
  if (banned) return <span className="inline-flex rounded-full bg-[#fff0e8] px-2.5 py-0.5 text-xs font-bold text-[#b33f20]">Banned</span>;
  if (role === "user") return null;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${role === "owner" ? "bg-[#39241b] text-white" : "bg-[#ff920d] text-black"}`}>{role === "owner" ? "Owner" : "Admin"}</span>;
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p role="alert" className="mb-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{message}</p> : null;
}

export function Toast({ message }: { message: string }) {
  return message ? <p role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-[#39241b] px-4 py-3 text-center text-sm font-semibold text-white shadow-xl md:bottom-6">{message}</p> : null;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#d8c5b4] px-4 py-14 text-center text-sm text-[#927b6d]">{children}</div>;
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return <p className="py-14 text-center text-sm text-[#927b6d]">{label}</p>;
}

/** A list filter kept in the URL (?show=...), so dashboard tiles can link straight to e.g. the admins or the rejected recipes. */
export function useUrlFilter<T extends string>(allowed: readonly T[], fallback: T): [T, (value: T) => void] {
  const params = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const show = params.get("show") as T | null;
  const value = show && allowed.includes(show) ? show : fallback;
  return [value, (next) => router.replace(next === fallback ? pathname : `${pathname}?show=${next}`, { scroll: false })];
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void }) {
  return <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${value === option.value ? "bg-[#39241b] text-white" : "bg-[#f3e6d6] text-[#765f51]"}`}>{option.label}{option.count !== undefined && <span className="ml-1.5 opacity-70">{option.count}</span>}</button>)}</div>;
}

const quickReasons = ["Photo is missing or unclear", "Ingredients or steps are incomplete", "Not a recipe / spam", "Duplicate of an existing recipe", "Inappropriate content"];

/** Inline "why?" form used for rejecting recipes and banning users; the reason is shown to the user. */
export function ReasonForm({ label, confirmLabel, suggestions = quickReasons, onSubmit, onCancel }: { label: string; confirmLabel: string; suggestions?: string[]; onSubmit: (reason: string) => Promise<void>; onCancel: () => void }) {
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  return <form onSubmit={async (event) => { event.preventDefault(); if (!reason.trim()) return; setBusy(true); try { await onSubmit(reason.trim()); } finally { setBusy(false); } }} className="mt-3 grid gap-3 rounded-xl border border-[#f0c2b2] bg-[#fffaf7] p-3">
    <label className="grid gap-2 text-sm font-bold text-[#765f51]">{label}<textarea required autoFocus rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="field resize-y" placeholder="This is shown to the user" /></label>
    {suggestions.length > 0 && <div className="flex flex-wrap gap-1.5">{suggestions.map((item) => <button key={item} type="button" onClick={() => setReason(item)} className="rounded-full border border-[#eadfd2] bg-white px-3 py-1 text-xs text-[#765f51] hover:border-[#c8501e]">{item}</button>)}</div>}
    <div className="flex gap-2"><button disabled={busy || !reason.trim()} className={btn.primary}>{busy ? "Saving..." : confirmLabel}</button><button type="button" onClick={onCancel} className={btn.ghost}>Cancel</button></div>
  </form>;
}

/** Small helper: run an admin action, surface its error, and flash a confirmation. */
export function useAction() {
  const [error, setError] = useState(""); const [toast, setToast] = useState(""); const [busyId, setBusyId] = useState<string>();
  async function run(id: string, action: () => Promise<unknown>, success: string) {
    setError(""); setBusyId(id);
    try { await action(); setToast(success); setTimeout(() => setToast(""), 2500); return true; }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); return false; }
    finally { setBusyId(undefined); }
  }
  return { error, toast, busyId, run, setError };
}
