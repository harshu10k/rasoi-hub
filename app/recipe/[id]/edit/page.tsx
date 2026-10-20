import Link from "next/link"; import { Suspense } from "react"; import { notFound } from "next/navigation"; import { ArrowLeft } from "lucide-react"; import { Header } from "@/components/header"; import { UploadForm } from "@/components/upload-form"; import { requireUser } from "@/lib/auth"; import { createClient } from "@/lib/supabase/server"; import { getRecipe } from "@/lib/recipes";
export const metadata = { title: "Edit recipe | Rasoi Hub" };
export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) { return <><Header /><main className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-12"><Suspense fallback={null}><EditLoader params={params} /></Suspense></main></>; }
async function EditLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await requireUser(`/recipe/${id}/edit`);
  const recipe = await getRecipe(await createClient(), id);
  // Only the author may edit; everyone else (and built-in samples) gets a 404 rather than a form that would fail.
  if (!recipe || recipe.author_id !== user.id) notFound();
  return <><Link href={`/recipe/${id}`} className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-[#927b6d] hover:text-[#c8501e]"><ArrowLeft size={16} /> Back to recipe</Link><p className="text-sm font-bold uppercase tracking-[.18em] text-[#c8501e]">Your recipe</p><h1 className="mt-2 mb-8 font-serif text-5xl font-bold text-[#39241b]">Edit recipe.</h1><UploadForm recipe={recipe} /></>;
}
