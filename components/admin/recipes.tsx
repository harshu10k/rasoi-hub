"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminRecipeSelect, deleteRecipe, reviewRecipe, setFeatured, type AdminRecipe } from "@/lib/admin";
import type { RecipeStatus } from "@/lib/types";
import { refreshPendingBadge } from "@/components/admin/admin-shell";
import { RecipeReviewCard } from "@/components/admin/recipe-review";
import { Empty, ErrorBox, Loading, PageHeader, Tabs, Toast, useAction, useUrlFilter } from "@/components/admin/ui";

const filters = ["all", "approved", "pending", "rejected", "featured"] as const;

export function AdminRecipes() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>(); const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useUrlFilter(filters, "all"); const [query, setQuery] = useState("");
  const { error, toast, busyId, run } = useAction();
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("recipes").select(adminRecipeSelect).order("created_at", { ascending: false });
    setLoadError(error?.message ?? ""); setRecipes((data ?? []) as unknown as AdminRecipe[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const list = recipes ?? [];
    return { all: list.length, approved: list.filter((r) => r.status === "approved").length, pending: list.filter((r) => r.status === "pending").length, rejected: list.filter((r) => r.status === "rejected").length, featured: list.filter((r) => r.is_featured).length };
  }, [recipes]);
  const shown = (recipes ?? []).filter((recipe) => (filter === "all" || (filter === "featured" ? recipe.is_featured : recipe.status === filter))
    && `${recipe.title} ${recipe.category} ${recipe.profiles?.full_name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  const patch = (id: string, changes: Partial<AdminRecipe>) => setRecipes((list) => list?.map((item) => item.id === id ? { ...item, ...changes } : item));
  const review = async (recipe: AdminRecipe, status: RecipeStatus, reason?: string) => {
    const messages = { approved: "Approved and live", rejected: "Rejected", pending: "Moved back to review (hidden from the site)" };
    if (await run(recipe.id, () => reviewRecipe(recipe.id, status, reason), messages[status])) { patch(recipe.id, { status, rejection_reason: status === "rejected" ? reason ?? null : null, is_featured: status === "approved" && recipe.is_featured }); refreshPendingBadge(); }
  };

  return <>
    <PageHeader title="Recipes" subtitle="Every recipe on Rasoi Hub. Changes here show on the website straight away." onRefresh={load} />
    <ErrorBox message={error || loadError} />
    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, category or cook..." className="field mb-3" />
    <Tabs value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: counts.all }, { value: "approved", label: "Live", count: counts.approved }, { value: "pending", label: "Pending", count: counts.pending }, { value: "rejected", label: "Rejected", count: counts.rejected }, { value: "featured", label: "Featured", count: counts.featured }]} />
    {!recipes ? <Loading /> : shown.length === 0 ? <Empty>No recipes match.</Empty> :
      <div className="grid gap-4">{shown.map((recipe) => <RecipeReviewCard key={recipe.id} recipe={recipe} busy={busyId === recipe.id}
        onApprove={() => review(recipe, "approved")} onReject={(reason) => review(recipe, "rejected", reason)} onPending={() => review(recipe, "pending")}
        onFeature={async (featured) => { if (await run(recipe.id, () => setFeatured(recipe.id, featured), featured ? "Featured at the top of the home page" : "No longer featured")) patch(recipe.id, { is_featured: featured }); }}
        onDelete={async () => { if (!window.confirm(`Delete "${recipe.title}" permanently? Its comments, ratings and photo go too.`)) return; if (await run(recipe.id, () => deleteRecipe(recipe.id), "Recipe deleted")) { setRecipes((list) => list?.filter((item) => item.id !== recipe.id)); refreshPendingBadge(); } }} />)}</div>}
    <Toast message={toast} />
  </>;
}
