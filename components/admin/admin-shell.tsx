"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Activity, ArrowLeft, BookOpen, ClipboardCheck, LayoutDashboard, MessageSquare, Settings, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/requests", label: "Requests", icon: ClipboardCheck, badge: true },
  { href: "/admin/recipes", label: "Recipes", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Number of recipes waiting for review, refreshed every minute and after admin actions (via the "rasoi:pending" event). */
function usePendingCount() {
  const [count, setCount] = useState<number>();
  useEffect(() => {
    const load = () => createClient().from("recipes").select("id", { count: "exact", head: true }).eq("status", "pending").then(({ count }) => setCount(count ?? 0));
    load();
    const timer = setInterval(load, 60_000);
    window.addEventListener("rasoi:pending", load);
    return () => { clearInterval(timer); window.removeEventListener("rasoi:pending", load); };
  }, []);
  return count;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pending = usePendingCount();
  return <div className="min-h-dvh md:flex">
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[#252525] bg-[#0b0908] p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white md:flex">
      <Brand />
      <Suspense fallback={<SideNav pathname="" pending={pending} />}><CurrentSideNav pending={pending} /></Suspense>
      <div className="mt-auto grid gap-2 text-sm">
        <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#bbb] hover:bg-white/10 hover:text-white"><ArrowLeft size={16} />Back to website</Link>
        <ThemeToggle withLabel className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[#bbb] hover:bg-white/10 hover:text-white" />
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-[#252525] bg-[#0b0908] pt-[env(safe-area-inset-top)] text-white md:hidden">
        <div className="flex h-14 items-center gap-3 px-4"><Brand /><Link href="/" aria-label="Back to website" className="ml-auto grid h-10 w-10 place-items-center rounded-full text-[#ccc]"><ArrowLeft size={18} /></Link><ThemeToggle className="grid h-10 w-10 place-items-center rounded-full text-[#ccc]" /></div>
        <Suspense fallback={<TopTabs pathname="" pending={pending} />}><CurrentTopTabs pending={pending} /></Suspense>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  </div>;
}

function Brand() {
  return <Link href="/admin" className="flex items-center gap-1.5 md:mb-8"><span className="font-sans text-2xl font-black tracking-[-0.08em]">Rasoi</span><span className="rounded-md bg-[#ff920d] px-1.5 py-0.5 font-sans text-2xl font-black tracking-[-0.08em] text-black">hub</span><span className="ml-1 rounded-md border border-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#ffbd62]">Admin</span></Link>;
}

const isActive = (pathname: string, href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
const Badge = ({ value }: { value?: number }) => value ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#ff920d] px-1.5 text-[11px] font-bold text-black">{value > 99 ? "99+" : value}</span> : null;

// usePathname needs Suspense under cacheComponents (see components/header.tsx).
function CurrentSideNav({ pending }: { pending?: number }) { return <SideNav pathname={usePathname()} pending={pending} />; }
function CurrentTopTabs({ pending }: { pending?: number }) { return <TopTabs pathname={usePathname()} pending={pending} />; }

function SideNav({ pathname, pending }: { pathname: string; pending?: number }) {
  return <nav aria-label="Admin" className="grid gap-1 text-sm font-semibold">{items.map(({ href, label, icon: Icon, badge }) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isActive(pathname, href) ? "bg-[#ff920d] text-black" : "text-[#ccc] hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{label}{badge && <Badge value={pending} />}</Link>)}</nav>;
}

function TopTabs({ pathname, pending }: { pathname: string; pending?: number }) {
  return <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 text-sm font-semibold">{items.map(({ href, label, icon: Icon, badge }) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 ${isActive(pathname, href) ? "bg-[#ff920d] text-black" : "text-[#ccc]"}`}><Icon size={15} />{label}{badge && pending ? <span className="rounded-full bg-black/20 px-1.5 text-[11px]">{pending}</span> : null}</Link>)}</nav>;
}

/** Tell the shell to refresh the pending badge after approving/rejecting. */
export const refreshPendingBadge = () => window.dispatchEvent(new Event("rasoi:pending"));
