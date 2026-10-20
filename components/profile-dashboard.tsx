"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Bell, BookOpen, Heart, KeyRound, LogOut, MessageCircle, Settings, Star, UserRound } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { setupMessage } from "@/lib/recipes";
import { ThemeToggle } from "@/components/theme-toggle";

type Panel = "details" | "notifications" | "preferences";
type Activity = { id: string; kind: "comment" | "rating"; who: string; recipeId: string; recipeTitle: string; text: string; at: string };
const panels: { id: Panel; label: string; icon: typeof UserRound }[] = [{ id: "details", label: "Personal details", icon: UserRound }, { id: "notifications", label: "Notifications", icon: Bell }, { id: "preferences", label: "Preferences", icon: Settings }];
const noopSubscribe = () => () => {};
type ActivityRow = { id: string; created_at: string; recipe_id: string; user_id: string; body?: string; rating?: number; profiles: { full_name: string } | null; recipes: { title: string } | null };

/** Latest comments and ratings other people left on the user's own recipes. */
async function loadActivity(userId: string): Promise<Activity[]> {
  const supabase = createClient();
  const { data: mine } = await supabase.from("recipes").select("id").eq("author_id", userId);
  const recipeIds = (mine ?? []).map((row) => row.id as string);
  if (!recipeIds.length) return [];
  const [comments, ratings] = await Promise.all([
    supabase.from("comments").select("id, created_at, recipe_id, user_id, body, profiles(full_name), recipes(title)").in("recipe_id", recipeIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("ratings").select("id, created_at, recipe_id, user_id, rating, profiles(full_name), recipes(title)").in("recipe_id", recipeIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  const toActivity = (kind: Activity["kind"]) => (row: ActivityRow): Activity => ({ id: `${kind}-${row.id}`, kind, who: row.profiles?.full_name ?? "Someone", recipeId: row.recipe_id, recipeTitle: row.recipes?.title ?? "your recipe", text: kind === "comment" ? `“${row.body}”` : `${row.rating}★`, at: row.created_at });
  return [...((comments.data ?? []) as unknown as ActivityRow[]).map(toActivity("comment")), ...((ratings.data ?? []) as unknown as ActivityRow[]).map(toActivity("rating"))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
}

export function ProfileDashboard() {
  const [user, setUser] = useState<User>();
  const [name, setName] = useState("Rasoi friend");
  const [stats, setStats] = useState({ recipes: 0, saved: 0, ratings: 0 });
  const [activity, setActivity] = useState<Activity[]>();
  const [panel, setPanel] = useState<Panel>();
  const [status, setStatus] = useState<{ text: string; ok?: boolean }>();
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const passwordUpdated = useSyncExternalStore(noopSubscribe, () => new URLSearchParams(window.location.search).get("notice") === "password-updated", () => false);
  const shownStatus = status ?? (passwordUpdated ? { text: "Password updated. Use your new password next time you log in.", ok: true } : undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const current = data.user; if (!current) return;
      setUser(current);
      setName(current.user_metadata?.full_name || current.user_metadata?.name || "Rasoi friend");
      const count = (table: string, column: string) => supabase.from(table).select("id", { count: "exact", head: true }).eq(column, current.id).then(({ count }) => count ?? 0);
      const [profile, recipes, saved, ratings] = await Promise.all([supabase.from("profiles").select("full_name").eq("id", current.id).maybeSingle(), count("recipes", "author_id"), count("favourites", "user_id"), count("ratings", "user_id")]);
      if (profile.data?.full_name) setName(profile.data.full_name);
      setStats({ recipes, saved, ratings });
    });
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if (!user) return;
    if (name.trim().length < 2) { setStatus({ text: "Please enter a display name." }); return; }
    setSaving(true); setStatus(undefined);
    const supabase = createClient();
    const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, full_name: name.trim() });
    setSaving(false);
    if (metaError) setStatus({ text: metaError.message });
    else if (profileError) setStatus({ text: profileError.code === "PGRST205" ? `Saved to your account. ${setupMessage}` : profileError.message });
    else { setStatus({ text: "Profile saved.", ok: true }); router.refresh(); }
  }
  function openPanel(id: Panel) {
    setPanel((current) => current === id ? undefined : id);
    if (id === "notifications" && user && !activity) loadActivity(user.id).then(setActivity, () => setActivity([]));
  }
  async function logout() { if (hasSupabaseEnv) await createClient().auth.signOut(); router.push("/login"); router.refresh(); }

  const provider = user?.app_metadata?.provider === "google" ? "Google" : "Email & password";
  const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-12"><div className="overflow-hidden rounded-[2rem] bg-[#080808] p-7 text-white sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[#ff920d] bg-[#262626] text-3xl font-bold text-[#ff920d]">{(name.trim() || "R").charAt(0).toUpperCase()}</div><div><p className="text-sm font-bold uppercase tracking-[.18em] text-[#ff920d]">Your Rasoi identity</p><h1 className="mt-2 font-serif text-4xl font-bold">{name || "Rasoi friend"}</h1><p className="mt-2 text-sm text-[#aaa]">{user?.email ?? "Recipe lover"} · Community member</p></div></div></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Link href="/my-recipes" className="rounded-2xl border border-[#eadfd2] bg-white p-5 hover:border-[#ff920d]"><BookOpen className="text-[#c8501e]" size={20} /><strong className="mt-3 block font-serif text-3xl text-[#39241b]">{stats.recipes}</strong><span className="text-sm text-[#927b6d]">Recipes shared</span></Link><Link href="/saved" className="rounded-2xl border border-[#eadfd2] bg-white p-5 hover:border-[#ff920d]"><Heart className="text-[#c8501e]" size={20} /><strong className="mt-3 block font-serif text-3xl text-[#39241b]">{stats.saved}</strong><span className="text-sm text-[#927b6d]">Recipes saved</span></Link><Link href="/" className="rounded-2xl border border-[#eadfd2] bg-white p-5 hover:border-[#ff920d]"><Star className="text-[#bc7415]" size={20} /><strong className="mt-3 block font-serif text-3xl text-[#39241b]">{stats.ratings}</strong><span className="text-sm text-[#927b6d]">Ratings given</span></Link></div>
    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]"><form onSubmit={saveProfile} className="rounded-2xl border border-[#eadfd2] bg-white p-6"><h2 className="font-serif text-2xl font-bold text-[#39241b]">Profile settings</h2><label className="mt-5 grid gap-2 text-sm font-bold text-[#765f51]">Display name<input ref={nameInput} required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className="field" /></label><p className="mt-2 text-xs text-[#a99587]">This name appears on recipes and comments you share.</p>{shownStatus && <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${shownStatus.ok ? "bg-[#edf8ee] text-[#2f7b4e]" : "bg-[#fff0e8] text-[#b33f20]"}`}>{shownStatus.text}</p>}<button disabled={saving || !user} className="mt-6 rounded-xl bg-[#ff920d] px-5 py-3 text-sm font-bold text-black disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button></form>
      <div className="rounded-2xl border border-[#eadfd2] bg-[#fff4df] p-6"><h2 className="font-serif text-2xl font-bold text-[#39241b]">Account centre</h2><div className="mt-5 grid gap-3 text-sm font-semibold text-[#765f51]">{panels.map(({ id, label, icon: Icon }) => <div key={id}><button type="button" aria-expanded={panel === id} onClick={() => openPanel(id)} className={`flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ${panel === id ? "ring-2 ring-[#ff920d]" : ""}`}><Icon size={17} /> {label}</button>{panel === id && <div className="mt-2 rounded-xl bg-white p-4 text-sm font-normal">
        {id === "details" && <dl className="grid gap-2"><div><dt className="text-xs uppercase tracking-wider text-[#a99587]">Email</dt><dd className="text-[#39241b]">{user?.email ?? "—"}</dd></div><div><dt className="text-xs uppercase tracking-wider text-[#a99587]">Signed in with</dt><dd className="text-[#39241b]">{provider}</dd></div><div><dt className="text-xs uppercase tracking-wider text-[#a99587]">Member since</dt><dd className="text-[#39241b]">{user ? dateLabel(user.created_at) : "—"}</dd></div><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => nameInput.current?.focus()} className="rounded-lg border border-[#eadfd2] px-3 py-2 text-xs font-bold text-[#39241b]">Edit name</button><Link href="/reset-password" className="inline-flex items-center gap-1.5 rounded-lg border border-[#eadfd2] px-3 py-2 text-xs font-bold text-[#39241b]"><KeyRound size={13} /> Change password</Link></div></dl>}
        {id === "notifications" && (activity === undefined ? <p className="text-[#a99587]">Loading activity...</p> : activity.length ? <ul className="grid gap-3">{activity.map((item) => <li key={item.id}><Link href={`/recipe/${item.recipeId}`} className="flex gap-2 text-[#765f51] hover:text-[#c8501e]">{item.kind === "comment" ? <MessageCircle size={15} className="mt-0.5 shrink-0" /> : <Star size={15} className="mt-0.5 shrink-0" />}<span><b className="text-[#39241b]">{item.who}</b> {item.kind === "comment" ? "commented on" : "rated"} <b className="text-[#39241b]">{item.recipeTitle}</b>: {item.text}<span className="block text-xs text-[#a99587]">{dateLabel(item.at)}</span></span></Link></li>)}</ul> : <p className="text-[#a99587]">No activity yet. When someone rates or comments on a recipe you shared, it shows up here.</p>)}
        {id === "preferences" && <div className="flex items-center justify-between gap-3 text-[#765f51]"><span>Appearance</span><ThemeToggle withLabel className="flex items-center gap-2 rounded-lg border border-[#eadfd2] px-3 py-2 text-xs font-bold" /></div>}
      </div>}</div>)}<button type="button" onClick={logout} className="flex items-center gap-3 rounded-xl bg-white p-3 text-left text-[#b33f20]"><LogOut size={17} /> Log out</button></div></div></section></main>;
}
