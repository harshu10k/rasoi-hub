import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { ForgotPasswordForm, ResetPasswordForm } from "@/components/password-forms";

type Mode = "login" | "signup" | "forgot" | "reset";
const copy: Record<Mode, { badge: string; title: string; text: string }> = {
  login: { badge: "Login", title: "Come on in.", text: "Log in to save favourites, rate dishes and join the community." },
  signup: { badge: "Signup", title: "Make it yours.", text: "Create your account to save, rate and share recipes you love." },
  forgot: { badge: "Password", title: "Forgot it? No worries.", text: "Enter the email you signed up with and we'll send you a link to set a new password." },
  reset: { badge: "Password", title: "Set a new password.", text: "Choose a new password for your account. You'll use it the next time you log in." },
};

export function AuthStage({ mode = "signup" }: { mode?: Mode }) {
  const { badge, title, text } = copy[mode];
  const form = mode === "forgot" ? <ForgotPasswordForm /> : mode === "reset" ? <ResetPasswordForm /> : <AuthForm mode={mode} />;
  return <main className="auth-stage"><section className="crystal-panel"><div className="crystal-noise" /><div className="crystal-orbit crystal-orbit-one" /><div className="crystal-orbit crystal-orbit-two" /><div className="crystal-shard crystal-shard-one" /><div className="crystal-shard crystal-shard-two" /><div className="crystal-shard crystal-shard-three" /><div className="crystal-glass crystal-glass-one" /><div className="crystal-glass crystal-glass-two" /><div className="relative z-10 flex h-full flex-col justify-between"><Link href="/" className="auth-brand"><span>Rasoi</span><b>hub</b></Link><div className="max-w-md"><div className="mb-5 hidden h-11 w-11 items-center justify-center rounded-2xl sm:flex border border-white/20 bg-white/10 text-[#ffb347] backdrop-blur"><Sparkles size={20} /></div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ffbd62] sm:text-xs">A warm place to belong</p><h2 className="mt-3 font-serif text-[2.1rem] font-bold leading-[.95] text-white sm:mt-4 sm:text-6xl">Good food<br /><span className="crystal-gradient-text">starts here.</span></h2><p className="mt-6 hidden max-w-sm text-sm leading-6 text-white/65 sm:block">Save family favourites, discover new flavours, and make every meal feel like home.</p></div><div className="hidden items-center gap-3 text-xs text-white/45 sm:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-[#ff920d]" /> Secure account access · Rasoi Hub</div></div></section><section className="auth-form-panel"><div className="mb-6 flex items-center justify-between sm:mb-8"><Link href={mode === "forgot" ? "/login" : "/"} className="inline-flex items-center gap-2 text-sm font-bold text-[#927b6d] hover:text-[#c8501e]"><ArrowLeft size={16} /> {mode === "forgot" ? "Back to login" : "Back to recipes"}</Link><span className="rounded-full bg-[#fff0e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#c8501e]">{badge}</span></div><div className="mb-7"><h1 className="font-serif text-3xl font-bold tracking-tight text-[#39241b] sm:text-4xl">{title}</h1><p className="mt-3 max-w-sm text-sm leading-6 text-[#927b6d]">{text}</p></div>{form}<p className="mt-8 text-center text-xs leading-5 text-[#aa9a8e]">By continuing, you agree to cook kindly and share thoughtfully.</p></section></main>;
}
