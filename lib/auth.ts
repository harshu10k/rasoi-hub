import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { loginPath } from "@/lib/safe-path";

/** Data Access Layer guard: returns the signed-in user's id or redirects to /login with a return path. */
export const requireUser = cache(async (next: string) => {
  if (!hasSupabaseEnv) redirect(loginPath(next));
  // getClaims checks token expiry against Date.now(), so this must run at request time, not in a (runtime) prerender.
  await connection();
  const supabase = await createClient();
  // getClaims verifies the JWT locally (asymmetric keys), so it doesn't repeat the middleware's Auth server round trip.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(loginPath(next));
  return { id: data.claims.sub };
});

/** Admin-only guard: signed-out visitors go to login; signed-in non-admins get a plain 404 so the portal stays unadvertised. */
export const requireAdmin = cache(async (next: string) => {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role, is_banned").eq("id", user.id).maybeSingle();
  if (!data || data.is_banned || (data.role !== "admin" && data.role !== "owner")) notFound();
  return { id: user.id, role: data.role as "admin" | "owner" };
});
