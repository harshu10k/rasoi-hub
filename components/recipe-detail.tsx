"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Clock3, Heart, Pencil, Share2, Star, Trash2, Users } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useFavourites } from "@/lib/favourites";
import { friendlyDbError, recipeActionError } from "@/lib/recipes";
import { messageFor } from "@/lib/auth-messages";

type Comment = { id: string; body: string; created_at: string; user_id: string; profiles: { full_name: string } | null };
const commentSelect = "id, body, created_at, user_id, profiles(full_name)";
const pageNotices = {
  published: "Your recipe is live! Everyone can see it now.", updated: "Changes saved.",
  submitted: "Sent for review! An admin will check it soon. You can follow its status in My recipes.",
  resubmitted: "Changes saved and sent for review. It will be visible again once an admin approves it.",
} as const;
const noopSubscribe = () => () => {};

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const { ids, toggle } = useFavourites();
  const saved = ids.has(recipe.id);
  const [userId, setUserId] = useState<string>();
  const [rating, setRating] = useState(0);
  const [ratingStats, setRatingStats] = useState({ sum: (recipe.rating ?? 0) * (recipe.rating_count ?? 0), count: recipe.rating_count ?? 0 });
  const [comment, setComment] = useState(""); const [comments, setComments] = useState<Comment[]>([]); const [posting, setPosting] = useState(false); const [deleting, setDeleting] = useState(false);
  const pageNotice = useSyncExternalStore(noopSubscribe, () => messageFor(pageNotices, new URLSearchParams(window.location.search).get("notice")), () => "");
  const [notice, setNotice] = useState<{ text: string; ok?: boolean }>();
  const say = (text: string, ok = false) => setNotice(text ? { text, ok } : undefined);
  const shownNotice = notice ?? (pageNotice ? { text: pageNotice, ok: true } : undefined);
  const isOwner = Boolean(userId && recipe.author_id === userId);
  const average = ratingStats.count ? ratingStats.sum / ratingStats.count : 0;

  useEffect(() => {
    const supabase = createClient();
    supabase.from("comments").select(commentSelect).eq("recipe_id", recipe.id).order("created_at", { ascending: false }).then(({ data }) => setComments((data ?? []) as unknown as Comment[]));
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) return;
      setUserId(auth.user.id);
      const { data } = await supabase.from("ratings").select("rating").eq("recipe_id", recipe.id).eq("user_id", auth.user.id).maybeSingle();
      if (data) setRating(data.rating);
    });
  }, [recipe.id]);

  async function save() { const error = await toggle(recipe.id); say(error || (saved ? "Removed from your saved recipes." : "Saved! Find it under Saved."), !error); }
  async function share() {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) { await navigator.share({ title: recipe.title, text: recipe.description, url }); return; }
      await navigator.clipboard.writeText(url); say("Link copied to clipboard.", true);
    } catch (error) { if ((error as Error).name !== "AbortError") say("Could not share. Copy the link from the address bar."); }
  }
  async function rate(value: number) {
    const supabase = createClient(); const { data } = await supabase.auth.getUser();
    if (!data.user) { say("Log in to rate recipes."); return; }
    const previous = rating; const previousStats = ratingStats;
    setRating(value); setRatingStats(({ sum, count }) => previous ? { sum: sum - previous + value, count } : { sum: sum + value, count: count + 1 });
    const { error } = await supabase.from("ratings").upsert({ recipe_id: recipe.id, user_id: data.user.id, rating: value }, { onConflict: "user_id,recipe_id" });
    if (error) { setRating(previous); setRatingStats(previousStats); say(await recipeActionError(supabase, recipe.id, error)); } else say(`Thanks! You rated this ${value} star${value > 1 ? "s" : ""}.`, true);
  }
  async function addComment(event: React.FormEvent) {
    event.preventDefault(); if (!comment.trim()) return;
    const supabase = createClient(); const { data } = await supabase.auth.getUser();
    if (!data.user) { say("Log in to join the conversation."); return; }
    setPosting(true);
    const { data: row, error } = await supabase.from("comments").insert({ recipe_id: recipe.id, user_id: data.user.id, body: comment.trim() }).select(commentSelect).single();
    setPosting(false);
    if (error) { say(await recipeActionError(supabase, recipe.id, error)); return; }
    setComments((current) => [row as unknown as Comment, ...current]); setComment(""); say("Comment added.", true);
  }
  async function deleteComment(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    const { error } = await createClient().from("comments").delete().eq("id", id);
    if (error) say(friendlyDbError(error)); else { setComments((current) => current.filter((item) => item.id !== id)); say("Comment deleted.", true); }
  }
  async function deleteRecipe() {
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) { setDeleting(false); say(friendlyDbError(error)); return; }
    // Best effort: remove the uploaded photo too. Default/stock photos live elsewhere and are left alone.
    const path = recipe.image_url.split("/storage/v1/object/public/recipe-images/")[1];
    if (path) await supabase.storage.from("recipe-images").remove([decodeURIComponent(path)]);
    router.push("/my-recipes"); router.refresh();
  }

  return <main className="mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-8 lg:px-8 lg:py-12"><Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#927b6d] hover:text-[#c8501e]"><ArrowLeft size={16} /> Back to recipes</Link>{recipe.status && recipe.status !== "approved" && <div role="note" className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${recipe.status === "rejected" ? "border-[#f0c2b2] bg-[#fff0e8] text-[#b33f20]" : "border-[#f3d9a4] bg-[#fff8e6] text-[#8a5a00]"}`}>{recipe.status === "pending" ? <><b>Waiting for approval.</b> Only you and the admins can see this recipe until it is approved.</> : <><b>Not approved.</b> {recipe.rejection_reason ? `Reason: ${recipe.rejection_reason.replace(/[.!\s]+$/, "")}. ` : ""}Edit and save it to send it for review again.</>}</div>}<div className="grid overflow-hidden rounded-[2rem] border border-[#eadfd2] bg-white shadow-xl shadow-[#5b361f]/5 lg:grid-cols-[1.05fr_.95fr]"><div className="aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[620px]"><img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" /></div><div className="p-5 sm:p-10"><div className="flex items-center justify-between"><span className="rounded-full bg-[#fff0e8] px-3 py-1.5 text-xs font-bold text-[#c8501e]">{recipe.category}</span><div className="flex gap-2"><button aria-label="Share recipe" title="Share" onClick={share} className="icon-button hover:text-[#c8501e]"><Share2 size={18} /></button><button aria-label={saved ? "Remove from saved" : "Save recipe"} title={saved ? "Saved" : "Save"} aria-pressed={saved} onClick={save} className={`icon-button hover:text-[#c8501e] ${saved ? "text-[#c8501e]" : ""}`}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button></div></div><h1 className="mt-7 font-serif text-4xl font-bold leading-tight text-[#39241b] sm:text-5xl">{recipe.title}</h1><p className="mt-4 leading-7 text-[#765f51]">{recipe.description}</p><div className="mt-6 flex flex-wrap gap-4 border-y border-[#eadfd2] py-5 text-sm text-[#765f51]"><span className="flex items-center gap-2"><Clock3 size={17} className="text-[#c8501e]" />{recipe.cooking_time} min me taiyar</span><span className="flex items-center gap-2"><Users size={17} className="text-[#c8501e]" />Serves {recipe.servings}</span><span className="flex items-center gap-1 font-bold text-[#bc7415]"><Star size={16} fill="currentColor" />{ratingStats.count ? average.toFixed(1) : "New"} ({ratingStats.count})</span>{recipe.is_hostel_friendly && <span className="rounded-full bg-[#fff4df] px-2.5 py-0.5 text-xs font-bold text-[#b96100]">Hostel friendly</span>}</div><p className="mt-6 text-sm text-[#927b6d]">Shared by <b className="text-[#39241b]">{isOwner ? "you" : recipe.author_name}</b></p>{isOwner && <div className="mt-5 flex flex-wrap gap-2"><Link href={`/recipe/${recipe.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-[#eadfd2] px-4 py-2 text-sm font-bold text-[#39241b] hover:border-[#ff920d]"><Pencil size={15} /> Edit recipe</Link><button onClick={deleteRecipe} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl border border-[#eadfd2] px-4 py-2 text-sm font-bold text-[#b33f20] hover:border-[#b33f20] disabled:opacity-60"><Trash2 size={15} /> {deleting ? "Deleting..." : "Delete"}</button></div>}<div className="mt-8"><h2 className="font-serif text-2xl font-bold text-[#39241b]">Rate this recipe</h2><div className="mt-3 flex gap-1">{[1,2,3,4,5].map((item) => <button key={item} aria-label={`${item} stars`} aria-pressed={item === rating} onClick={() => rate(item)} className={`${item <= rating ? "text-[#bc7415]" : "text-[#e3c69e]"} hover:text-[#bc7415]`}><Star size={25} fill={item <= rating ? "currentColor" : "none"} /></button>)}</div>{rating > 0 && <p className="mt-2 text-xs text-[#a99587]">Your rating: {rating}/5. Tap a star to change it.</p>}</div>{shownNotice && <p role="status" className={`mt-4 rounded-xl px-3 py-2 text-sm ${shownNotice.ok ? "bg-[#edf8ee] text-[#2f7b4e]" : "bg-[#fff0e8] text-[#b33f20]"}`}>{shownNotice.text}</p>}</div></div><div className="mt-10 grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><section><h2 className="font-serif text-3xl font-bold text-[#39241b]">Ingredients</h2><ul className="mt-5 grid gap-3">{recipe.ingredients.map((item, index) => <li key={`${index}-${item}`} className="rounded-xl bg-white px-4 py-3 text-[#765f51] shadow-sm ring-1 ring-[#eadfd2]">{item}</li>)}</ul></section><section><h2 className="font-serif text-3xl font-bold text-[#39241b]">Method</h2><ol className="mt-5 grid gap-5">{recipe.steps.map((item, index) => <li key={`${index}-${item}`} className="flex gap-4 text-[#765f51]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c8501e] font-bold text-white">{index + 1}</span><span className="pt-1 leading-6">{item}</span></li>)}</ol></section></div><section className="mt-12 max-w-2xl"><h2 className="font-serif text-3xl font-bold text-[#39241b]">What did you think?</h2><form onSubmit={addComment} className="mt-4 flex gap-3"><input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Share a cooking note..." className="field flex-1" /><button disabled={posting || !comment.trim()} className="rounded-xl bg-[#39241b] px-5 font-bold text-white disabled:opacity-60">{posting ? "Posting..." : "Post"}</button></form><ul className="mt-6 grid gap-3">{comments.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[#eadfd2]"><div><p className="text-sm text-[#765f51]">{item.body}</p><p className="mt-1 text-xs text-[#a99587]"><b>{item.user_id === userId ? "You" : item.profiles?.full_name ?? "Rasoi friend"}</b> · {new Date(item.created_at).toLocaleDateString()}</p></div>{item.user_id === userId && <button aria-label="Delete comment" title="Delete comment" onClick={() => deleteComment(item.id)} className="p-1 text-[#a99587] hover:text-[#b33f20]"><Trash2 size={15} /></button>}</li>)}{!comments.length && <li className="text-sm text-[#a99587]">No notes yet. Be the first to share one.</li>}</ul></section></main>;
}
