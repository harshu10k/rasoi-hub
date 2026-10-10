"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChefHat, SlidersHorizontal } from "lucide-react";
import { categories, sampleRecipes, type Category, type Recipe } from "@/lib/types";
import { RecipeCard } from "@/components/recipe-card";
import { SearchBox } from "@/components/header";

export function HomeClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [diet, setDiet] = useState("All");
  const [hostelOnly, setHostelOnly] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>(sampleRecipes);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecipes(sampleRecipes.filter((recipe) => {
        const searchable = `${recipe.title} ${recipe.category} ${recipe.author_name} ${recipe.ingredients.join(" ")}`.toLowerCase();
        const isHostelRecipe = recipe.is_hostel_friendly || ["sample-2", "sample-3"].includes(recipe.id);
        return searchable.includes(query.toLowerCase())
          && (category === "All" || recipe.category === category)
          && (diet === "All" || (diet === "Veg" ? recipe.is_veg : !recipe.is_veg))
          && (!hostelOnly || isHostelRecipe);
      }));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, category, diet, hostelOnly]);

  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 pb-10 pt-10 lg:px-8 lg:pt-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#4d241b] px-6 py-12 text-white shadow-2xl shadow-[#c8501e]/10 sm:px-12 lg:px-20 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#f3b85b]"><ChefHat size={18} /> A community kitchen</p>
            <h1 className="font-serif text-5xl font-bold leading-[.95] tracking-tight sm:text-7xl">Ghar ki recipes,<br /><i className="font-normal text-[#f3b85b]">dil se.</i></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#f6ded0]">Discover the recipes that make ordinary days feel special. Cook, share, and keep your family favourites close.</p>
            <Link href="/creator/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f3b85b] px-6 py-3 text-sm font-bold text-[#4d241b] hover:bg-white">Share your recipe <ArrowRight size={17} /></Link>
          </div>
          <div className="absolute -right-16 -top-28 h-[34rem] w-[34rem] rounded-full border-[42px] border-[#c8501e]/40" />
          <div className="absolute -right-4 -bottom-32 h-72 w-72 overflow-hidden rounded-full border-8 border-[#f3b85b]/30"><img src={sampleRecipes[0].image_url} alt="Butter chicken" className="h-full w-full object-cover opacity-80" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row"><SearchBox value={query} onChange={setQuery} /><button className="flex items-center justify-center gap-2 rounded-2xl border border-[#eadfd2] bg-white px-5 py-3 text-sm font-semibold text-[#765f51] sm:w-auto"><SlidersHorizontal size={17} /> Filters</button></div>
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setCategory("All")} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === "All" ? "bg-[#39241b] text-white" : "bg-[#f3e6d6] text-[#765f51]"}`}>All recipes</button>
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === item ? "bg-[#39241b] text-white" : "bg-[#f3e6d6] text-[#765f51]"}`}>{item}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-[#eadfd2] pb-6">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider text-[#a99587]">Diet</span>
          {["All", "Veg", "Non-Veg"].map((item) => <button key={item} onClick={() => setDiet(item)} className={`rounded-full border px-4 py-1.5 text-xs font-bold ${diet === item ? "border-[#c8501e] bg-[#fff0e8] text-[#c8501e]" : "border-[#eadfd2] text-[#927b6d]"}`}>{item}</button>)}
          <span className="ml-3 text-xs font-bold uppercase tracking-wider text-[#a99587]">For</span>
          <button onClick={() => setHostelOnly((current) => !current)} className={`rounded-full border px-4 py-1.5 text-xs font-bold ${hostelOnly ? "border-[#ff920d] bg-[#fff4df] text-[#b96100]" : "border-[#eadfd2] text-[#927b6d]"}`}>Hostel students</button>
        </div>

        <div className="flex items-end justify-between py-8"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c8501e]">Made at home</p><h2 className="mt-1 font-serif text-3xl font-bold text-[#39241b]">{hostelOnly ? "Hostel-friendly rasoi" : "Fresh from our rasoi"}</h2></div><span className="text-sm text-[#927b6d]">{recipes.length} recipes</span></div>
        {recipes.length ? <div className="grid gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : <div className="rounded-3xl border border-dashed border-[#d8c5b4] py-20 text-center text-[#927b6d]">No recipes found. Try a different filter.</div>}
      </section>
    </main>
  );
}