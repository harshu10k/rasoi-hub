"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteComment, timeAgo, type AdminComment } from "@/lib/admin";
import { Empty, ErrorBox, Loading, PageHeader, Toast, btn, useAction } from "@/components/admin/ui";

/** Every review/comment on the site, newest first, with one-tap removal. */
export function AdminComments() {
  const [comments, setComments] = useState<AdminComment[]>(); const [loadError, setLoadError] = useState(""); const [query, setQuery] = useState("");
  const { error, toast, busyId, run } = useAction();
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("comments").select("id, body, created_at, user_id, recipe_id, profiles(full_name), recipes(title)").order("created_at", { ascending: false }).limit(300);
    setLoadError(error?.message ?? ""); setComments((data ?? []) as unknown as AdminComment[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); }, [load]);
  const shown = (comments ?? []).filter((comment) => `${comment.body} ${comment.profiles?.full_name ?? ""} ${comment.recipes?.title ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <>
    <PageHeader title="Comments" subtitle="Reviews and cooking notes from every recipe. Deleting one removes it from the site immediately." onRefresh={load} />
    <ErrorBox message={error || loadError} />
    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search comments, people or recipes..." className="field mb-4" />
    {!comments ? <Loading /> : shown.length === 0 ? <Empty>{comments.length ? "No comments match." : "No comments yet."}</Empty> :
      <ul className="grid gap-3">{shown.map((comment) => <li key={comment.id} className="flex items-start gap-3 rounded-2xl border border-[#eadfd2] bg-white p-4">
        <div className="min-w-0 flex-1"><p className="text-sm text-[#39241b]">{comment.body}</p><p className="mt-1.5 text-xs text-[#a99587]"><b className="text-[#765f51]">{comment.profiles?.full_name ?? "Someone"}</b> on <Link href={`/recipe/${comment.recipe_id}`} target="_blank" className="font-semibold text-[#c8501e]">{comment.recipes?.title ?? "a recipe"}</Link> · {timeAgo(comment.created_at)}</p></div>
        <button type="button" aria-label="Delete comment" disabled={busyId === comment.id} onClick={async () => { if (!window.confirm("Delete this comment for everyone?")) return; if (await run(comment.id, () => deleteComment(comment.id), "Comment deleted")) setComments((list) => list?.filter((item) => item.id !== comment.id)); }} className={`${btn.danger} shrink-0 px-3`}><Trash2 size={16} /></button>
      </li>)}</ul>}
    <Toast message={toast} />
  </>;
}
