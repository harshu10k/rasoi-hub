"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { describeAction, formatDate, timeAgo, type AdminAction } from "@/lib/admin";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

/** Audit trail: which admin did what, and when. Written by the database functions, so it can't be skipped or edited. */
export function AdminActivity() {
  const [log, setLog] = useState<AdminAction[]>(); const [error, setError] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("admin_actions").select("id, action, target_type, target_id, details, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(300);
    setError(error?.message ?? ""); setLog((data ?? []) as unknown as AdminAction[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { load(); }, [load]);
  return <>
    <PageHeader title="Activity" subtitle="A permanent record of every admin action." onRefresh={load} />
    <ErrorBox message={error} />
    {!log ? <Loading /> : log.length === 0 ? <Empty>No admin actions yet.</Empty> :
      <ol className="grid gap-2">{log.map((item) => <li key={item.id} className="rounded-2xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#765f51]"><b className="text-[#39241b]">{item.profiles?.full_name ?? "An admin"}</b> {describeAction(item)}<span className="mt-0.5 block text-xs text-[#a99587]" title={new Date(item.created_at).toLocaleString()}>{timeAgo(item.created_at)} · {formatDate(item.created_at)}</span></li>)}</ol>}
  </>;
}
