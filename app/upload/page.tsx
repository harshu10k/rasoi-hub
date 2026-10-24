import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { UploadForm } from "@/components/upload-form";
import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";

export default function UploadPage() { return <><Header /><main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-12"><Link href="/" className="mb-5 inline-flex items-center sm:mb-7 gap-2 text-sm font-bold text-[#927b6d] hover:text-[#c8501e]"><ArrowLeft size={16} /> Back to recipes</Link><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c8501e] sm:text-sm">Share with the community</p><h1 className="mt-2 font-serif text-4xl font-bold text-[#39241b] sm:text-5xl">Share your rasoi.</h1><p className="mt-3 mb-6 max-w-xl leading-7 text-[#765f51] sm:mt-4 sm:mb-8">Add your family recipe with clear details so everyone can cook it with confidence.</p><Suspense fallback={null}><RequireUser next="/upload"><UploadForm /></RequireUser></Suspense></main></>; }