"use client";
import Link from "next/link";
import { ChefHat, Heart, Menu, Search, SunMedium, UserRound, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-30 border-b border-[#252525] bg-[#050505]/95 text-white backdrop-blur">
    <div className="mx-auto flex h-18 max-w-7xl items-center gap-5 px-5 lg:px-8">
      <Link href="/" className="mr-auto flex items-center gap-2.5"><span className="font-sans text-3xl font-black tracking-[-0.08em] text-white">Rasoi</span><span className="rounded-md bg-[#ff920d] px-2 py-0.5 font-sans text-3xl font-black tracking-[-0.08em] text-black">hub</span></Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold text-[#d8d8d8] md:flex"><Link className="hover:text-[#ff920d]" href="/">Explore</Link><Link className="flex items-center gap-1.5 hover:text-[#ff920d]" href="/creator"><ChefHat size={16} /> Creator Rasoi</Link><Link className="hover:text-[#ff920d]" href="/saved"><Heart size={16} className="mr-1 inline" />Saved</Link></nav>
      <Link href="/creator/signup" className="hidden rounded-md bg-[#ff920d] px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#ff920d]/20 transition hover:-translate-y-0.5 hover:bg-white sm:block">+ Become a creator</Link>
      <button aria-label="Toggle theme" className="hidden rounded-full p-2 text-[#d8d8d8] hover:bg-[#252525] md:block"><SunMedium size={19} /></button>
      <Link href="/profile" aria-label="Profile" className="hidden rounded-full border border-[#444] bg-[#151515] p-2 text-[#d8d8d8] hover:text-[#ff920d] sm:block"><UserRound size={18} /></Link>
      <button aria-label="Open menu" onClick={() => setOpen(!open)} className="rounded-full p-2 text-[#d8d8d8] md:hidden">{open ? <X /> : <Menu />}</button>
    </div>
    {open && <div className="border-t border-[#252525] bg-[#050505] px-5 py-4 md:hidden"><div className="grid gap-3 text-sm font-semibold"><Link href="/" onClick={() => setOpen(false)}>Explore</Link><Link href="/creator" onClick={() => setOpen(false)}>Creator Rasoi</Link><Link href="/saved" onClick={() => setOpen(false)}>Saved favourites</Link><Link href="/creator/signup" className="rounded-md bg-[#ff920d] px-4 py-3 text-center text-black" onClick={() => setOpen(false)}>Become a creator</Link></div></div>}
  </header>;
}

export function SearchBox({ value = "", onChange }: { value?: string; onChange?: (value: string) => void }) {
  return <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[#eadfd2] bg-white px-4 py-3 shadow-sm focus-within:border-[#c8501e] focus-within:ring-2 focus-within:ring-[#c8501e]/10"><Search size={19} className="shrink-0 text-[#c8501e]" /><input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder="Search recipes, ingredients, authors..." className="w-full bg-transparent text-sm text-[#39241b] outline-none placeholder:text-[#a99587]" /></label>;
}