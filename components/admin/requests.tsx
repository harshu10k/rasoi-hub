"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminRecipeSelect, reviewRecipe, type AdminRecipe } from "@/lib/admin";
import { refreshPendingBadge } from "@/components/admin/admin-shell";
import { RecipeReviewCard } from "@/components/admin/recipe-review";
import { Empty, ErrorBox, Loading, PageHeader, Toast, btn, useAction } from "@/components/admin/ui";

/** The review queue: recipes stay hidden from the site until approved here. Oldest first, so nobody waits forever. */
export function AdminRequests() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>(); const [loadError, setLoadError] = useState("");
  const { error, toast, busyId, run } = useAction();
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("recipes").select(adminRecipeSelect).eq("status", "pending").order("created_at", { ascending: true });
    setLoadError(error?.message ?? ""); setRecipes((data ?? []) as unknown as AdminRecipe[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); const timer = setInterval(load, 30_000); return () => clearInterval(timer); }, [load]);

  const done = (id: string) => { setRecipes((list) => list?.filter((item) => item.id !== id)); refreshPendingBadge(); };
  async function approveAll() {
    if (!recipes?.length || !window.confirm(`Approve all ${recipes.length} pending recipes?`)) return;
    for (const recipe of recipes) if (await run(recipe.id, () => reviewRecipe(recipe.id, "approved"), "Approved")) done(recipe.id);
  }

  return <>
    <PageHeader title="Requests" subtitle="New and edited recipes waiting for approval. Approved ones go live instantly." onRefresh={load}>{recipes && recipes.length > 1 && <button type="button" onClick={approveAll} className={btn.ghost}>Approve all</button>}</PageHeader>
    <ErrorBox message={error || loadError} />
    {!recipes ? <Loading /> : recipes.length === 0 ? <Empty>All caught up! New recipes will appear here for review.</Empty> :
      <div className="grid gap-4">{recipes.map((recipe) => <RecipeReviewCard key={recipe.id} recipe={recipe} expanded={recipes.length <= 3} busy={busyId === recipe.id}
        onApprove={async () => { if (await run(recipe.id, () => reviewRecipe(recipe.id, "approved"), `"${recipe.title}" is now live`)) done(recipe.id); }}
        onReject={async (reason) => { if (await run(recipe.id, () => reviewRecipe(recipe.id, "rejected", reason), "Recipe rejected; the cook will see your reason")) done(recipe.id); }} />)}</div>}
    <Toast message={toast} />
  </>;
}
