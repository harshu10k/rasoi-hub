"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clock3, Copy, ExternalLink, Star, Trash2, Undo2, Users, X } from "lucide-react";
import { duplicateReason, formatDate, textList, timeAgo, type AdminRecipe, type DuplicateMatch } from "@/lib/admin";
import { ReasonForm, StatusBadge, btn } from "@/components/admin/ui";

type Handlers = {
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => Promise<void>;
  onPending?: () => void;
  onFeature?: (featured: boolean) => void;
  onDelete?: () => void;
};

/** One recipe as an admin sees it: everything needed to judge it, plus the moderation buttons. */
export function RecipeReviewCard({ recipe, duplicate, expanded: startExpanded = false, ...actions }: { recipe: AdminRecipe; duplicate?: DuplicateMatch; expanded?: boolean } & Handlers) {
  const [expanded, setExpanded] = useState(startExpanded); const [rejecting, setRejecting] = useState(false);
  const ratings = recipe.ratings ?? []; const average = ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0;
  const ingredients = textList(recipe.ingredients); const steps = textList(recipe.steps);
  return <article className="overflow-hidden rounded-2xl border border-[#eadfd2] bg-white">
    <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
      <img src={recipe.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={recipe.status} />{recipe.is_featured && <span className="inline-flex items-center gap-1 rounded-full bg-[#ff920d] px-2.5 py-0.5 text-xs font-bold text-black"><Star size={11} fill="currentColor" />Featured</span>}<span className="text-xs text-[#a99587]">{recipe.category} · {recipe.is_veg ? "Veg" : "Non-veg"}</span></div>
        <h3 className="mt-1 font-serif text-lg font-bold leading-tight text-[#39241b]">{recipe.title}</h3>
        <p className="mt-0.5 text-xs text-[#927b6d]">by <b>{recipe.profiles?.full_name ?? "Unknown"}</b> · {timeAgo(recipe.created_at)}{ratings.length ? ` · ★ ${average.toFixed(1)} (${ratings.length})` : ""}</p>
        {recipe.status === "rejected" && recipe.rejection_reason && <p className="mt-1 text-xs text-[#b33f20]">Reason: {recipe.rejection_reason}</p>}
        <button type="button" onClick={() => setExpanded((open) => !open)} className="mt-1.5 text-xs font-bold text-[#c8501e]">{expanded ? "Hide details" : "Show full recipe"}</button>
      </div>
    </div>
    {duplicate && <DuplicateNotice match={duplicate} />}
    {expanded && <div className="grid gap-4 border-t border-[#f1e7dc] bg-[#fffcf8] p-4 text-sm text-[#765f51] sm:grid-cols-2">
      <div className="sm:col-span-2"><img src={recipe.image_url} alt={recipe.title} className="max-h-72 w-full rounded-xl object-cover" />{recipe.description && <p className="mt-3 leading-6">{recipe.description}</p>}<p className="mt-2 flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-1"><Clock3 size={13} />{recipe.cooking_time} min</span><span className="flex items-center gap-1"><Users size={13} />Serves {recipe.servings}</span>{recipe.is_hostel_friendly && <span>Hostel friendly</span>}<span>Submitted {formatDate(recipe.created_at)}</span></p></div>
      <div><h4 className="font-bold text-[#39241b]">Ingredients</h4><ul className="mt-1 list-disc pl-5">{ingredients.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
      <div><h4 className="font-bold text-[#39241b]">Steps</h4><ol className="mt-1 list-decimal pl-5">{steps.map((item, index) => <li key={index} className="mb-1">{item}</li>)}</ol></div>
    </div>}
    <div className="flex flex-wrap gap-2 border-t border-[#f1e7dc] p-3">
      {recipe.status !== "approved" && <button type="button" disabled={actions.busy} onClick={actions.onApprove} className={btn.approve}><Check size={16} />Approve</button>}
      {recipe.status !== "rejected" && duplicate?.kind === "copy" && <button type="button" disabled={actions.busy} onClick={() => actions.onReject(duplicateReason(duplicate))} className={btn.danger}><Copy size={16} />Reject as duplicate</button>}
      {recipe.status !== "rejected" && <button type="button" disabled={actions.busy} onClick={() => setRejecting(true)} className={btn.danger}><X size={16} />Reject</button>}
      {recipe.status !== "pending" && actions.onPending && <button type="button" disabled={actions.busy} onClick={actions.onPending} className={btn.ghost}><Undo2 size={16} />Back to review</button>}
      {recipe.status === "approved" && actions.onFeature && <button type="button" disabled={actions.busy} onClick={() => actions.onFeature!(!recipe.is_featured)} className={btn.ghost}><Star size={16} fill={recipe.is_featured ? "currentColor" : "none"} />{recipe.is_featured ? "Unfeature" : "Feature"}</button>}
      <Link href={`/recipe/${recipe.id}`} target="_blank" className={btn.ghost}><ExternalLink size={16} />View</Link>
      {actions.onDelete && <button type="button" disabled={actions.busy} onClick={actions.onDelete} className={`${btn.danger} ml-auto`}><Trash2 size={16} />Delete</button>}
    </div>
    {rejecting && <div className="px-3 pb-3"><ReasonForm label="Why is this recipe not approved?" confirmLabel="Reject recipe" onCancel={() => setRejecting(false)} onSubmit={async (reason) => { await actions.onReject(reason); setRejecting(false); }} /></div>}
  </article>;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Why the duplicate check flagged this recipe, with a link to the earlier one to compare. */
function DuplicateNotice({ match }: { match: DuplicateMatch }) {
  const copy = match.kind === "copy";
  const who = match.same_author ? "the same cook" : match.match_author ?? "another cook";
  return <div className={`border-t px-4 py-3 text-sm ${copy ? "border-[#f0c2b2] bg-[#fff0e8] text-[#b33f20]" : "border-[#f3d9a4] bg-[#fff8e6] text-[#8a5a00]"}`}>
    <p className="flex flex-wrap items-center gap-x-1.5"><Copy size={15} className="shrink-0" /><b>{copy ? (match.same_author ? "Posted twice" : "Likely copy") : "Same dish?"}</b>
      <span>{copy ? "Same ingredients and method as" : "Looks like"} <Link href={`/recipe/${match.match_id}`} target="_blank" className="font-bold underline">{match.match_title}</Link> by {who}{match.match_status === "pending" ? " (also waiting for review)" : ""}.</span></p>
    <p className="mt-1 text-xs opacity-80">Name {percent(match.title_score)} · Ingredients {percent(match.ingredients_score)} · Method {percent(match.steps_score)} similar{!copy && match.steps_score < 0.5 ? ", so it is probably their own version" : ""}</p>
  </div>;
}
