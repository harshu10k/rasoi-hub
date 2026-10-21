import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Account = { email: string; password: string };

// Tests create and wipe data, so refuse to run as anything but a dedicated "+rasoitest" address.
for (const name of ["RASOI_TEST_A_EMAIL", "RASOI_TEST_B_EMAIL"]) {
  const email = process.env[name];
  if (email && !/\+rasoitest/i.test(email)) throw new Error(`${name}=${email} is not a dedicated test account (needs "+rasoitest" in it). Tests delete that account's data.`);
}

export const accountA: Account | undefined = process.env.RASOI_TEST_A_EMAIL ? { email: process.env.RASOI_TEST_A_EMAIL, password: process.env.RASOI_TEST_A_PASSWORD ?? "" } : undefined;
export const accountB: Account | undefined = process.env.RASOI_TEST_B_EMAIL ? { email: process.env.RASOI_TEST_B_EMAIL, password: process.env.RASOI_TEST_B_PASSWORD ?? "" } : undefined;

/** Skips the current test (with a reason) unless the needed test accounts are configured. */
export function needAccounts(...accounts: (Account | undefined)[]) {
  test.skip(accounts.some((account) => !account), "Set RASOI_TEST_A_* / RASOI_TEST_B_* in .env.test.local (see tests/README.md)");
}

/** Every row the tests create starts with this, so leftovers are easy to find and clean up. */
export const TEST_PREFIX = "[test] ";

export function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
}

/** A Supabase client signed in as `account` — exactly what a user can do from their browser's devtools. */
export async function clientAs(account: Account) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword(account);
  if (error || !data.user) throw new Error(`Could not sign in ${account.email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

export function recipeFields(overrides: Record<string, unknown> = {}) {
  return {
    title: `${TEST_PREFIX}Chai ${Date.now()}`, category: "Drinks", is_veg: true, cooking_time: 10, servings: 2,
    image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=85",
    ingredients: ["Water", "Tea leaves"], steps: ["Boil water.", "Add tea leaves."], ...overrides,
  };
}

export async function createRecipe(client: SupabaseClient, authorId: string, overrides: Record<string, unknown> = {}) {
  const { data, error } = await client.from("recipes").insert({ ...recipeFields(overrides), author_id: authorId }).select("id").single();
  if (error) throw new Error(`createRecipe failed: ${error.message}`);
  return data.id as string;
}

/**
 * Wipes everything this test account owns: recipes, comments, ratings, favourites and photos, and resets its name.
 * Deliberately not limited to "[test]" rows: a test that expects the database to reject junk would otherwise leave
 * that junk behind whenever the rule is missing. Only ever called for the dedicated test accounts.
 */
export async function cleanup(client: SupabaseClient, userId: string) {
  await client.from("comments").delete().eq("user_id", userId);
  await client.from("favourites").delete().eq("user_id", userId);
  await client.from("ratings").delete().eq("user_id", userId);
  await client.from("recipes").delete().eq("author_id", userId);
  await client.from("profiles").update({ full_name: "Test cook" }).eq("id", userId);
  const { data: files } = await client.storage.from("recipe-images").list(userId);
  if (files?.length) await client.storage.from("recipe-images").remove(files.map((file) => `${userId}/${file.name}`));
}

export async function login(page: Page, account: Account, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("you@example.com").fill(account.email);
  await page.getByPlaceholder("At least 6 characters").fill(account.password);
  await page.getByRole("button", { name: "Log in to Rasoi Hub" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Next.js keeps visited pages mounted but hidden for back navigation; only look at what the user can see. */
export const visible = (page: Page, selector: string) => page.locator(`${selector}:visible`);
