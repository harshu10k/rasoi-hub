"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrors, messageFor } from "@/lib/auth-messages";

const noopSubscribe = () => () => {};
const alert = "rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]";
const ok = "rounded-xl bg-[#edf8ee] px-4 py-3 text-sm text-[#2f7b4e]";
const submitClass = "rounded-xl bg-[#ff920d] px-5 py-3 font-bold text-black disabled:opacity-60";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState(""); const [error, setError] = useState(""); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false);
  // Set by /auth/callback when a reset link could not be used; hidden once the user asks for a new one.
  const linkError = useSyncExternalStore(noopSubscribe, () => messageFor(authErrors, new URLSearchParams(window.location.search).get("error")), () => "");
  const [linkErrorDismissed, setLinkErrorDismissed] = useState(false);
  const shownError = error || (linkErrorDismissed ? "" : linkError || "");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLinkErrorDismissed(true); setLoading(true);
    // The emailed link signs the user in via /auth/callback, then lands on /reset-password to choose a new one.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setLoading(false);
    if (resetError) setError(/rate limit|too many/i.test(resetError.message) ? "Too many attempts. Please wait a minute and try again." : resetError.message); else setSent(true);
  }
  return <form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm font-bold text-[#765f51]">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" placeholder="you@example.com" /></label>{shownError && <p role="alert" className={alert}>{shownError}</p>}{sent && <p role="status" className={ok}>If an account exists for {email.trim().toLowerCase()}, a reset link is on its way. Open it in this same browser.</p>}<button disabled={loading} className={submitClass}>{loading ? "Please wait..." : sent ? "Send the link again" : "Send reset link"}</button><p className="text-center text-sm text-[#927b6d]">Remembered it? <Link className="font-bold text-[#c8501e]" href="/login">Log in</Link></p></form>;
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(/different from the old/i.test(updateError.message) ? "Choose a password different from your old one." : updateError.message); return; }
    router.push("/profile?notice=password-updated"); router.refresh();
  }
  return <form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm font-bold text-[#765f51]">New password<input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="field" placeholder="At least 6 characters" /></label><label className="grid gap-2 text-sm font-bold text-[#765f51]">Confirm new password<input required minLength={6} type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="field" placeholder="Type it again" /></label>{error && <p role="alert" className={alert}>{error}</p>}<button disabled={loading} className={submitClass}>{loading ? "Saving..." : "Save new password"}</button></form>;
}
