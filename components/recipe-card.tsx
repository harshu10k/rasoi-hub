"use client";
import Link from "next/link";
import { useState } from "react";
import { Clock3, Heart, Star } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { useFavourites } from "@/lib/favourites";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { ids, toggle } = useFavourites();
  const [notice, setNotice] = useState("");
  const saved = ids.has(recipe.id);
  async function save(event: React.MouseEvent) { event.preventDefault(); event.stopPropagation(); setNotice(await toggle(recipe.id)); }
  return <article className="group overflow-hidden rounded-3xl border border-[#eadfd2] bg-white shadow-[0_8px_30px_rgba(91,54,31,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(91,54,31,0.12)]"><Link href={`/recipe/${recipe.id}`}><div className="relative aspect-[1.25] overflow-hidden"><img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#39241b] backdrop-blur"><span className={`h-2 w-2 rounded-full ${recipe.is_veg ? "bg-[#39945e]" : "bg-[#d34b38]"}`} />{recipe.is_veg ? "Veg" : "Non-veg"}</div><button aria-label={saved ? "Remove from saved" : "Save recipe"} aria-pressed={saved} onClick={save} className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 backdrop-blur hover:text-[#c8501e] ${saved ? "text-[#c8501e]" : "text-[#765f51]"}`}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>{notice && <p role="alert" className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-[#b33f20]">{notice}</p>}</div><div className="p-4 sm:p-5"><div className="mb-2 flex items-center justify-between text-xs text-[#927b6d]"><span>{recipe.category}</span><span className="flex items-center gap-1"><Clock3 size={13} />{recipe.cooking_time} min me taiyar</span></div><h3 className="font-serif text-xl font-bold leading-tight text-[#39241b]">{recipe.title}</h3><div className="mt-4 flex items-center justify-between"><span className="text-sm text-[#927b6d]">by <b className="text-[#765f51]">{recipe.author_name}</b></span><span className="flex items-center gap-1 text-sm font-bold text-[#bc7415]"><Star size={15} fill="currentColor" />{recipe.rating_count ? recipe.rating?.toFixed(1) : "New"} <small className="font-normal text-[#a99587]">({recipe.rating_count ?? 0})</small></span></div></div></Link></article>;
}
