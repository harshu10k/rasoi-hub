import type { SupabaseClient } from "@supabase/supabase-js";
import { sampleRecipes, type Category, type Recipe } from "@/lib/types";

/** Shown when a table is missing, i.e. supabase/schema.sql has not been run on the project yet. */
export const setupMessage = "Database is not set up yet. Run supabase/schema.sql and supabase/seed.sql in the Supabase SQL editor.";

type RecipeRow = {
  id: string; title: string; category: Category; is_veg: boolean; is_hostel_friendly: boolean; cooking_time: number; servings: number;
  image_url: string; ingredients: string[]; steps: string[]; description: string | null; author_id: string; created_at: string;
  profiles: { full_name: string } | null; ratings: { rating: number }[] | null;
};

/** Turns a Supabase error into a message a cook can act on. */
export function friendlyDbError(error: { code?: string; message: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") return setupMessage;
  if (error.code === "23503") return "This recipe was just removed by its author.";
  if (error.code === "23514" || error.code === "22P02") return "Something in that doesn't look right. Please check what you entered.";
  if (error.code === "42501") return "You don't have permission to do that.";
  return error.message;
}

const recipeSelect = "*, profiles(full_name), ratings(rating)";

// Rows can be written straight through the API, bypassing the form's validation, so never trust their shape:
// one non-string ingredient would otherwise crash the recipe page for everyone who opens it.
const textList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;

export function toRecipe(row: RecipeRow): Recipe {
  const ratings = Array.isArray(row.ratings) ? row.ratings : [];
  const sample = sampleRecipes.find((item) => item.id === row.id);
  return {
    ...row, title: text(row.title, "Untitled recipe"), description: text(row.description) || undefined, image_url: text(row.image_url),
    ingredients: textList(row.ingredients), steps: textList(row.steps),
    author_name: sample?.author_name ?? text(row.profiles?.full_name, "Rasoi friend"),
    rating: ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0, rating_count: ratings.length,
  };
}

/** All recipes, newest first. Falls back to the built-in samples when the database is empty or not set up. */
export async function listRecipes(supabase: SupabaseClient): Promise<Recipe[]> {
  const { data, error } = await supabase.from("recipes").select(recipeSelect).order("created_at", { ascending: false });
  if (error || !data?.length) return sampleRecipes;
  return (data as RecipeRow[]).map(toRecipe);
}

export async function listRecipesByAuthor(supabase: SupabaseClient, authorId: string) {
  const { data, error } = await supabase.from("recipes").select(recipeSelect).eq("author_id", authorId).order("created_at", { ascending: false });
  return { recipes: ((data ?? []) as RecipeRow[]).map(toRecipe), error: error ? setupMessage : "" };
}

export async function listRecipesByIds(supabase: SupabaseClient, ids: string[]): Promise<Recipe[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from("recipes").select(recipeSelect).in("id", ids);
  const found = ((data ?? []) as RecipeRow[]).map(toRecipe);
  return ids.map((id) => found.find((item) => item.id === id) ?? sampleRecipes.find((item) => item.id === id)).filter((item): item is Recipe => Boolean(item));
}

export async function getRecipe(supabase: SupabaseClient, id: string): Promise<Recipe | undefined> {
  const { data } = await supabase.from("recipes").select(recipeSelect).eq("id", id).maybeSingle();
  return data ? toRecipe(data as RecipeRow) : sampleRecipes.find((item) => item.id === id);
}
