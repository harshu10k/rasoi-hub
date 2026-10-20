import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const fail = (message: string) => {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", message);
    if (next !== "/") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  };
  // Google/Supabase report cancelled or failed sign-ins as ?error=...&error_description=...
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (providerError) return fail(providerError);
  if (!code) return fail("Sign-in link is missing its code. Please try again.");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // Supabase verifies the email before redirecting here, so a failed exchange usually means the link was opened in
    // another browser (no PKCE verifier cookie): the account is confirmed, the user just needs to log in.
    // A password-reset link needs that session though, so ask for a fresh link instead.
    if (next === "/reset-password") {
      const forgotUrl = new URL("/forgot-password", url.origin);
      forgotUrl.searchParams.set("error", "That reset link has expired or was opened in a different browser. Request a new one below.");
      return NextResponse.redirect(forgotUrl);
    }
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("notice", "Your email is confirmed. Log in with your email and password.");
    if (next !== "/") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }
  // Creates the profile if the signup trigger has not; never overwrites a name the user has since changed.
  await supabase.from("profiles").upsert({ id: data.user.id, full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Rasoi friend" }, { onConflict: "id", ignoreDuplicates: true });
  return NextResponse.redirect(new URL(next, url.origin));
}
