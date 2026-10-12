"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-path";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();
  // Error passed back from /auth/callback (e.g. the user cancelled Google sign-in). Hidden once they try again.
  const callbackError = useSyncExternalStore(noopSubscribe, () => new URLSearchParams(window.location.search).get("error"), () => null);
  const [callbackErrorDismissed, setCallbackErrorDismissed] = useState(false);
  const shownError = error || (callbackErrorDismissed ? "" : callbackError || "");
  async function submit(event: React.FormEvent) { event.preventDefault(); setCallbackErrorDismissed(true); setError(""); setMessage(""); if (!hasSupabaseEnv) { setError("Add Supabase keys to .env.local to enable authentication."); return; } setLoading(true); const supabase = createClient(); const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }); setLoading(false); if (result.error) { setError(result.error.message); return; } if (mode === "signup") setMessage("Your Rasoi account is ready. Check your email to confirm your address."); else router.push(safeNextPath(new URLSearchParams(window.location.search).get("next"))); }
  async function googleLogin() {
    setCallbackErrorDismissed(true); setError(""); setMessage("");
    if (!hasSupabaseEnv) { setError("Add Supabase keys to .env.local to enable authentication."); return; }
    setLoading(true);
    try {
      // Check first so users see a clear message instead of Supabase's raw "provider is not enabled" page.
      const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }).then((response) => response.json());
      if (!settings?.external?.google) { setLoading(false); setError("Google sign-in is not enabled yet. Please use email for now."); return; }
    } catch { /* If the check fails, let Supabase handle the redirect and report any error. */ }
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(new URLSearchParams(window.location.search).get("next")))}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } });
    if (oauthError) { setLoading(false); setError(oauthError.message); }
  }
  return <form onSubmit={submit} className="grid gap-4">{mode === "signup" && <label className="grid gap-2 text-sm font-bold text-[#765f51]">Your name<input required value={name} onChange={(event) => setName(event.target.value)} className="field" placeholder="Asha Verma" /></label>}<button type="button" onClick={googleLogin} disabled={loading} className="flex items-center justify-center gap-3 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm font-bold text-[#39241b] hover:border-[#ff920d] disabled:opacity-60"><GoogleIcon /> Continue with Google</button><div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-[#b8a496]"><span className="h-px flex-1 bg-[#eadfd2]" />or use email<span className="h-px flex-1 bg-[#eadfd2]" /></div><label className="grid gap-2 text-sm font-bold text-[#765f51]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" placeholder="you@example.com" /></label><label className="grid gap-2 text-sm font-bold text-[#765f51]">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field" placeholder="At least 6 characters" /></label>{shownError && <p role="alert" className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{shownError}</p>}{message && <p className="rounded-xl bg-[#edf8ee] px-4 py-3 text-sm text-[#2f7b4e]">{message}</p>}<button disabled={loading} className="rounded-xl bg-[#ff920d] px-5 py-3 font-bold text-black disabled:opacity-60">{loading ? "Please wait..." : mode === "login" ? "Log in to Rasoi Hub" : "Create your account"}</button><p className="text-center text-sm text-[#927b6d]">{mode === "login" ? "New here? " : "Already have an account? "}<Link className="font-bold text-[#c8501e]" href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p></form>;
}

const noopSubscribe = () => () => {};

function GoogleIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
}
