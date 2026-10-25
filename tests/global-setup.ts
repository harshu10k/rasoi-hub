import { runSql } from "./helpers";

// Account C acts as the admin in tests (approving "[test]" recipes, the admin portal tests). It is only an admin
// while tests run, so it never shows up in the real admins list; global-teardown.ts takes the role away again.
export default async function globalSetup() {
  const email = process.env.RASOI_TEST_C_EMAIL;
  if (!email || !process.env.SUPABASE_ACCESS_TOKEN || !/\+rasoitest/i.test(email)) return;
  await runSql(`update public.profiles set role = 'admin' where role = 'user' and id = (select id from auth.users where email = '${email.replace(/'/g, "''")}')`);
}
