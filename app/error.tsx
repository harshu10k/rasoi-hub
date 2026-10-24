"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="mx-auto max-w-xl px-4 py-16 sm:px-5 sm:py-24 text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#c8501e]">Oops</p><h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl text-[#39241b]">Something burnt in the kitchen.</h1><p className="mt-4 text-[#927b6d]">Something went wrong while loading this page. Please try again.</p><div className="mt-8 flex justify-center gap-3"><button onClick={retry} className="rounded-full bg-[#c8501e] px-6 py-3 text-sm font-bold text-white">Try again</button><Link href="/" className="rounded-full border border-[#eadfd2] px-6 py-3 text-sm font-bold text-[#39241b]">Go home</Link></div></main>;
}
