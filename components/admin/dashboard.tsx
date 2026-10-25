"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adminRpc, describeAction, timeAgo, type AdminAction, type AdminStats } from "@/lib/admin";
import { ErrorBox, Loading, PageHeader, StatTile } from "@/components/admin/ui";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>(); const [recent, setRecent] = useState<AdminAction[]>([]); const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [data, log] = await Promise.all([adminRpc<AdminStats>("admin_stats"), createClient().from("admin_actions").select("id, action, target_type, target_id, details, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(6)]);
      setStats(data); setRecent((log.data ?? []) as unknown as AdminAction[]); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the dashboard."); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); }, [load]);

  if (!stats) return <><PageHeader title="Dashboard" /><ErrorBox message={error} />{!error && <Loading />}</>;
  return <>
    <PageHeader title="Dashboard" subtitle="Everything happening on Rasoi Hub, live." onRefresh={load} />
    <ErrorBox message={error} />
    {stats.pending > 0 && <Link href="/admin/requests" className="mb-5 flex items-center gap-3 rounded-2xl border border-[#f3d9a4] bg-[#fff8e6] p-4 text-[#8a5a00] hover:border-[#ff920d]"><ClipboardCheck size={22} className="shrink-0" /><span className="min-w-0 flex-1"><b>{stats.pending} recipe{stats.pending === 1 ? "" : "s"} waiting for review.</b> They stay hidden until you approve them.</span><ArrowRight size={18} className="shrink-0" /></Link>}
    <section aria-label="Users" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Users" value={stats.users} hint={`+${stats.new_users_7d} this week`} href="/admin/users" />
      <StatTile label="Active (7 days)" value={stats.active_users_7d} hint="logged in this week" tone="good" />
      <StatTile label="Admins" value={stats.admins} />
      <StatTile label="Banned" value={stats.banned} tone={stats.banned ? "bad" : "default"} />
    </section>
    <section aria-label="Recipes" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Live recipes" value={stats.approved} hint={`${stats.featured} featured`} tone="good" href="/admin/recipes" />
      <StatTile label="Pending" value={stats.pending} tone={stats.pending ? "warn" : "default"} href="/admin/requests" />
      <StatTile label="Rejected" value={stats.rejected} />
      <StatTile label="Comments" value={stats.comments} hint={`${stats.ratings} ratings · ${stats.favourites} saves`} href="/admin/comments" />
    </section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <SignupChart days={stats.signups_14d} />
      <section className="rounded-2xl border border-[#eadfd2] bg-white p-5">
        <h2 className="font-serif text-xl font-bold text-[#39241b]">Top cooks</h2>
        <p className="text-xs text-[#927b6d]">By live recipes</p>
        {stats.top_cooks.length ? <ol className="mt-4 grid gap-2">{stats.top_cooks.map((cook, index) => <li key={cook.id} className="flex items-center gap-3 text-sm"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fff0e8] text-xs font-bold text-[#c8501e]">{index + 1}</span><span className="min-w-0 flex-1 truncate font-semibold text-[#39241b]">{cook.name}</span><span className="text-[#927b6d]">{cook.recipes}</span></li>)}</ol> : <p className="mt-4 text-sm text-[#927b6d]">No live recipes yet.</p>}
      </section>
    </div>
    <section className="mt-5 rounded-2xl border border-[#eadfd2] bg-white p-5">
      <div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold text-[#39241b]">Recent admin activity</h2><Link href="/admin/activity" className="text-sm font-bold text-[#c8501e]">See all</Link></div>
      {recent.length ? <ul className="mt-3 divide-y divide-[#f1e7dc]">{recent.map((item) => <li key={item.id} className="py-2.5 text-sm text-[#765f51]"><b className="text-[#39241b]">{item.profiles?.full_name ?? "An admin"}</b> {describeAction(item)} <span className="text-xs text-[#a99587]">· {timeAgo(item.created_at)}</span></li>)}</ul> : <p className="mt-3 text-sm text-[#927b6d]">Nothing yet. Approvals, bans and other admin actions will appear here.</p>}
    </section>
  </>;
}

/** New signups per day for the last 14 days: one series, so one hue and no legend; hover shows the exact count. */
function SignupChart({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const label = (day: string) => new Date(day + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return <section className="rounded-2xl border border-[#eadfd2] bg-white p-5">
    <h2 className="font-serif text-xl font-bold text-[#39241b]">New signups</h2>
    <p className="text-xs text-[#927b6d]">Last 14 days · {total} total</p>
    <div className="mt-5 flex h-36 items-end gap-[2px] border-b border-[#eadfd2]" aria-hidden="true">
      {days.map((day) => <div key={day.day} className="group relative flex h-full flex-1 items-end" title={`${label(day.day)}: ${day.count} signup${day.count === 1 ? "" : "s"}`}>
        <div className="w-full rounded-t-[4px] bg-[#e07a3c] group-hover:bg-[#c8501e]" style={{ height: `${day.count ? Math.max(4, (day.count / max) * 100) : 0}%` }} />
        <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#39241b] px-2 py-0.5 text-[11px] text-white group-hover:block">{day.count}</span>
      </div>)}
    </div>
    <div className="mt-1.5 flex justify-between text-[11px] text-[#a99587]" aria-hidden="true"><span>{label(days[0]?.day ?? "")}</span><span>Today</span></div>
    <table className="sr-only"><caption>New signups per day</caption><tbody>{days.map((day) => <tr key={day.day}><th scope="row">{label(day.day)}</th><td>{day.count}</td></tr>)}</tbody></table>
  </section>;
}
