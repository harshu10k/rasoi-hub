"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ChevronDown, ShieldCheck, ShieldOff, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "@/lib/account";
import { adminRpc, formatDate, setBan, setRole, timeAgo, type AdminUser } from "@/lib/admin";
import { Empty, ErrorBox, Loading, PageHeader, ReasonForm, RoleBadge, StatusBadge, Tabs, Toast, btn, useAction, useUrlFilter } from "@/components/admin/ui";
import type { RecipeStatus } from "@/lib/types";

const filters = ["all", "active", "cooks", "admins", "banned", "unconfirmed"] as const;
const isActive = (user: AdminUser) => !!user.last_sign_in_at && Date.now() - new Date(user.last_sign_in_at).getTime() < 7 * 86_400_000;

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(); const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useUrlFilter(filters, "all"); const [query, setQuery] = useState(""); const [me, setMe] = useState<string>();
  const { role: myRole } = useAccount();
  const { error, toast, busyId, run } = useAction();
  const load = useCallback(async () => {
    try { setUsers(await adminRpc<AdminUser[]>("admin_list_users")); setLoadError(""); } catch (err) { setLoadError(err instanceof Error ? err.message : "Could not load users."); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); createClient().auth.getUser().then(({ data }) => setMe(data.user?.id)); }, [load]);

  const counts = useMemo(() => { const list = users ?? []; return { all: list.length, active: list.filter(isActive).length, cooks: list.filter((u) => u.recipes > 0).length, admins: list.filter((u) => u.role !== "user").length, banned: list.filter((u) => u.is_banned).length, unconfirmed: list.filter((u) => !u.email_confirmed).length }; }, [users]);
  const shown = (users ?? []).filter((user) => ({ all: true, active: isActive(user), cooks: user.recipes > 0, admins: user.role !== "user", banned: user.is_banned, unconfirmed: !user.email_confirmed })[filter]
    && `${user.name ?? ""} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  const patch = (id: string, changes: Partial<AdminUser>) => setUsers((list) => list?.map((item) => item.id === id ? { ...item, ...changes } : item));

  return <>
    <PageHeader title="Users" subtitle="Everyone who has signed up, what they've shared, and who can manage the site." onRefresh={load} />
    <ErrorBox message={error || loadError} />
    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email..." className="field mb-3" />
    <Tabs value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: counts.all }, { value: "active", label: "Active this week", count: counts.active }, { value: "cooks", label: "Shared recipes", count: counts.cooks }, { value: "admins", label: "Admins", count: counts.admins }, { value: "banned", label: "Banned", count: counts.banned }, { value: "unconfirmed", label: "Email not confirmed", count: counts.unconfirmed }]} />
    {!users ? <Loading /> : shown.length === 0 ? <Empty>No users match.</Empty> :
      <div className="grid gap-3">{shown.map((user) => <UserCard key={user.id} user={user} isMe={user.id === me} iAmOwner={myRole === "owner"} busy={busyId === user.id}
        onRole={async (role) => { if (await run(user.id, () => setRole(user.id, role), role === "admin" ? `${user.name ?? user.email} is now an admin` : "Admin rights removed")) patch(user.id, { role }); }}
        onBan={async (reason) => { if (await run(user.id, () => setBan(user.id, true, reason), "User banned")) patch(user.id, { is_banned: true, banned_reason: reason }); }}
        onUnban={async () => { if (await run(user.id, () => setBan(user.id, false), "User unbanned")) patch(user.id, { is_banned: false, banned_reason: null }); }} />)}</div>}
    <Toast message={toast} />
  </>;
}

function UserCard({ user, isMe, iAmOwner, busy, onRole, onBan, onUnban }: { user: AdminUser; isMe: boolean; iAmOwner: boolean; busy: boolean; onRole: (role: "user" | "admin") => void; onBan: (reason: string) => Promise<void>; onUnban: () => void }) {
  const [open, setOpen] = useState(false); const [banning, setBanning] = useState(false);
  const name = user.name || "Unnamed";
  return <article className="rounded-2xl border border-[#eadfd2] bg-white">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff0e8] font-bold text-[#c8501e]">{name.charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><b className="truncate text-[#39241b]">{name}</b>{isMe && <span className="text-xs text-[#a99587]">(you)</span>}<RoleBadge role={user.role} banned={user.is_banned} /></span><span className="block truncate text-sm text-[#927b6d]">{user.email}</span><span className="block text-xs text-[#a99587]">{user.recipes} recipe{user.recipes === 1 ? "" : "s"} ({user.approved} live{user.pending ? `, ${user.pending} pending` : ""}) · {user.comments} comments · last seen {timeAgo(user.last_sign_in_at)}</span></span>
      <ChevronDown size={18} className={`shrink-0 text-[#a99587] transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="border-t border-[#f1e7dc] p-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Info label="Joined" value={formatDate(user.created_at)} /><Info label="Signed up with" value={user.signed_up_with === "google" ? "Google" : "Email"} />
        <Info label="Email confirmed" value={user.email_confirmed ? "Yes" : "Not yet"} /><Info label="Ratings given" value={String(user.ratings)} />
      </dl>
      {user.is_banned && user.banned_reason && <p className="mt-3 rounded-xl bg-[#fff0e8] px-3 py-2 text-sm text-[#b33f20]">Banned: {user.banned_reason}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {user.role === "user" && !user.is_banned && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Make ${name} an admin? They will be able to approve recipes, manage users and change settings.`)) onRole("admin"); }} className={btn.ghost}><ShieldCheck size={16} />Make admin</button>}
        {user.role === "admin" && <button type="button" disabled={busy || !iAmOwner} title={iAmOwner ? undefined : "Only the owner can remove an admin"} onClick={() => { if (window.confirm(`Remove admin rights from ${name}?`)) onRole("user"); }} className={btn.ghost}><ShieldOff size={16} />Remove admin</button>}
        {user.role === "user" && !isMe && (user.is_banned ? <button type="button" disabled={busy} onClick={onUnban} className={btn.ghost}><UserCheck size={16} />Unban</button> : <button type="button" disabled={busy} onClick={() => setBanning(true)} className={btn.danger}><Ban size={16} />Ban</button>)}
        {user.role === "owner" && <p className="text-xs text-[#a99587]">The owner can&apos;t be demoted or banned.</p>}
      </div>
      {banning && <ReasonForm label={`Why are you banning ${name}?`} confirmLabel="Ban user" suggestions={["Spam", "Abusive comments", "Fake or copied recipes", "Repeated rule breaking"]} onCancel={() => setBanning(false)} onSubmit={async (reason) => { await onBan(reason); setBanning(false); }} />}
      <UserContent userId={user.id} />
    </div>}
  </article>;
}

const Info = ({ label, value }: { label: string; value: string }) => <div><dt className="text-xs uppercase tracking-wider text-[#a99587]">{label}</dt><dd className="font-semibold text-[#39241b]">{value}</dd></div>;

/** The user's recipes and latest comments, loaded when their card is opened. */
function UserContent({ userId }: { userId: string }) {
  const [data, setData] = useState<{ recipes: { id: string; title: string; status: RecipeStatus; created_at: string }[]; comments: { id: string; body: string; created_at: string; recipe_id: string }[] }>();
  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("recipes").select("id, title, status, created_at").eq("author_id", userId).order("created_at", { ascending: false }),
      supabase.from("comments").select("id, body, created_at, recipe_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]).then(([recipes, comments]) => setData({ recipes: (recipes.data ?? []) as never, comments: (comments.data ?? []) as never }));
  }, [userId]);
  if (!data) return <p className="mt-4 text-sm text-[#a99587]">Loading their activity...</p>;
  return <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <div><h4 className="text-sm font-bold text-[#39241b]">Recipes</h4>{data.recipes.length ? <ul className="mt-2 grid gap-1.5">{data.recipes.map((recipe) => <li key={recipe.id} className="flex items-center gap-2 text-sm"><StatusBadge status={recipe.status} /><Link href={`/recipe/${recipe.id}`} target="_blank" className="min-w-0 flex-1 truncate text-[#765f51] hover:text-[#c8501e]">{recipe.title}</Link></li>)}</ul> : <p className="mt-2 text-sm text-[#a99587]">None yet.</p>}</div>
    <div><h4 className="text-sm font-bold text-[#39241b]">Latest comments</h4>{data.comments.length ? <ul className="mt-2 grid gap-1.5">{data.comments.map((comment) => <li key={comment.id} className="text-sm text-[#765f51]">“{comment.body.slice(0, 120)}” <span className="text-xs text-[#a99587]">{timeAgo(comment.created_at)}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#a99587]">None yet.</p>}</div>
  </div>;
}
