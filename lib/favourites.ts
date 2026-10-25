"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { recipeActionError } from "@/lib/recipes";

// One shared copy of the signed-in user's favourites, so every heart on the page stays in sync with a single query.
let ids = new Set<string>();
let loaded = false;
let loading: Promise<void> | undefined;
// Recipes with a save/unsave request in flight. Extra clicks meanwhile are ignored so a fast double-click cannot
// leave the heart showing one state while the database ends up in the other.
const pending = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function load() {
  loading ??= (async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data } = await supabase.from("favourites").select("recipe_id").eq("user_id", auth.user.id).order("created_at", { ascending: false });
      ids = new Set((data ?? []).map((row) => row.recipe_id as string));
    }
    loaded = true;
    emit();
  })();
  return loading;
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Returns the saved recipe ids (newest first), whether they have loaded, and a toggle that resolves to an error message or "". */
export function useFavourites() {
  const snapshot = useSyncExternalStore(subscribe, () => ids, () => ids);
  const ready = useSyncExternalStore(subscribe, () => loaded, () => false);
  useEffect(() => { load(); }, []);
  async function toggle(recipeId: string) {
    if (pending.has(recipeId)) return "";
    pending.add(recipeId);
    try { return await toggleNow(recipeId); } finally { pending.delete(recipeId); }
  }
  async function toggleNow(recipeId: string) {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return "Log in to save recipes.";
    const wasSaved = ids.has(recipeId);
    const next = new Set(ids);
    if (wasSaved) next.delete(recipeId); else next.add(recipeId);
    ids = next; emit();
    const { error } = wasSaved
      ? await supabase.from("favourites").delete().eq("recipe_id", recipeId).eq("user_id", auth.user.id)
      : await supabase.from("favourites").insert({ recipe_id: recipeId, user_id: auth.user.id });
    if (!error) return "";
    const reverted = new Set(ids);
    if (wasSaved) reverted.add(recipeId); else reverted.delete(recipeId);
    ids = reverted; emit();
    return recipeActionError(supabase, recipeId, error);
  }
  return { ids: snapshot, ready, toggle };
}
