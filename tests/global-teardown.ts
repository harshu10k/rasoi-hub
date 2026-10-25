import { runSql } from "./helpers";

// Undoes global-setup.ts: account C goes back to a plain user, and its approvals of "[test]" recipes are removed
// from the activity log so they don't fill the real admins' feed (skipped without SUPABASE_ACCESS_TOKEN).
export default async function globalTeardown() {
  const email = process.env.RASOI_TEST_C_EMAIL;
  if (!email || !process.env.SUPABASE_ACCESS_TOKEN || !/\+rasoitest/i.test(email)) return;
  const id = `(select id from auth.users where email = '${email.replace(/'/g, "''")}')`;
  await runSql(`update public.profiles set role = 'user' where role = 'admin' and id = ${id}; delete from public.admin_actions where admin_id = ${id};`);
}
