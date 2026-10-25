"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-path";
import { authErrors, authNotices, messageFor } from "@/lib/auth-messages";
import { APP_AUTH_CALLBACK, isAdminApp, onAppAuthReturn, openInSystemBrowser } from "@/lib/admin-app";

const nextPath = () => safeNextPath(new URLSearchParams(window.location.search).get("next"));
// Email links land on /auth/callback, which signs the user in and sends them back to where they were going.
const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;

/** Turns Supabase's auth errors into messages a first-time user can act on. */
function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect. Please check and try again.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first. Open the link we sent to your inbox.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Log in instead.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [name, setName] = useState(""); const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const [canResend, setCanResend] = useState(false);
  const router = useRouter();
  // Error or notice passed back from /auth/callback (e.g. the user cancelled Google sign-in). Hidden once they try again.
  const callbackError = useSyncExternalStore(noopSubscribe, () => messageFor(authErrors, new URLSearchParams(window.location.search).get("error")), () => "");
  const callbackNotice = useSyncExternalStore(noopSubscribe, () => messageFor(authNotices, new URLSearchParams(window.location.search).get("notice")), () => "");
  const [callbackDismissed, setCallbackDismissed] = useState(false);
  const shownError = error || (callbackDismissed ? "" : callbackError || "");
  const shownMessage = message || (callbackDismissed ? "" : callbackNotice || "");

  function reset() { setCallbackDismissed(true); setError(""); setMessage(""); setCanResend(false); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); reset();
    if (!hasSupabaseEnv) { setError("Add Supabase keys to .env.local to enable authentication."); return; }
    const cleanEmail = email.trim().toLowerCase();
    if (mode === "signup") {
      if (name.trim().length < 2) { setError("Please enter your name."); return; }
      if (password !== confirm) { setError("Passwords don't match."); return; }
    }
    setLoading(true);
    const supabase = createClient();
    if (mode === "login") {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      setLoading(false);
      if (loginError) { setError(friendlyError(loginError.message)); setCanResend(/email not confirmed/i.test(loginError.message)); return; }
      router.push(nextPath()); router.refresh(); return;
    }
    const { data, error: signupError } = await supabase.auth.signUp({ email: cleanEmail, password, options: { data: { full_name: name.trim() }, emailRedirectTo: callbackUrl() } });
    setLoading(false);
    if (signupError) { setError(friendlyError(signupError.message)); return; }
    // With email confirmation off, Supabase signs the user in straight away.
    if (data.session) { router.push(nextPath()); router.refresh(); return; }
    // With confirmation on, an already-registered email comes back as a user with no identities instead of an error.
    if (!data.user?.identities?.length) { setError("An account with this email already exists. Log in instead."); return; }
    setMessage(`Account created for ${cleanEmail}. We've sent you a confirmation link. Click it, and you'll be logged in.`); setCanResend(true);
  }

  async function resend() {
    setLoading(true);
    const { error: resendError } = await createClient().auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: callbackUrl() } });
    setLoading(false);
    if (resendError) setError(friendlyError(resendError.message)); else { setError(""); setMessage("Confirmation email sent again. Check your inbox (and spam folder)."); }
  }

  async function googleLogin() {
    reset();
    if (!hasSupabaseEnv) { setError("Add Supabase keys to .env.local to enable authentication."); return; }
    setLoading(true);
    try {
      // Check first so users see a clear message instead of Supabase's raw "provider is not enabled" page.
      const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }).then((response) => response.json());
      if (!settings?.external?.google) { setLoading(false); setError("Google sign-in is not enabled yet. Please use email for now."); return; }
    } catch { /* If the check fails, let Supabase handle the redirect and report any error. */ }
    const supabase = createClient();
    if (isAdminApp()) {
      // Google blocks sign-in inside the app's WebView: run it in a Chrome tab, which hands the result back to the app.
      try {
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${APP_AUTH_CALLBACK}?next=${encodeURIComponent(nextPath())}`, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
        if (oauthError || !data.url) throw new Error(oauthError?.message ?? "Could not start Google sign-in.");
        await openInSystemBrowser(data.url);
        setMessage("Finish signing in with Google in the browser window. You'll come straight back here.");
      } catch (startError) {
        setError(`${startError instanceof Error ? startError.message : "Could not start Google sign-in."} Please try again, or log in with email.`);
      } finally { setLoading(false); }
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl(), queryParams: { prompt: "select_account" } } });
    if (oauthError) { setLoading(false); setError(oauthError.message); }
  }

  // In the app, Google sign-in comes back as a link with a one-time code; trading it for a session signs the WebView in.
  useEffect(() => onAppAuthReturn(async (url) => {
    const code = url.searchParams.get("code");
    if (!code) { setError(url.searchParams.get("error_description") ?? "Google sign-in was cancelled. Please try again."); return; }
    setLoading(true);
    const { error: exchangeError } = await createClient().auth.exchangeCodeForSession(code);
    if (exchangeError) { setLoading(false); setError(friendlyError(exchangeError.message)); return; }
    window.location.replace(safeNextPath(url.searchParams.get("next")));
  }), []);

  const passwordType = showPassword ? "text" : "password";
  return <form onSubmit={submit} className="grid gap-4">{mode === "signup" && <label className="grid gap-2 text-sm font-bold text-[#765f51]">Your name<input required autoComplete="name" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className="field" placeholder="Asha Verma" /></label>}<button type="button" onClick={googleLogin} disabled={loading} className="flex items-center justify-center gap-3 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm font-bold text-[#39241b] hover:border-[#ff920d] disabled:opacity-60"><GoogleIcon /> Continue with Google</button><div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-[#b8a496]"><span className="h-px flex-1 bg-[#eadfd2]" />or use email<span className="h-px flex-1 bg-[#eadfd2]" /></div><label className="grid gap-2 text-sm font-bold text-[#765f51]">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" placeholder="you@example.com" /></label><label className="grid gap-2 text-sm font-bold text-[#765f51]"><span className="flex items-center justify-between">Password{mode === "login" && <Link href="/forgot-password" className="text-xs font-bold text-[#c8501e]">Forgot password?</Link>}</span><span className="relative grid"><input required minLength={6} type={passwordType} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="field pr-11" placeholder="At least 6 characters" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#a99587] hover:text-[#c8501e]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>{mode === "signup" && <label className="grid gap-2 text-sm font-bold text-[#765f51]">Confirm password<input required minLength={6} type={passwordType} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="field" placeholder="Type it again" /></label>}{shownError && <p role="alert" className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{shownError}{/already exists/i.test(shownError) && <> <Link href={`/login?next=${encodeURIComponent(nextPath())}`} className="font-bold underline">Log in</Link></>}</p>}{shownMessage && <p role="status" className="rounded-xl bg-[#edf8ee] px-4 py-3 text-sm text-[#2f7b4e]">{shownMessage}</p>}{canResend && <button type="button" onClick={resend} disabled={loading || !email} className="w-fit text-sm font-bold text-[#c8501e] disabled:opacity-60">Resend confirmation email</button>}<button disabled={loading} className="rounded-xl bg-[#ff920d] px-5 py-3 font-bold text-black disabled:opacity-60">{loading ? "Please wait..." : mode === "login" ? "Log in to Rasoi Hub" : "Create your account"}</button><p className="text-center text-sm text-[#927b6d]">{mode === "login" ? "New here? " : "Already have an account? "}<Link className="font-bold text-[#c8501e]" href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p></form>;
}

const noopSubscribe = () => () => {};

function GoogleIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
}
