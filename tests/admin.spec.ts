// The admin portal: review queue, roles, bans, settings and the audit log. Every rule is enforced by the database,
// so most checks call Supabase directly (as a user could from devtools); the last block drives the /admin pages.
// Needs test accounts A and B (plain users) and C (admin) in .env.test.local. Creates "[test] " rows and removes them.
import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountA, accountB, accountC, anonClient, cleanup, clientAs, createRecipe, login, needAccounts, recipeFields, TEST_PREFIX } from "./helpers";

type Session = { client: SupabaseClient; userId: string };
let a: Session; let b: Session; let c: Session;
let ownerId: string;

test.beforeAll(async () => {
  if (!accountA || !accountB || !accountC) return;
  a = await clientAs(accountA); b = await clientAs(accountB); c = await clientAs(accountC);
  await cleanup(a.client, a.userId); await cleanup(b.client, b.userId); await cleanup(c.client, c.userId);
  await c.client.rpc("admin_set_ban", { p_user: b.userId, p_banned: false });
  const { data } = await c.client.rpc("admin_list_users");
  ownerId = (data as { id: string; role: string }[]).find((user) => user.role === "owner")!.id;
});
test.afterAll(async () => {
  if (!c) return;
  await c.client.rpc("admin_set_ban", { p_user: b.userId, p_banned: false });
  await c.client.rpc("admin_update_setting", { p_key: "auto_approve", p_value: false });
  await c.client.rpc("admin_update_setting", { p_key: "announcement", p_value: "" });
  await cleanup(a.client, a.userId); await cleanup(b.client, b.userId); await cleanup(c.client, c.userId);
});
test.beforeEach(() => needAccounts(accountA, accountB, accountC));

const publicIds = async (id: string) => (await anonClient().from("recipes").select("id").eq("id", id)).data ?? [];

test.describe("Review queue: user recipes wait for an admin", () => {
  test("a new recipe is pending and hidden from everyone but its author and admins", async () => {
    const id = await createRecipe(a.client, a.userId);
    expect((await a.client.from("recipes").select("status").eq("id", id).single()).data?.status).toBe("pending");
    expect(await publicIds(id)).toHaveLength(0);
    expect((await b.client.from("recipes").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await c.client.from("recipes").select("id").eq("id", id)).data).toHaveLength(1);
  });
  test("an author cannot approve or feature their own recipe", async () => {
    const id = await createRecipe(a.client, a.userId, { status: "approved", is_featured: true });
    const row = (await a.client.from("recipes").select("status, is_featured").eq("id", id).single()).data;
    expect(row).toEqual({ status: "pending", is_featured: false });
    await a.client.from("recipes").update({ status: "approved", is_featured: true }).eq("id", id);
    expect((await a.client.from("recipes").select("status, is_featured").eq("id", id).single()).data).toEqual({ status: "pending", is_featured: false });
    expect(await publicIds(id)).toHaveLength(0);
  });
  test("rejecting needs a reason, which the author then sees", async () => {
    const id = await createRecipe(a.client, a.userId);
    const { error } = await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "rejected", p_reason: "  " });
    expect(error?.message).toContain("reason");
    expect((await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "rejected", p_reason: "Photo is blurry" })).error).toBeNull();
    expect((await a.client.from("recipes").select("status, rejection_reason").eq("id", id).single()).data).toEqual({ status: "rejected", rejection_reason: "Photo is blurry" });
    expect(await publicIds(id)).toHaveLength(0);
  });
  test("editing a rejected recipe sends it back for review", async () => {
    const id = await createRecipe(a.client, a.userId);
    await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "rejected", p_reason: "Needs steps" });
    await a.client.from("recipes").update({ steps: ["Boil water.", "Add tea.", "Strain and serve."] }).eq("id", id);
    expect((await a.client.from("recipes").select("status").eq("id", id).single()).data?.status).toBe("pending");
  });
  test("approving puts it live; editing an approved recipe hides it again until re-approved", async () => {
    const id = await createRecipe(a.client, a.userId);
    expect((await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "approved" })).error).toBeNull();
    expect(await publicIds(id)).toHaveLength(1);
    await a.client.from("recipes").update({ title: `${TEST_PREFIX}Chai v2` }).eq("id", id);
    expect(await publicIds(id)).toHaveLength(0);
  });
  test("admins can feature approved recipes only, and featured ones list first", async () => {
    const pending = await createRecipe(a.client, a.userId);
    expect((await c.client.rpc("admin_set_featured", { p_recipe: pending, p_featured: true })).error?.message).toContain("approved");
    const id = await createRecipe(a.client, a.userId);
    await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "approved" });
    expect((await c.client.rpc("admin_set_featured", { p_recipe: id, p_featured: true })).error).toBeNull();
    const { data } = await anonClient().from("recipes").select("id, is_featured").eq("status", "approved").order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(1);
    expect(data?.[0]).toEqual({ id, is_featured: true });
  });
  test("auto-approve setting lets new recipes go live without review", async () => {
    await c.client.rpc("admin_update_setting", { p_key: "auto_approve", p_value: true });
    try {
      const id = await createRecipe(a.client, a.userId);
      expect(await publicIds(id)).toHaveLength(1);
    } finally { await c.client.rpc("admin_update_setting", { p_key: "auto_approve", p_value: false }); }
    expect((await a.client.from("recipes").select("status").eq("id", await createRecipe(a.client, a.userId)).single()).data?.status).toBe("pending");
  });
  test("admins can delete anyone's recipe", async () => {
    const id = await createRecipe(a.client, a.userId);
    expect((await c.client.rpc("admin_delete_recipe", { p_recipe: id })).error).toBeNull();
    expect((await a.client.from("recipes").select("id").eq("id", id)).data).toHaveLength(0);
  });
});

test.describe("Plain users cannot use admin powers", () => {
  for (const [fn, args] of [
    ["admin_stats", {}], ["admin_list_users", {}], ["admin_review_recipe", { p_recipe: "00000000-0000-0000-0000-000000000000", p_status: "approved" }],
    ["admin_set_role", { p_user: "self", p_role: "admin" }], ["admin_set_ban", { p_user: "other", p_banned: true }],
    ["admin_update_setting", { p_key: "announcement", p_value: "hacked" }], ["admin_delete_comment", { p_comment: "00000000-0000-0000-0000-000000000000" }],
  ] as [string, Record<string, unknown>][]) {
    test(`a user calling ${fn} is refused`, async () => {
      const resolved = Object.fromEntries(Object.entries(args).map(([key, value]) => [key, value === "self" ? a.userId : value === "other" ? b.userId : value]));
      const { error } = await a.client.rpc(fn, resolved);
      expect(error?.message).toBe("Admins only.");
    });
  }
  test("a user cannot make themselves admin or unban themselves by editing their profile", async () => {
    await a.client.from("profiles").update({ role: "admin", is_banned: false } as never).eq("id", a.userId);
    expect((await a.client.from("profiles").select("role").eq("id", a.userId).single()).data?.role).toBe("user");
  });
  test("a user cannot change site settings or read the admin activity log", async () => {
    await a.client.from("site_settings").upsert({ key: "announcement", value: "hacked" });
    expect((await anonClient().from("site_settings").select("value").eq("key", "announcement").maybeSingle()).data?.value).not.toBe("hacked");
    expect((await a.client.from("admin_actions").select("id").limit(1)).data ?? []).toHaveLength(0);
    expect((await c.client.from("admin_actions").select("id").limit(1)).data).toHaveLength(1);
  });
  test("a user cannot delete someone else's comment, but an admin can", async () => {
    const id = await createRecipe(a.client, a.userId);
    await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "approved" });
    const { data } = await b.client.from("comments").insert({ recipe_id: id, user_id: b.userId, body: `${TEST_PREFIX}rude` }).select("id").single();
    await a.client.from("comments").delete().eq("id", data!.id);
    expect((await anonClient().from("comments").select("id").eq("id", data!.id)).data).toHaveLength(1);
    expect((await c.client.rpc("admin_delete_comment", { p_comment: data!.id })).error).toBeNull();
    expect((await anonClient().from("comments").select("id").eq("id", data!.id)).data).toHaveLength(0);
  });
});

test.describe("Bans and roles", () => {
  test("a banned user cannot post, comment, rate or save; unbanning restores it", async () => {
    const id = await createRecipe(a.client, a.userId);
    await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "approved" });
    expect((await c.client.rpc("admin_set_ban", { p_user: b.userId, p_banned: true, p_reason: "Spam" })).error).toBeNull();
    try {
      expect((await b.client.from("recipes").insert({ ...recipeFields(), author_id: b.userId })).error).not.toBeNull();
      expect((await b.client.from("comments").insert({ recipe_id: id, user_id: b.userId, body: `${TEST_PREFIX}hi` })).error).not.toBeNull();
      expect((await b.client.from("ratings").insert({ recipe_id: id, user_id: b.userId, rating: 5 })).error).not.toBeNull();
      expect((await b.client.from("favourites").insert({ recipe_id: id, user_id: b.userId })).error).not.toBeNull();
    } finally { await c.client.rpc("admin_set_ban", { p_user: b.userId, p_banned: false }); }
    expect((await b.client.from("comments").insert({ recipe_id: id, user_id: b.userId, body: `${TEST_PREFIX}hi` })).error).toBeNull();
  });
  test("the owner can never be demoted or banned, and admins cannot ban themselves", async () => {
    expect((await c.client.rpc("admin_set_role", { p_user: ownerId, p_role: "user" })).error?.message).toContain("owner");
    expect((await c.client.rpc("admin_set_ban", { p_user: ownerId, p_banned: true, p_reason: "x" })).error).not.toBeNull();
    expect((await c.client.rpc("admin_set_ban", { p_user: c.userId, p_banned: true, p_reason: "x" })).error?.message).toContain("yourself");
  });
  test("any admin can promote a user, but only the owner can remove an admin", async () => {
    expect((await c.client.rpc("admin_set_role", { p_user: b.userId, p_role: "admin" })).error).toBeNull();
    try {
      expect((await b.client.rpc("admin_stats")).error).toBeNull(); // B now has the same access
      expect((await c.client.rpc("admin_set_role", { p_user: b.userId, p_role: "user" })).error?.message).toContain("Only the owner");
      expect((await c.client.rpc("admin_set_ban", { p_user: b.userId, p_banned: true, p_reason: "x" })).error?.message).toContain("Remove admin rights");
    } finally {
      await resetRole(b.userId); // only the owner may demote, and the owner isn't a test account
    }
    expect((await b.client.rpc("admin_stats")).error?.message).toBe("Admins only.");
  });
  test("every admin action is written to the activity log", async () => {
    const id = await createRecipe(a.client, a.userId);
    await c.client.rpc("admin_review_recipe", { p_recipe: id, p_status: "approved" });
    const { data } = await c.client.from("admin_actions").select("action, admin_id, target_id").eq("target_id", id);
    expect(data).toContainEqual({ action: "recipe.approved", admin_id: c.userId, target_id: id });
  });
});

test.describe("Admin pages", () => {
  test("/admin sends signed-out visitors to log in, and shows plain users a 404", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await login(page, accountA!, "/");
    // The access check runs inside a streamed Suspense boundary, so the status is already sent; the not-found page replaces the content.
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "This dish isn't on the menu." }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("Everyone who has signed up")).toHaveCount(0);
  });
  test("an admin approves a pending recipe from Requests and it goes live", async ({ page }) => {
    const id = await createRecipe(a.client, a.userId, { title: `${TEST_PREFIX}Masala chai ${Date.now()}` });
    const title = (await a.client.from("recipes").select("title").eq("id", id).single()).data!.title as string;
    await login(page, accountC!, "/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" }).locator("visible=true")).toBeVisible();
    await page.goto("/admin/requests");
    const card = page.locator("article", { hasText: title }).locator("visible=true");
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card).toHaveCount(0);
    expect(await publicIds(id)).toHaveLength(1);
  });
  test("an admin rejects with a reason and the cook sees it on their recipe", async ({ page }) => {
    const id = await createRecipe(a.client, a.userId, { title: `${TEST_PREFIX}Poha ${Date.now()}` });
    const title = (await a.client.from("recipes").select("title").eq("id", id).single()).data!.title as string;
    await login(page, accountC!, "/admin/requests");
    const card = page.locator("article", { hasText: title }).locator("visible=true");
    await card.getByRole("button", { name: "Reject" }).click();
    await card.getByPlaceholder("This is shown to the user").fill("Please add a clearer photo");
    await card.getByRole("button", { name: "Reject recipe" }).click();
    await expect(card).toHaveCount(0);
    expect((await a.client.from("recipes").select("rejection_reason").eq("id", id).single()).data?.rejection_reason).toBe("Please add a clearer photo");
  });
  test("an announcement saved in Settings appears on the public site", async ({ page }) => {
    const text = `${TEST_PREFIX}Diwali week ${Date.now()}`;
    await login(page, accountC!, "/admin/settings");
    await page.getByPlaceholder(/Diwali special/).locator("visible=true").fill(text);
    await page.getByRole("button", { name: "Save announcement" }).locator("visible=true").click();
    await expect(page.getByText("Announcement is live").locator("visible=true")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(text).locator("visible=true").first()).toBeVisible();
    await c.client.rpc("admin_update_setting", { p_key: "announcement", p_value: "" });
  });
});

/** Undoes a test promotion through the Supabase Management API (needs SUPABASE_ACCESS_TOKEN), since only the owner can demote. */
async function resetRole(userId: string) {
  const token = process.env.SUPABASE_ACCESS_TOKEN; const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  if (!token) throw new Error("Set SUPABASE_ACCESS_TOKEN to let the role test reset the promoted account.");
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `update public.profiles set role = 'user' where id = '${userId}' and role = 'admin'` }),
  });
  if (!response.ok) throw new Error(`resetRole failed: ${response.status}`);
}
