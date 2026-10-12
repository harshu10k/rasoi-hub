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
  if (error || !data.user) return fail(error?.message || "Could not complete sign-in. Please try again.");
  await supabase.from("profiles").update({ full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Rasoi friend" }).eq("id", data.user.id);
  return NextResponse.redirect(new URL(next, url.origin));
}
