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

export function MyRecipes() {
  const [state, setState] = useState<{ recipes: Recipe[]; error: string }>();
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => data.user ? listRecipesByAuthor(supabase, data.user.id).then(setState) : setState({ recipes: [], error: "" }));
  }, []);
  if (!state) return <p className="mt-10 text-[#927b6d]">Loading your recipes...</p>;
  if (state.error) return <p role="alert" className="mt-10 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{state.error}</p>;
  if (!state.recipes.length) return <div className="mt-10 rounded-3xl border border-dashed border-[#d8c5b4] py-16 text-center text-[#927b6d]">You haven&apos;t shared a recipe yet. <Link href="/upload" className="font-bold text-[#c8501e]">Share your first one</Link></div>;
  return <div className={`mt-10 ${grid}`}>{state.recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>;
}
