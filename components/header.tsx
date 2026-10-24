"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, Compass, Heart, Plus, Search, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/my-recipes", label: "My recipes", icon: BookOpen },
];

const activeFor = (pathname: string) => (href: string) => href === "/" ? pathname === "/" || pathname.startsWith("/recipe/") : pathname.startsWith(href);

// The active-link highlight reads the URL, which on dynamic pages (e.g. /recipe/<new id>/edit) is only known at request
// time; Suspense lets the build prerender the plain links and fill in the highlight in the browser.
export function Header() {
  return <>
    <header className="sticky top-0 z-30 border-b border-[#252525] bg-[#050505]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-5 px-4 sm:h-18 sm:px-5 lg:px-8">
        <Link href="/" aria-label="Rasoi Hub home" className="mr-auto flex items-center gap-1.5 sm:gap-2.5"><span className="font-sans text-2xl font-black tracking-[-0.08em] text-white sm:text-3xl">Rasoi</span><span className="rounded-md bg-[#ff920d] px-1.5 py-0.5 font-sans text-2xl font-black tracking-[-0.08em] text-black sm:px-2 sm:text-3xl">hub</span></Link>
        <Suspense fallback={<DesktopNav pathname="" />}><CurrentDesktopNav /></Suspense>
        <Link href="/upload" className="hidden rounded-md bg-[#ff920d] px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#ff920d]/20 transition hover:-translate-y-0.5 hover:bg-white md:block">+ Share recipe</Link>
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full text-[#d8d8d8] hover:bg-[#252525]" />
        <Link href="/profile" aria-label="Profile" className="hidden h-10 w-10 place-items-center rounded-full border border-[#444] bg-[#151515] text-[#d8d8d8] hover:text-[#ff920d] md:grid"><UserRound size={18} /></Link>
      </div>
    </header>
    <Suspense fallback={<TabBar pathname="" />}><CurrentTabBar /></Suspense>
  </>;
}

function CurrentDesktopNav() { return <DesktopNav pathname={usePathname()} />; }
function CurrentTabBar() { return <TabBar pathname={usePathname()} />; }

function DesktopNav({ pathname }: { pathname: string }) {
  const isActive = activeFor(pathname);
  return <nav className="hidden items-center gap-7 text-sm font-semibold text-[#d8d8d8] md:flex">{navLinks.map(({ href, label }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={isActive(href) ? "text-[#ff920d]" : "hover:text-[#ff920d]"}>{label}</Link>)}</nav>;
}

/** Phones: app-style tab bar at the thumb's reach instead of a hamburger menu. */
function TabBar({ pathname }: { pathname: string }) {
  const isActive = activeFor(pathname);
  return <nav aria-label="Main" className="mobile-tabbar fixed inset-x-0 bottom-0 z-30 border-t border-[#eadfd2] bg-[#fffaf4]/95 backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        <TabLink href="/" label="Explore" icon={Compass} active={isActive("/")} />
        <TabLink href="/saved" label="Saved" icon={Heart} active={isActive("/saved")} />
        <Link href="/upload" aria-label="Share recipe" aria-current={isActive("/upload") ? "page" : undefined} className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ff920d] text-black shadow-lg shadow-[#ff920d]/30 active:scale-95"><Plus size={24} strokeWidth={2.5} /></Link>
        <TabLink href="/my-recipes" label="My recipes" icon={BookOpen} active={isActive("/my-recipes")} />
        <TabLink href="/profile" label="Profile" icon={UserRound} active={isActive("/profile")} />
      </div>
    </nav>;
}

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Compass; active: boolean }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-[#c8501e]" : "text-[#927b6d]"}`}><Icon size={21} strokeWidth={active ? 2.4 : 2} fill={active && href === "/saved" ? "currentColor" : "none"} />{label}</Link>;
}

export function SearchBox({ value = "", onChange }: { value?: string; onChange?: (value: string) => void }) {
  return <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[#eadfd2] bg-white px-4 py-3 shadow-sm focus-within:border-[#c8501e] focus-within:ring-2 focus-within:ring-[#c8501e]/10"><Search size={19} className="shrink-0 text-[#c8501e]" /><input type="search" enterKeyHint="search" value={value} onChange={(e) => onChange?.(e.target.value)} placeholder="Search recipes, ingredients, authors..." className="w-full min-w-0 bg-transparent text-base text-[#39241b] outline-none placeholder:text-[#a99587]" /></label>;
}
