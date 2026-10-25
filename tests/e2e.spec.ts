// Real-browser tests: what a user can break by clicking, typing, sharing links and using Back.
// Logged-out tests need nothing; the rest need test account A (and B where noted) in .env.test.local.
import { expect, test } from "@playwright/test";
import { accountA, accountC, approveAs, cleanup, clientAs, createRecipe, login, needAccounts, TEST_PREFIX, visible } from "./helpers";

const sampleRecipe = "/recipe/00000000-0000-4000-8000-000000000002";
const photo = "tests/fixtures/dish.jpg";

test.describe("Way to break it: opening private pages without logging in", () => {
  for (const path of ["/", "/saved", "/my-recipes", "/profile", "/upload", "/reset-password", sampleRecipe, `${sampleRecipe}/edit`]) {
    test(`${path} sends a logged-out visitor to login and back afterwards`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
      expect(new URL(page.url()).searchParams.get("next")).toBe(path);
    });
  }
});

test.describe("Way to break it: tricky links to our login page", () => {
  test("a crafted ?notice= cannot put the attacker's words on our login page", async ({ page }) => {
    await page.goto("/login?notice=" + encodeURIComponent("Your account is locked. Call +91 99999 99999"));
    await expect(page.getByRole("heading", { name: "Come on in." })).toBeVisible();
    await expect(page.getByText("Call +91")).toHaveCount(0);
  });
  test("a crafted ?error= is not shown either, on login or forgot-password", async ({ page }) => {
    await page.goto("/login?error=" + encodeURIComponent("Hacked by X"));
    await expect(page.getByRole("heading", { name: "Come on in." })).toBeVisible();
    await expect(page.getByText("Hacked by X")).toHaveCount(0);
    await page.goto("/forgot-password?error=" + encodeURIComponent("Hacked by X"));
    await expect(page.getByRole("heading", { name: "Forgot it? No worries." })).toBeVisible();
    await expect(page.getByText("Hacked by X")).toHaveCount(0);
  });
  test("our own message codes still work", async ({ page }) => {
    await page.goto("/login?notice=email-confirmed");
    await expect(page.getByText("Your email is confirmed.")).toBeVisible();
  });
  test("a login link with a sneaky next= keeps you on our site after logging in", async ({ page, baseURL }) => {
    needAccounts(accountA);
    await page.goto("/login?next=" + encodeURIComponent("/\t/example.com"));
    await page.getByPlaceholder("you@example.com").fill(accountA!.email);
    await page.getByPlaceholder("At least 6 characters").fill(accountA!.password);
    await page.getByRole("button", { name: "Log in to Rasoi Hub" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  });
});

test.describe("Way to break it: confusing the login and signup forms", () => {
  test("a wrong password gives a clear message, not a raw error", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(accountA?.email ?? "nobody@example.com");
    await page.getByPlaceholder("At least 6 characters").fill("definitely-wrong-1");
    await page.getByRole("button", { name: "Log in to Rasoi Hub" }).click();
    await expect(visible(page, "p[role=alert]")).toContainText("Email or password is incorrect");
  });
  test("mismatched passwords are caught before anything is sent", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Asha Verma").fill("Test Person");
    await page.getByPlaceholder("you@example.com").fill("someone@example.com");
    await page.getByPlaceholder("At least 6 characters").fill("abcdef1");
    await page.getByPlaceholder("Type it again").fill("abcdef2");
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(visible(page, "p[role=alert]")).toHaveText("Passwords don't match.");
  });
  test("a name of only spaces is refused", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Asha Verma").fill("   ");
    await page.getByPlaceholder("you@example.com").fill("someone@example.com");
    await page.getByPlaceholder("At least 6 characters").fill("abcdef1");
    await page.getByPlaceholder("Type it again").fill("abcdef1");
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(visible(page, "p[role=alert]")).toHaveText("Please enter your name.");
  });
  test("signing up again with an existing email says so", async ({ page }) => {
    needAccounts(accountA);
    await page.goto("/signup");
    await page.getByPlaceholder("Asha Verma").fill("Test Person");
    await page.getByPlaceholder("you@example.com").fill(accountA!.email);
    await page.getByPlaceholder("At least 6 characters").fill("abcdef1");
    await page.getByPlaceholder("Type it again").fill("abcdef1");
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(visible(page, "p[role=alert]")).toContainText("already exists");
  });
});

test.describe("Signed in as A", () => {
  test.beforeEach(async ({ page }) => { needAccounts(accountA, accountC); await login(page, accountA!); });
  test.afterAll(async () => { if (!accountA) return; const a = await clientAs(accountA); await cleanup(a.client, a.userId); });

  test("Way to break it: pressing Back after logging out must not show the private page again", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("Account centre")).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(visible(page, "h2").filter({ hasText: "Account centre" })).toHaveCount(0);
  });

  test("Way to break it: opening /login while already logged in just takes you into the app", async ({ page }) => {
    await page.goto("/login?next=/saved");
    await expect(page).toHaveURL(/\/saved$/);
  });

  test("Way to break it: HTML/script in a title or comment is shown as text, never run", async ({ page }) => {
    const a = await clientAs(accountA!);
    const payload = `<img src=x onerror="window.__pwned=1">`;
    const id = await createRecipe(a.client, a.userId, { title: `${TEST_PREFIX}${payload}` });
    await approveAs(accountC!, id);
    await page.goto(`/recipe/${id}`);
    await expect(visible(page, "h1")).toHaveText(`${TEST_PREFIX}${payload}`);
    await page.getByPlaceholder("Share a cooking note...").fill(`${TEST_PREFIX}<script>window.__pwned=1</script>`);
    await page.getByRole("button", { name: "Post" }).click();
    await expect(page.getByText(`${TEST_PREFIX}<script>window.__pwned=1</script>`)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });

  test("Way to break it: double-clicking the heart must not leave screen and database disagreeing", async ({ page }) => {
    const a = await clientAs(accountA!);
    await a.client.from("favourites").delete().eq("user_id", a.userId);
    await page.goto(sampleRecipe);
    const heart = page.getByRole("button", { name: /Save recipe|Remove from saved/ }).locator("visible=true");
    await heart.dblclick();
    await page.waitForTimeout(2500);
    const shownSaved = (await heart.getAttribute("aria-pressed")) === "true";
    const { data } = await a.client.from("favourites").select("id").eq("user_id", a.userId).eq("recipe_id", sampleRecipe.split("/").pop()!);
    expect(shownSaved).toBe((data ?? []).length === 1);
  });

  test("Way to break it: saving a recipe that its author deleted a moment ago gives an honest message", async ({ page }) => {
    const a = await clientAs(accountA!);
    const id = await createRecipe(a.client, a.userId);
    await approveAs(accountC!, id);
    await page.goto(`/recipe/${id}`);
    await expect(page.getByText("Rate this recipe")).toBeVisible();
    await a.client.from("recipes").delete().eq("id", id);
    await page.getByRole("button", { name: "Save recipe" }).locator("visible=true").click();
    await expect(visible(page, "p[role=status]")).toHaveText("This recipe was just removed by its author.");
  });

  test("Way to break it: a very long word in a comment must not stretch the page sideways", async ({ page }) => {
    const a = await clientAs(accountA!);
    const id = await createRecipe(a.client, a.userId, { title: `${TEST_PREFIX}${"Long".repeat(28)}` });
    await approveAs(accountC!, id);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`/recipe/${id}`);
    await page.getByPlaceholder("Share a cooking note...").fill(`${TEST_PREFIX}${"a".repeat(600)}`);
    await page.getByRole("button", { name: "Post" }).click();
    await expect(page.getByText("Comment added.")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test("Way to break it: typing 2.5 servings or 0 minutes in the share form", async ({ page }) => {
    await page.goto("/upload");
    await page.getByRole("textbox", { name: "Recipe title" }).fill(`${TEST_PREFIX}Decimal test`);
    await page.getByLabel("Servings").fill("2.5");
    await page.getByPlaceholder("2 cups basmati rice").fill("Rice");
    await page.getByPlaceholder("Toast the spices until fragrant").fill("Cook it.");
    // Bypass the browser's own number check, the way an older browser or a pasted value would.
    await page.locator("form").locator("visible=true").evaluate((form) => form.setAttribute("novalidate", ""));
    await page.getByRole("button", { name: "Share recipe" }).locator("visible=true").click();
    await expect(visible(page, "p[role=alert]")).toHaveText("Servings must be a whole number from 1 to 50.");
  });

  test("Way to break it: going back to 'Share recipe' after publishing shows yesterday's form", async ({ page }) => {
    await page.goto("/upload");
    await page.getByRole("textbox", { name: "Recipe title" }).fill(`${TEST_PREFIX}Fresh form test`);
    await page.getByPlaceholder("2 cups basmati rice").fill("Rice");
    await page.getByPlaceholder("Toast the spices until fragrant").fill("Cook it.");
    await page.getByRole("button", { name: "Share recipe" }).locator("visible=true").click();
    await expect(page.getByText("Sent for review!")).toBeVisible();
    await page.getByRole("link", { name: "+ Share recipe" }).click();
    await expect(page).toHaveURL(/\/upload$/);
    await expect(page.getByRole("textbox", { name: "Recipe title" }).locator("visible=true")).toHaveValue("");
  });

  test("Way to break it: replacing a recipe's photo must not leave the old one in storage forever", async ({ page }) => {
    await page.goto("/upload");
    await page.getByRole("textbox", { name: "Recipe title" }).fill(`${TEST_PREFIX}Photo swap test`);
    await page.locator("input[type=file]").locator("visible=true").setInputFiles(photo);
    await page.getByPlaceholder("2 cups basmati rice").fill("Rice");
    await page.getByPlaceholder("Toast the spices until fragrant").fill("Cook it.");
    await page.getByRole("button", { name: "Share recipe" }).locator("visible=true").click();
    await expect(page.getByText("Sent for review!")).toBeVisible();
    const a = await clientAs(accountA!);
    const before = (await a.client.storage.from("recipe-images").list(a.userId)).data?.map((file) => file.name) ?? [];
    expect(before).toHaveLength(1);
    await page.getByRole("link", { name: "Edit recipe" }).click();
    await page.locator("input[type=file]").locator("visible=true").setInputFiles(photo);
    await page.getByRole("button", { name: "Save changes" }).locator("visible=true").click();
    await expect(page.getByText("Changes saved and sent for review.")).toBeVisible();
    const after = (await a.client.storage.from("recipe-images").list(a.userId)).data?.map((file) => file.name) ?? [];
    expect(after).toHaveLength(1);
    expect(after[0]).not.toBe(before[0]);
  });

  test("Way to break it: a just-shared recipe waiting for approval must show up in My recipes, with the pending count", async ({ page }) => {
    const a = await clientAs(accountA!);
    await cleanup(a.client, a.userId); // earlier tests leave pending recipes behind; the counts below assume only this test's
    const live = await createRecipe(a.client, a.userId, { title: `${TEST_PREFIX}Already live` });
    await approveAs(accountC!, live);
    // Open My recipes first, so a stale copy of the page would be what the user sees when they come back to it.
    await page.goto("/my-recipes");
    await expect(page.getByRole("heading", { name: /Live on Rasoi Hub/ })).toBeVisible();
    const title = `${TEST_PREFIX}Fresh pending ${Date.now()}`;
    await page.getByRole("link", { name: /Share recipe/ }).locator("visible=true").first().click(); // in-app navigation, no reload
    await expect(page).toHaveURL(/\/upload$/);
    await page.getByRole("textbox", { name: "Recipe title" }).fill(title);
    await page.getByPlaceholder("2 cups basmati rice").fill("Rice");
    await page.getByPlaceholder("Toast the spices until fragrant").fill("Cook it.");
    await page.getByRole("button", { name: "Share recipe" }).locator("visible=true").click();
    await expect(page.getByText("Sent for review!")).toBeVisible();
    await page.getByRole("link", { name: "My recipes" }).locator("visible=true").first().click();
    await expect(page).toHaveURL(/\/my-recipes/);
    await expect(page.getByRole("link", { name: "1 waiting for approval" }).locator("visible=true")).toBeVisible();
    const pending = page.locator("section#pending:visible");
    await expect(pending.getByRole("heading", { name: "Waiting for approval (1)" })).toBeVisible();
    await expect(pending.getByText(title)).toBeVisible();
    await expect(page.locator("section#approved:visible").getByText(`${TEST_PREFIX}Already live`)).toBeVisible();
  });

  test("Way to break it: made-up or someone else's recipe links show a friendly 404", async ({ page }) => {
    await page.goto("/recipe/not-a-real-id");
    await expect(page.getByRole("heading", { name: "This dish isn't on the menu." })).toBeVisible();
    await page.goto(`${sampleRecipe}/edit`);
    await expect(page.getByRole("heading", { name: "This dish isn't on the menu." })).toBeVisible();
  });
});

test.describe("Way to break it: opening the site on a small phone", () => {
  const phones = [{ width: 320, height: 640 }, { width: 390, height: 844 }];
  const overflow = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // iPhones zoom the whole page when a field with text under 16px is tapped, so typing seems to "jump" elsewhere.
  const smallFields = (page: import("@playwright/test").Page) => page.evaluate(() => [...document.querySelectorAll("input:not([type=checkbox]):not([type=file]), select, textarea")]
    .filter((el) => (el as HTMLElement).offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => (el as HTMLInputElement).placeholder || el.tagName));

  for (const phone of phones) {
    test(`login and signup fit a ${phone.width}px screen and don't zoom on tap`, async ({ page }) => {
      await page.setViewportSize(phone);
      for (const path of ["/login", "/signup", "/forgot-password"]) {
        await page.goto(path);
        await expect(visible(page, "h1")).toBeVisible();
        expect(await overflow(page), `${path} is wider than the screen`).toBeLessThanOrEqual(0);
        expect(await smallFields(page), `${path} has fields under 16px`).toEqual([]);
      }
    });

    test(`every signed-in page fits a ${phone.width}px screen, with the tab bar`, async ({ page }) => {
      needAccounts(accountA);
      await page.setViewportSize(phone);
      await login(page, accountA!);
      for (const path of ["/", sampleRecipe, "/upload", "/saved", "/my-recipes", "/profile", "/recipe/not-a-real-id"]) {
        await page.goto(path);
        await expect(visible(page, "h1").first()).toBeVisible();
        expect(await overflow(page), `${path} is wider than the screen`).toBeLessThanOrEqual(0);
        expect(await smallFields(page), `${path} has fields under 16px`).toEqual([]);
        await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      }
    });
  }

  test("the share form still fits after choosing a photo and typing a long title", async ({ page }) => {
    needAccounts(accountA);
    await page.setViewportSize({ width: 360, height: 780 });
    await login(page, accountA!);
    await page.goto("/upload");
    await page.getByRole("textbox", { name: "Recipe title" }).locator("visible=true").fill("Aloo paratha just like nani makes it on cold Sunday mornings");
    await page.locator("input[type=file]").locator("visible=true").setInputFiles(photo);
    await expect(page.getByAltText("Recipe photo preview")).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const box = await page.getByAltText("Recipe photo preview").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });

  test("the phone tab bar is hidden on a desktop screen", async ({ page }) => {
    needAccounts(accountA);
    await login(page, accountA!);
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  });
});
