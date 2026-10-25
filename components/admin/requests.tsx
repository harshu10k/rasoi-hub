"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminRecipeSelect, findDuplicates, reviewRecipe, type AdminRecipe, type DuplicateMatch } from "@/lib/admin";
import { refreshPendingBadge } from "@/components/admin/admin-shell";
import { RecipeReviewCard } from "@/components/admin/recipe-review";
import { Empty, ErrorBox, Loading, PageHeader, Tabs, Toast, btn, useAction, useUrlFilter } from "@/components/admin/ui";

const filters = ["all", "copy", "similar", "new"] as const;

/** The review queue: recipes stay hidden from the site until approved here. Oldest first, so nobody waits forever. */
export function AdminRequests() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>(); const [loadError, setLoadError] = useState("");
  const [duplicates, setDuplicates] = useState<Record<string, DuplicateMatch>>({}); const [filter, setFilter] = useUrlFilter(filters, "all");
  const { error, toast, busyId, run } = useAction();
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("recipes").select(adminRecipeSelect).eq("status", "pending").order("created_at", { ascending: true });
    const list = (data ?? []) as unknown as AdminRecipe[];
    setLoadError(error?.message ?? ""); setRecipes(list);
    // The queue still works if the check fails; it just shows no duplicate labels.
    setDuplicates(await findDuplicates(list.map((recipe) => recipe.id)).catch(() => ({})));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); const timer = setInterval(load, 30_000); return () => clearInterval(timer); }, [load]);

  const done = (id: string) => { setRecipes((list) => list?.filter((item) => item.id !== id)); refreshPendingBadge(); };
  const kindOf = (recipe: AdminRecipe) => duplicates[recipe.id]?.kind ?? "new";
  const counts = { all: recipes?.length ?? 0, copy: 0, similar: 0, new: 0 };
  for (const recipe of recipes ?? []) counts[kindOf(recipe)]++;
  const shown = (recipes ?? []).filter((recipe) => filter === "all" || kindOf(recipe) === filter);

  async function approveAll() {
    // Only the group on screen, so "Approve all" in "New dishes" never lets a likely copy through.
    const group = shown; const label = filter === "all" ? "pending recipes" : "recipes in this group";
    if (!group.length || !window.confirm(`Approve all ${group.length} ${label}?${filter === "all" && counts.copy ? ` ${counts.copy} of them look like copies.` : ""}`)) return;
    for (const recipe of group) if (await run(recipe.id, () => reviewRecipe(recipe.id, "approved"), "Approved")) done(recipe.id);
  }

  return <>
    <PageHeader title="Requests" subtitle="New and edited recipes waiting for approval. Approved ones go live instantly." onRefresh={load}>{shown.length > 1 && filter !== "copy" && <button type="button" onClick={approveAll} className={btn.ghost}>Approve all</button>}</PageHeader>
    <ErrorBox message={error || loadError} />
    {recipes && recipes.length > 0 && <Tabs value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: counts.all }, { value: "copy", label: "Likely copies", count: counts.copy }, { value: "similar", label: "Same dish?", count: counts.similar }, { value: "new", label: "New dishes", count: counts.new }]} />}
    {!recipes ? <Loading /> : recipes.length === 0 ? <Empty>All caught up! New recipes will appear here for review.</Empty> : shown.length === 0 ? <Empty>Nothing in this group.</Empty> :
      <div className="grid gap-4">{shown.map((recipe) => <RecipeReviewCard key={recipe.id} recipe={recipe} duplicate={duplicates[recipe.id]} expanded={recipes.length <= 3} busy={busyId === recipe.id}
        onApprove={async () => { if (await run(recipe.id, () => reviewRecipe(recipe.id, "approved"), `"${recipe.title}" is now live`)) done(recipe.id); }}
        onReject={async (reason) => { if (await run(recipe.id, () => reviewRecipe(recipe.id, "rejected", reason), "Recipe rejected; the cook will see your reason")) done(recipe.id); }} />)}</div>}
    <Toast message={toast} />
  </>;
}
