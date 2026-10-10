import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const accountType = url.searchParams.get("account_type") === "creator" ? "creator" : "reader";
  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user) await supabase.from("profiles").update({ account_type: accountType, full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Rasoi friend" }).eq("id", data.user.id);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}