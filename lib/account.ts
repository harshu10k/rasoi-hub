"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

export type Role = "user" | "admin" | "owner";
type Account = { loaded: boolean; role: Role; isBanned: boolean; announcement: string };

// Loaded once per page load and shared by every component (header, profile, admin links).
let account: Account = { loaded: false, role: "user", isBanned: false, announcement: "" };
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const initial = account;

function load() {
  loading ??= (async () => {
    const supabase = createClient();
    const [{ data: auth }, { data: settings }] = await Promise.all([supabase.auth.getUser(), supabase.from("site_settings").select("key, value")]);
    const announcement = settings?.find((row) => row.key === "announcement")?.value;
    let role: Role = "user"; let isBanned = false;
    if (auth.user) {
      const { data } = await supabase.from("profiles").select("role, is_banned").eq("id", auth.user.id).maybeSingle();
      role = (data?.role as Role) ?? "user"; isBanned = Boolean(data?.is_banned);
    }
    account = { loaded: true, role, isBanned, announcement: typeof announcement === "string" ? announcement.trim() : "" };
    listeners.forEach((listener) => listener());
  })();
}

/** The signed-in user's role and ban status, plus the site-wide announcement set by admins. */
export function useAccount() {
  const snapshot = useSyncExternalStore(subscribe, () => account, () => initial);
  useEffect(load, []);
  return { ...snapshot, isAdmin: !snapshot.isBanned && (snapshot.role === "admin" || snapshot.role === "owner") };
}
