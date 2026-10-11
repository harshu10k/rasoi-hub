import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { UploadForm } from "@/components/upload-form";

export default function UploadPage() { return <><Header /><main className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-12"><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-[#927b6d] hover:text-[#c8501e]"><ArrowLeft size={16} /> Back to recipes</Link><p className="text-sm font-bold uppercase tracking-[.18em] text-[#c8501e]">Share with the community</p><h1 className="mt-2 font-serif text-5xl font-bold text-[#39241b]">Share your rasoi.</h1><p className="mt-4 mb-8 max-w-xl leading-7 text-[#765f51]">Add your family recipe with clear details so everyone can cook it with confidence.</p><UploadForm /></main></>; }