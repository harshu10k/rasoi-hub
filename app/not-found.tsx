import Link from "next/link";
import { Header } from "@/components/header";

export default function NotFound() {
  return <><Header /><main className="mx-auto max-w-xl px-5 py-24 text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#c8501e]">404</p><h1 className="mt-3 font-serif text-5xl font-bold text-[#39241b]">This dish isn&apos;t on the menu.</h1><p className="mt-4 text-[#927b6d]">The page or recipe you&apos;re looking for doesn&apos;t exist, or it was removed by its author.</p><Link href="/" className="mt-8 inline-block rounded-full bg-[#c8501e] px-6 py-3 text-sm font-bold text-white">Explore recipes</Link></main></>;
}
