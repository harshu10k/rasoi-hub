import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { loginPath } from "@/lib/safe-path";

/** Data Access Layer guard: returns the signed-in user's id or redirects to /login with a return path. */
export const requireUser = cache(async (next: string) => {
  if (!hasSupabaseEnv) redirect(loginPath(next));
  const supabase = await createClient();
  // getClaims verifies the JWT locally (asymmetric keys), so it doesn't repeat the middleware's Auth server round trip.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(loginPath(next));
  return { id: data.claims.sub };
});
