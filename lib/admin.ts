"use client";

import { createClient } from "@/lib/supabase/client";
import type { RecipeStatus } from "@/lib/types";

export type AdminStats = {
  users: number; new_users_7d: number; active_users_7d: number; banned: number; admins: number;
  recipes: number; approved: number; pending: number; rejected: number; featured: number;
  comments: number; ratings: number; favourites: number;
  signups_14d: { day: string; count: number }[]; top_cooks: { id: string; name: string; recipes: number }[];
};

export type AdminUser = {
  id: string; name: string | null; email: string; role: "user" | "admin" | "owner"; is_banned: boolean; banned_reason: string | null;
  signed_up_with: string; created_at: string; last_sign_in_at: string | null; email_confirmed: boolean;
  recipes: number; approved: number; pending: number; comments: number; ratings: number;
};

export type AdminRecipe = {
  id: string; title: string; description: string | null; category: string; is_veg: boolean; is_hostel_friendly: boolean; cooking_time: number; servings: number;
  image_url: string; ingredients: unknown; steps: unknown; status: RecipeStatus; rejection_reason: string | null; is_featured: boolean;
  created_at: string; updated_at: string; reviewed_at: string | null; author_id: string; profiles: { full_name: string } | null; ratings: { rating: number }[] | null;
};

export type AdminComment = { id: string; body: string; created_at: string; user_id: string; recipe_id: string; profiles: { full_name: string } | null; recipes: { title: string } | null };
export type AdminAction = { id: string; action: string; target_type: string | null; target_id: string | null; details: Record<string, unknown>; created_at: string; profiles: { full_name: string } | null };

/** The closest earlier recipe to a pending one (see admin_find_duplicates in supabase/schema.sql). */
export type DuplicateMatch = {
  recipe_id: string; match_id: string; match_title: string; match_author: string | null; match_status: RecipeStatus; same_author: boolean;
  title_score: number; ingredients_score: number; steps_score: number; score: number; kind: "copy" | "similar";
};

export const adminRecipeSelect = "id, title, description, category, is_veg, is_hostel_friendly, cooking_time, servings, image_url, ingredients, steps, status, rejection_reason, is_featured, created_at, updated_at, reviewed_at, author_id, profiles!recipes_author_id_fkey(full_name), ratings(rating)";

/** Calls an admin database function and returns its data, throwing the database's own (human-written) message. */
export async function adminRpc<T = void>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await createClient().rpc(fn, args);
  if (error) throw new Error(error.code === "42501" && !error.message.includes(" ") ? "Admins only." : error.message);
  return data as T;
}

/** Duplicate check for the given recipes, keyed by recipe id; recipes with no close match are absent. */
export async function findDuplicates(ids: string[]) {
  if (!ids.length) return {} as Record<string, DuplicateMatch>;
  const rows = await adminRpc<DuplicateMatch[]>("admin_find_duplicates", { p_recipes: ids });
  return Object.fromEntries(rows.map((row) => [row.recipe_id, row])) as Record<string, DuplicateMatch>;
}

export const duplicateReason = (match: DuplicateMatch) => match.same_author
  ? `You already shared this recipe ("${match.match_title}"). Edit that one instead of posting it again.`
  : `This recipe is already on Rasoi Hub as "${match.match_title}". Please share your own recipe or add your own twist.`;

export const reviewRecipe = (id: string, status: RecipeStatus, reason?: string) => adminRpc("admin_review_recipe", { p_recipe: id, p_status: status, p_reason: reason ?? null });
export const setFeatured = (id: string, featured: boolean) => adminRpc("admin_set_featured", { p_recipe: id, p_featured: featured });
export const deleteComment = (id: string) => adminRpc("admin_delete_comment", { p_comment: id });
export const setRole = (userId: string, role: "user" | "admin") => adminRpc("admin_set_role", { p_user: userId, p_role: role });
export const setBan = (userId: string, banned: boolean, reason?: string) => adminRpc("admin_set_ban", { p_user: userId, p_banned: banned, p_reason: reason ?? null });
export const updateSetting = (key: "auto_approve" | "announcement", value: boolean | string) => adminRpc("admin_update_setting", { p_key: key, p_value: value });

/** Deletes a recipe and, if it was an uploaded photo, removes the file from storage too. */
export async function deleteRecipe(id: string) {
  const imageUrl = await adminRpc<string | null>("admin_delete_recipe", { p_recipe: id });
  const path = imageUrl?.split("/storage/v1/object/public/recipe-images/")[1];
  if (path) await createClient().storage.from("recipe-images").remove([decodeURIComponent(path)]);
}

export const textList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function timeAgo(value: string | null) {
  if (!value) return "never";
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [604800, "w"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [size, label] of units) if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  return "just now";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Turns an activity-log entry into a sentence. */
export function describeAction(action: AdminAction) {
  const d = action.details ?? {};
  const title = typeof d.title === "string" ? `"${d.title}"` : "a recipe";
  const name = typeof d.name === "string" && d.name ? d.name : "a user";
  switch (action.action) {
    case "recipe.approved": return `approved ${title}`;
    case "recipe.rejected": return `rejected ${title}${typeof d.reason === "string" && d.reason ? ` (${d.reason})` : ""}`;
    case "recipe.pending": return `sent ${title} back to review`;
    case "recipe.featured": return `featured ${title}`;
    case "recipe.unfeatured": return `un-featured ${title}`;
    case "recipe.deleted": return `deleted ${title}`;
    case "comment.deleted": return `deleted a comment${typeof d.body === "string" ? `: "${d.body.slice(0, 80)}"` : ""}`;
    case "user.role.admin": return `made ${name} an admin`;
    case "user.role.user": return `removed admin rights from ${name}`;
    case "user.banned": return `banned ${name}${typeof d.reason === "string" && d.reason ? ` (${d.reason})` : ""}`;
    case "user.unbanned": return `unbanned ${name}`;
    case "setting.auto_approve": return `turned auto-approve ${d.value === true ? "on" : "off"}`;
    case "setting.announcement": return typeof d.value === "string" && d.value ? `set the announcement: "${d.value}"` : "cleared the announcement";
    default: return action.action;
  }
}
