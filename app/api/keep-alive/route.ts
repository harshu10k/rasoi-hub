import { createClient } from "@supabase/supabase-js";

// Supabase pauses free projects after a week without activity, which takes login and every recipe offline.
// A Vercel cron (vercel.json) calls this once a day so the project always has recent activity. It only reads one
// public recipe id, so it is safe to leave open.
export async function GET(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await supabase.from("recipes").select("id").limit(1);
  const body = { ok: !error, checkedAt: new Date().toISOString(), cron: request.headers.get("user-agent")?.includes("vercel-cron") ?? false };
  return Response.json(error ? { ...body, error: error.message } : body, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
