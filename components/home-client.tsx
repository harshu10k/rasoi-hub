"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChefHat, SlidersHorizontal } from "lucide-react";
import { categories, sampleRecipes, type Category, type Recipe } from "@/lib/types";
import { RecipeCard } from "@/components/recipe-card";
import { SearchBox } from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { listRecipes } from "@/lib/recipes";

const sortOptions = { newest: "Newest", rating: "Top rated", quickest: "Quickest" } as const;
type Sort = keyof typeof sortOptions;
const timeOptions = [0, 15, 30, 45, 60];

export function HomeClient() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [diet, setDiet] = useState("All");
  const [hostelOnly, setHostelOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [maxTime, setMaxTime] = useState(0);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(sampleRecipes);

  useEffect(() => { listRecipes(createClient()).then(setAllRecipes); }, []);
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 250); return () => clearTimeout(timer); }, [query]);

  const recipes = useMemo(() => {
    const search = debouncedQuery.toLowerCase();
    const filtered = allRecipes.filter((recipe) => {
      const searchable = `${recipe.title} ${recipe.category} ${recipe.author_name} ${recipe.ingredients.join(" ")}`.toLowerCase();
      return searchable.includes(search)
        && (category === "All" || recipe.category === category)
        && (diet === "All" || (diet === "Veg" ? recipe.is_veg : !recipe.is_veg))
        && (!hostelOnly || recipe.is_hostel_friendly)
        && (!maxTime || recipe.cooking_time <= maxTime);
    });
    if (sort === "rating") return [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "quickest") return [...filtered].sort((a, b) => a.cooking_time - b.cooking_time);
    return filtered;
  }, [allRecipes, debouncedQuery, category, diet, hostelOnly, maxTime, sort]);

  const activeFilters = Number(sort !== "newest") + Number(maxTime > 0);
  function resetFilters() { setSort("newest"); setMaxTime(0); setDiet("All"); setHostelOnly(false); setCategory("All"); setQuery(""); }

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-5 sm:pb-10 sm:pt-10 lg:px-8 lg:pt-16">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#4d241b] px-6 py-9 text-white sm:rounded-[2rem] sm:py-12 shadow-2xl shadow-[#c8501e]/10 sm:px-12 lg:px-20 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#f3b85b]"><ChefHat size={18} /> A community kitchen</p>
            <h1 className="font-serif text-[2.6rem] font-bold leading-[.95] tracking-tight sm:text-7xl">Ghar ki recipes,<br /><i className="font-normal text-[#f3b85b]">dil se.</i></h1>
            <p className="mt-4 max-w-[17rem] text-[15px] leading-6 text-[#f6ded0] sm:mt-6 sm:max-w-lg sm:text-base sm:leading-7">Discover the recipes that make ordinary days feel special. Cook, share, and keep your family favourites close.</p>
            <Link href="/upload" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f3b85b] px-6 py-3 sm:mt-8 text-sm font-bold text-[#4d241b] hover:bg-white">Share your recipe <ArrowRight size={17} /></Link>
          </div>
          <div className="absolute -right-16 -top-28 h-[34rem] w-[34rem] rounded-full border-[42px] border-[#c8501e]/40" />
          <div className="absolute -right-8 -bottom-20 h-44 w-44 sm:-right-4 sm:-bottom-32 sm:h-72 sm:w-72 overflow-hidden rounded-full border-8 border-[#f3b85b]/30"><img src={sampleRecipes[0].image_url} alt="Butter chicken" className="h-full w-full object-cover opacity-80" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <div className="flex gap-3 sm:gap-4"><SearchBox value={query} onChange={setQuery} /><button type="button" aria-label="Filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold sm:px-5 ${filtersOpen ? "border-[#c8501e] bg-[#fff0e8] text-[#c8501e]" : "border-[#eadfd2] bg-white text-[#765f51]"}`}><SlidersHorizontal size={17} /><span className="hidden sm:inline">Filters</span>{activeFilters > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#c8501e] text-[11px] text-white">{activeFilters}</span>}</button></div>
        {filtersOpen && <div className="mt-4 grid gap-4 rounded-2xl border border-[#eadfd2] bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-[#a99587]">Sort by<select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="field text-sm normal-case tracking-normal">{Object.entries(sortOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-[#a99587]">Ready in<select value={maxTime} onChange={(event) => setMaxTime(Number(event.target.value))} className="field text-sm normal-case tracking-normal">{timeOptions.map((value) => <option key={value} value={value}>{value ? `${value} min or less` : "Any time"}</option>)}</select></label>
          <button type="button" onClick={resetFilters} className="rounded-xl border border-[#eadfd2] px-4 py-3 text-sm font-bold text-[#c8501e]">Reset all</button>
        </div>}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setCategory("All")} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === "All" ? "bg-[#39241b] text-white" : "bg-[#f3e6d6] text-[#765f51]"}`}>All recipes</button>
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === item ? "bg-[#39241b] text-white" : "bg-[#f3e6d6] text-[#765f51]"}`}>{item}</button>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#eadfd2] pb-5 sm:mt-4 sm:pb-6">
          <div className="flex items-center gap-2"><span className="w-10 text-xs font-bold uppercase tracking-wider text-[#a99587] sm:w-auto">Diet</span>{["All", "Veg", "Non-Veg"].map((item) => <button key={item} onClick={() => setDiet(item)} className={`rounded-full border px-4 py-2 text-xs font-bold ${diet === item ? "border-[#c8501e] bg-[#fff0e8] text-[#c8501e]" : "border-[#eadfd2] text-[#927b6d]"}`}>{item}</button>)}</div>
          <div className="flex items-center gap-2"><span className="w-10 text-xs font-bold uppercase tracking-wider text-[#a99587] sm:w-auto">For</span><button onClick={() => setHostelOnly((current) => !current)} className={`rounded-full border px-4 py-2 text-xs font-bold ${hostelOnly ? "border-[#ff920d] bg-[#fff4df] text-[#b96100]" : "border-[#eadfd2] text-[#927b6d]"}`}>Hostel students</button></div>
        </div>

        <div className="flex items-end justify-between gap-4 py-6 sm:py-8"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c8501e] sm:text-sm">Made at home</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#39241b] sm:text-3xl">{hostelOnly ? "Hostel-friendly rasoi" : "Fresh from our rasoi"}</h2></div><span className="shrink-0 pb-1 text-sm text-[#927b6d]">{recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}</span></div>
        {recipes.length ? <div className="grid gap-4 pb-12 min-[520px]:grid-cols-2 sm:gap-5 lg:grid-cols-4">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : <div className="mb-12 rounded-3xl border border-dashed border-[#d8c5b4] py-20 text-center text-[#927b6d]">No recipes found. <button type="button" onClick={resetFilters} className="font-bold text-[#c8501e]">Clear filters</button></div>}
      </section>
    </main>
  );
}
