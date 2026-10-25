"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { RecipeCard } from "@/components/recipe-card";
import { createClient } from "@/lib/supabase/client";
import { useFavourites } from "@/lib/favourites";
import { listRecipesByAuthor, listRecipesByIds } from "@/lib/recipes";

const grid = "grid gap-4 min-[520px]:grid-cols-2 sm:gap-5 lg:grid-cols-4";

export function SavedRecipes() {
  const { ids, ready } = useFavourites();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Keep cards for recipes un-hearted on this page out of view right away, without refetching.
  const visible = recipes.filter((recipe) => ids.has(recipe.id));
  const key = [...ids].sort().join();
  useEffect(() => { if (ready) listRecipesByIds(createClient(), [...ids]).then(setRecipes); }, [ready, key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <p className="py-16 text-center text-[#927b6d]">Loading your saved recipes...</p>;
  if (!visible.length) return <div className="mx-auto max-w-4xl py-16 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0e8] text-[#c8501e]"><Heart fill="currentColor" /></div><h1 className="mt-6 font-serif text-4xl font-bold text-[#39241b]">Your saved recipes</h1><p className="mx-auto mt-3 max-w-md text-[#927b6d]">Save the recipes you want to cook next and they will show up here.</p><Link href="/" className="mt-7 inline-block rounded-full bg-[#39241b] px-6 py-3 text-sm font-bold text-white">Explore recipes</Link></div>;
  return <div className="py-6 sm:py-10"><p className="text-xs font-bold sm:text-sm uppercase tracking-[.18em] text-[#c8501e]">Cook these next</p><h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl text-[#39241b]">Your saved recipes</h1><div className={`mt-6 sm:mt-10 ${grid}`}>{visible.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div></div>;
}

const sections = [
  { status: "pending", chip: "waiting for approval", title: "Waiting for approval", note: "An admin will review these soon. Only you can see them until they are approved.", tone: "bg-[#fff8e6] text-[#8a5a00]" },
  { status: "rejected", chip: "not approved", title: "Not approved", note: "See the reason on each recipe, then edit and save it to send it for review again.", tone: "bg-[#fff0e8] text-[#b33f20]" },
  { status: "approved", chip: "live", title: "Live on Rasoi Hub", note: "", tone: "bg-[#edf8ee] text-[#2f7b4e]" },
] as const;

export function MyRecipes() {
  const [state, setState] = useState<{ recipes: Recipe[]; error: string }>();
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => data.user ? listRecipesByAuthor(supabase, data.user.id).then(setState) : setState({ recipes: [], error: "" }));
  }, []);
  if (!state) return <p className="mt-10 text-[#927b6d]">Loading your recipes...</p>;
  if (state.error) return <p role="alert" className="mt-10 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{state.error}</p>;
  if (!state.recipes.length) return <div className="mt-10 rounded-3xl border border-dashed border-[#d8c5b4] py-16 text-center text-[#927b6d]">You haven&apos;t shared a recipe yet. <Link href="/upload" className="font-bold text-[#c8501e]">Share your first one</Link></div>;
  // Rows from before moderation existed have no status; they are live.
  const groups = sections.map((section) => ({ ...section, recipes: state.recipes.filter((recipe) => (recipe.status ?? "approved") === section.status) })).filter((group) => group.recipes.length);
  return <>
    <ul aria-label="Your recipes by status" className="mt-6 flex flex-wrap gap-2">{groups.map((group) => <li key={group.status}><a href={`#${group.status}`} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold ${group.tone}`}><b className="text-base">{group.recipes.length}</b>{group.chip}</a></li>)}</ul>
    {groups.map((group) => <section key={group.status} id={group.status} aria-labelledby={`${group.status}-title`} className="mt-8 scroll-mt-24">
      <h2 id={`${group.status}-title`} className="font-serif text-2xl font-bold text-[#39241b]">{group.title} <span className="text-[#a99587]">({group.recipes.length})</span></h2>
      {group.note && <p className="mt-1 text-sm text-[#927b6d]">{group.note}</p>}
      <div className={`mt-4 ${grid}`}>{group.recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} showStatus />)}</div>
    </section>)}
  </>;
}
