"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateSetting } from "@/lib/admin";
import { ErrorBox, Loading, PageHeader, Toast, btn, useAction } from "@/components/admin/ui";

/** Site-wide switches. Both take effect for every visitor on their next page load. */
export function AdminSettings() {
  const [autoApprove, setAutoApprove] = useState<boolean>(); const [announcement, setAnnouncement] = useState(""); const [saved, setSaved] = useState("");
  const { error, toast, busyId, run } = useAction();
  // isCurrent lets the effect drop a response that arrives after it was cleaned up, so a late load can't wipe what the admin is typing.
  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    const { data } = await createClient().from("site_settings").select("key, value");
    if (!isCurrent()) return;
    const get = (key: string) => data?.find((row) => row.key === key)?.value;
    setAutoApprove(get("auto_approve") === true);
    const text = typeof get("announcement") === "string" ? (get("announcement") as string) : ""; setAnnouncement(text); setSaved(text);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches data; state is only set once the request resolves
  useEffect(() => { let current = true; load(() => current); return () => { current = false; }; }, [load]);
  if (autoApprove === undefined) return <><PageHeader title="Settings" /><Loading /></>;

  return <>
    <PageHeader title="Settings" subtitle="Control how Rasoi Hub behaves for everyone." />
    <ErrorBox message={error} />
    <section className="rounded-2xl border border-[#eadfd2] bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1"><h2 className="font-serif text-xl font-bold text-[#39241b]">Auto-approve new recipes</h2><p className="mt-1 text-sm text-[#927b6d]">{autoApprove ? "On: new and edited recipes go live immediately, without review." : "Off: every new or edited recipe waits in Requests until an admin approves it. Recommended."}</p></div>
        <button type="button" role="switch" aria-checked={autoApprove} aria-label="Auto-approve new recipes" disabled={busyId === "auto"} onClick={async () => { const next = !autoApprove; if (await run("auto", () => updateSetting("auto_approve", next), next ? "Auto-approve is on" : "Auto-approve is off")) setAutoApprove(next); }}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${autoApprove ? "bg-[#2f7b4e]" : "bg-[#d8c5b4]"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${autoApprove ? "left-7" : "left-1"}`} /></button>
      </div>
    </section>
    <section className="mt-4 rounded-2xl border border-[#eadfd2] bg-white p-5">
      <h2 className="font-serif text-xl font-bold text-[#39241b]">Announcement banner</h2>
      <p className="mt-1 text-sm text-[#927b6d]">Shown at the top of every page of the website. Leave empty to hide it.</p>
      <textarea value={announcement} onChange={(event) => setAnnouncement(event.target.value)} maxLength={280} rows={3} className="field mt-3 resize-y" placeholder="e.g. Diwali special: share your favourite mithai recipe this week!" />
      <p className="mt-1 text-right text-xs text-[#a99587]">{announcement.length}/280</p>
      {announcement.trim() && <p className="mt-2 rounded-xl bg-[#fff4df] px-4 py-2.5 text-center text-sm font-semibold text-[#8a5a00]">Preview: {announcement.trim()}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busyId === "ann" || announcement.trim() === saved.trim()} onClick={async () => { const text = announcement.trim(); if (await run("ann", () => updateSetting("announcement", text), text ? "Announcement is live" : "Announcement removed")) setSaved(text); }} className={btn.primary}>Save announcement</button>
        {saved && <button type="button" disabled={busyId === "ann"} onClick={async () => { if (await run("ann", () => updateSetting("announcement", ""), "Announcement removed")) { setSaved(""); setAnnouncement(""); } }} className={btn.ghost}>Remove</button>}
      </div>
    </section>
    <Toast message={toast} />
  </>;
}
