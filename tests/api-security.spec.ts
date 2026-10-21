// What a user can do by skipping the website and calling Supabase directly (anyone can, from devtools, with the
// public anon key that ships in the page). Every rule here must hold in the database itself.
// Needs two confirmed test accounts in .env.test.local. Creates rows prefixed "[test] " and removes them afterwards.
import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountA, accountB, anonClient, cleanup, clientAs, createRecipe, needAccounts, recipeFields, TEST_PREFIX } from "./helpers";

let a: { client: SupabaseClient; userId: string };
let b: { client: SupabaseClient; userId: string };
let recipeOfA: string;
let commentOfA: string;

test.beforeAll(async () => {
  if (!accountA || !accountB) return;
  a = await clientAs(accountA); b = await clientAs(accountB);
  await cleanup(a.client, a.userId); await cleanup(b.client, b.userId);
  recipeOfA = await createRecipe(a.client, a.userId);
  const { data, error } = await a.client.from("comments").insert({ recipe_id: recipeOfA, user_id: a.userId, body: `${TEST_PREFIX}A's comment` }).select("id").single();
  if (error) throw error;
  commentOfA = data.id;
});
test.afterAll(async () => { if (a) await cleanup(a.client, a.userId); if (b) await cleanup(b.client, b.userId); });
test.beforeEach(() => needAccounts(accountA, accountB));

test.describe("Way to break it: changing or deleting other people's things", () => {
  test("B cannot edit A's recipe", async () => {
    const { data } = await b.client.from("recipes").update({ title: `${TEST_PREFIX}hijacked` }).eq("id", recipeOfA).select("id");
    expect(data ?? []).toHaveLength(0);
    const { data: row } = await a.client.from("recipes").select("title").eq("id", recipeOfA).single();
    expect(row?.title).not.toContain("hijacked");
  });
  test("B cannot delete A's recipe", async () => {
    await b.client.from("recipes").delete().eq("id", recipeOfA);
    const { data } = await a.client.from("recipes").select("id").eq("id", recipeOfA);
    expect(data).toHaveLength(1);
  });
  test("B cannot take over A's recipe by changing its author", async () => {
    const { data } = await b.client.from("recipes").update({ author_id: b.userId }).eq("id", recipeOfA).select("id");
    expect(data ?? []).toHaveLength(0);
  });
  test("B cannot delete A's comment", async () => {
    await b.client.from("comments").delete().eq("id", commentOfA);
    const { data } = await a.client.from("comments").select("id").eq("id", commentOfA);
    expect(data).toHaveLength(1);
  });
  test("B cannot rename A (edit A's profile)", async () => {
    const { data } = await b.client.from("profiles").update({ full_name: "Hacked" }).eq("id", a.userId).select("id");
    expect(data ?? []).toHaveLength(0);
  });
});

test.describe("Way to break it: acting in someone else's name", () => {
  test("B cannot publish a recipe as A", async () => {
    const { error } = await b.client.from("recipes").insert({ ...recipeFields(), author_id: a.userId });
    expect(error).not.toBeNull();
  });
  test("B cannot comment as A", async () => {
    const { error } = await b.client.from("comments").insert({ recipe_id: recipeOfA, user_id: a.userId, body: `${TEST_PREFIX}fake` });
    expect(error).not.toBeNull();
  });
  test("B cannot rate as A", async () => {
    const { error } = await b.client.from("ratings").insert({ recipe_id: recipeOfA, user_id: a.userId, rating: 1 });
    expect(error).not.toBeNull();
  });
  test("B cannot save favourites into A's list", async () => {
    const { error } = await b.client.from("favourites").insert({ recipe_id: recipeOfA, user_id: a.userId });
    expect(error).not.toBeNull();
  });
  test("B cannot upload photos into A's folder", async () => {
    const { error } = await b.client.storage.from("recipe-images").upload(`${a.userId}/intruder.jpg`, new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
    expect(error).not.toBeNull();
  });
});

test.describe("Way to break it: snooping on private data", () => {
  test("B cannot see which recipes A saved", async () => {
    await a.client.from("favourites").insert({ recipe_id: recipeOfA, user_id: a.userId });
    const { data } = await b.client.from("favourites").select("user_id").eq("user_id", a.userId);
    expect(data ?? []).toHaveLength(0);
  });
  test("logged-out visitors cannot read the owner-only user list (emails)", async () => {
    const { data, error } = await anonClient().schema("private").from("registered_users").select("email").limit(1);
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
  test("signed-in users cannot read the owner-only user list either", async () => {
    const { data, error } = await b.client.schema("private").from("registered_users").select("email").limit(1);
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
  test("nobody can call the signup trigger function through the API", async () => {
    const { error } = await anonClient().rpc("handle_new_user");
    expect(error).not.toBeNull();
  });
  test("logged-out visitors cannot write anything", async () => {
    const anon = anonClient();
    expect((await anon.from("recipes").insert({ ...recipeFields(), author_id: a.userId })).error).not.toBeNull();
    expect((await anon.from("comments").insert({ recipe_id: recipeOfA, user_id: a.userId, body: "x" })).error).not.toBeNull();
    expect((await anon.from("ratings").insert({ recipe_id: recipeOfA, user_id: a.userId, rating: 5 })).error).not.toBeNull();
  });
});

test.describe("Way to break it: saving junk the form would never allow", () => {
  for (const rating of [0, 6, -1, 4.5]) {
    test(`rating of ${rating} is rejected`, async () => {
      const { error } = await b.client.from("ratings").insert({ recipe_id: recipeOfA, user_id: b.userId, rating });
      expect(error).not.toBeNull();
    });
  }
  const badRecipes: [string, Record<string, unknown>][] = [
    ["a blank title", { title: "      " }],
    ["a 121-character title", { title: "x".repeat(121) }],
    ["an ingredient that is an object (would crash the page)", { ingredients: [{ evil: true }] }],
    ["an ingredient that is a number", { ingredients: [42] }],
    ["no ingredients at all", { ingredients: [] }],
    ["blank steps", { steps: ["   "] }],
    ["a giant description", { description: "x".repeat(1001) }],
    ["a non-https image (javascript:)", { image_url: "javascript:alert(1)" }],
    ["a plain-http image", { image_url: "http://example.com/a.jpg" }],
    ["an unknown category", { category: "Poison" }],
    ["0 servings", { servings: 0 }],
    ["a 2-day cooking time", { cooking_time: 2881 }],
    ["2.5 servings", { servings: 2.5 }],
  ];
  for (const [name, overrides] of badRecipes) {
    test(`recipe with ${name} is rejected`, async () => {
      const { error } = await b.client.from("recipes").insert({ ...recipeFields(overrides), author_id: b.userId });
      expect(error, `should have been rejected: ${JSON.stringify(overrides).slice(0, 80)}`).not.toBeNull();
    });
  }
  test("a whitespace-only comment is rejected", async () => {
    const { error } = await b.client.from("comments").insert({ recipe_id: recipeOfA, user_id: b.userId, body: "     " });
    expect(error).not.toBeNull();
  });
  test("a 1000+ character comment is rejected", async () => {
    const { error } = await b.client.from("comments").insert({ recipe_id: recipeOfA, user_id: b.userId, body: "x".repeat(1001) });
    expect(error).not.toBeNull();
  });
  test("a blank or 60+ character display name is rejected", async () => {
    expect((await b.client.from("profiles").update({ full_name: "   " }).eq("id", b.userId)).error).not.toBeNull();
    expect((await b.client.from("profiles").update({ full_name: "x".repeat(61) }).eq("id", b.userId)).error).not.toBeNull();
  });
});

test.describe("Way to break it: abusing photo uploads", () => {
  const upload = (name: string, body: BlobPart, type: string) => b.client.storage.from("recipe-images").upload(`${b.userId}/${name}`, new Blob([body], { type }));
  test("an HTML page cannot be uploaded (free hosting / phishing)", async () => {
    expect((await upload("page.html", "<script>alert(1)</script>", "text/html")).error).not.toBeNull();
  });
  test("an SVG with a script cannot be uploaded", async () => {
    expect((await upload("pic.svg", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "image/svg+xml")).error).not.toBeNull();
  });
  test("a file over 10 MB is rejected", async () => {
    expect((await upload("huge.jpg", new Uint8Array(10 * 1024 * 1024 + 1), "image/jpeg")).error).not.toBeNull();
  });
  test("a normal photo in your own folder is allowed", async () => {
    const { error } = await upload("ok.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg");
    expect(error).toBeNull();
  });
});

test.describe("Way to break it: gaming ratings and spamming", () => {
  test("you cannot rate your own recipe", async () => {
    const { error } = await a.client.from("ratings").insert({ recipe_id: recipeOfA, user_id: a.userId, rating: 5 });
    expect(error).not.toBeNull();
  });
  test("you cannot rate the same recipe twice", async () => {
    await b.client.from("ratings").delete().eq("recipe_id", recipeOfA).eq("user_id", b.userId);
    expect((await b.client.from("ratings").insert({ recipe_id: recipeOfA, user_id: b.userId, rating: 4 })).error).toBeNull();
    expect((await b.client.from("ratings").insert({ recipe_id: recipeOfA, user_id: b.userId, rating: 5 })).error).not.toBeNull();
  });
  test("the 6th comment within a minute is blocked", async () => {
    const results = [];
    for (let i = 1; i <= 6; i++) results.push(await b.client.from("comments").insert({ recipe_id: recipeOfA, user_id: b.userId, body: `${TEST_PREFIX}spam ${i}` }));
    expect(results.slice(0, 5).every((result) => !result.error)).toBe(true);
    expect(results[5].error?.message).toContain("Slow down");
  });
});
