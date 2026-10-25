import { runSql } from "./helpers";

// The test admin (account C) approves and rejects "[test]" recipes on every run. Its entries would otherwise fill
// the real admins' activity log, so remove them afterwards (skipped without SUPABASE_ACCESS_TOKEN).
export default async function globalTeardown() {
  const email = process.env.RASOI_TEST_C_EMAIL;
  if (!email || !process.env.SUPABASE_ACCESS_TOKEN || !/\+rasoitest/i.test(email)) return;
  await runSql(`delete from public.admin_actions where admin_id = (select id from auth.users where email = '${email.replace(/'/g, "''")}')`);
}
