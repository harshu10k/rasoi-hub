"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AccountType = "reader" | "creator";

export function AuthForm({ mode, accountType = "reader" }: { mode: "login" | "signup"; accountType?: AccountType }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const creator = accountType === "creator";
  const otherLogin = creator ? "/creator/login" : "/login";
  const otherSignup = creator ? "/creator/signup" : "/signup";

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (!hasSupabaseEnv) { setError("Add Supabase keys to .env.local to enable authentication."); return; }
    setLoading(true);
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name, account_type: accountType } } });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    if (mode === "signup") setMessage(`Your ${creator ? "creator" : "reader"} account is ready. Check your email to confirm your address.`);
    else router.push(creator ? "/creator" : "/");
  }

  async function socialLogin(provider: "google" | "github") {
    setError("");
    if (!hasSupabaseEnv) { setError("Add Supabase keys to .env.local to enable authentication."); return; }
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(creator ? "/creator" : "/")}&account_type=${accountType}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (oauthError) { setLoading(false); setError(oauthError.message); }
  }

  return <form onSubmit={submit} className="grid gap-4">
    {mode === "signup" && <label className="grid gap-2 text-sm font-bold text-[#765f51]">{creator ? "Creator name" : "Your name"}<input required value={name} onChange={(event) => setName(event.target.value)} className="field" placeholder={creator ? "Nisha's Rasoi" : "Asha Verma"} /></label>}
    <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => socialLogin("google")} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm font-bold text-[#39241b] hover:border-[#ff920d] disabled:opacity-60"><Mail size={17} /> Continue with Google</button><button type="button" onClick={() => socialLogin("github")} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-[#eadfd2] bg-[#151515] px-4 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60"><UserRound size={17} /> Continue with GitHub</button></div>
    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-[#b8a496]"><span className="h-px flex-1 bg-[#eadfd2]" />or use email<span className="h-px flex-1 bg-[#eadfd2]" /></div>
    <label className="grid gap-2 text-sm font-bold text-[#765f51]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" placeholder="you@example.com" /></label>
    <label className="grid gap-2 text-sm font-bold text-[#765f51]">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field" placeholder="At least 6 characters" /></label>
    {error && <p role="alert" className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{error}</p>}
    {message && <p className="rounded-xl bg-[#edf8ee] px-4 py-3 text-sm text-[#2f7b4e]">{message}</p>}
    <button disabled={loading} className="rounded-xl bg-[#ff920d] px-5 py-3 font-bold text-black disabled:opacity-60">{loading ? "Please wait..." : mode === "login" ? `Log in to ${creator ? "Creator Rasoi" : "Rasoi Hub"}` : `Create ${creator ? "creator" : "reader"} account`}</button>
    <p className="text-center text-sm text-[#927b6d]">{mode === "login" ? "New here? " : "Already have an account? "}<Link className="font-bold text-[#c8501e]" href={mode === "login" ? otherSignup : otherLogin}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
    <Link href={creator ? "/login" : "/creator/signup"} className="text-center text-xs font-bold text-[#927b6d] hover:text-[#c8501e]">{creator ? "I only want to browse recipes" : "I want to share recipes as a creator"}</Link>
  </form>;
}