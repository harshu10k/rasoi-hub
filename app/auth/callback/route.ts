import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-path";
import type { AuthErrorCode, AuthNoticeCode } from "@/lib/auth-messages";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  // Only message codes go into the URL (see lib/auth-messages.ts), never free text.
  const redirectTo = (path: string, param: "error" | "notice", messageCode: AuthErrorCode | AuthNoticeCode) => {
    const target = new URL(path, url.origin);
    target.searchParams.set(param, messageCode);
    if (path === "/login" && next !== "/") target.searchParams.set("next", next);
    return NextResponse.redirect(target);
  };
  const isReset = next === "/reset-password";
  // Google/Supabase report cancelled, failed or expired links as ?error=...&error_description=...
  if (url.searchParams.get("error")) return isReset ? redirectTo("/forgot-password", "error", "reset-link") : redirectTo("/login", "error", "cancelled");
  if (!code) return isReset ? redirectTo("/forgot-password", "error", "reset-link") : redirectTo("/login", "error", "missing-code");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // Supabase verifies the email before redirecting here, so a failed exchange usually means the link was opened in
    // another browser (no PKCE verifier cookie): the account is confirmed, the user just needs to log in.
    // A password-reset link needs that session though, so ask for a fresh link instead.
    return isReset ? redirectTo("/forgot-password", "error", "reset-link") : redirectTo("/login", "notice", "email-confirmed");
  }
  // Creates the profile if the signup trigger has not; never overwrites a name the user has since changed.
  await supabase.from("profiles").upsert({ id: data.user.id, full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Rasoi friend" }, { onConflict: "id", ignoreDuplicates: true });
  return NextResponse.redirect(new URL(next, url.origin));
}
