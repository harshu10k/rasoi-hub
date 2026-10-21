// Pure-function tests: no browser, no network. Run with `npm run test:unit`.
import { expect, test } from "@playwright/test";
import { safeNextPath } from "@/lib/safe-path";
import { authErrors, authNotices, messageFor } from "@/lib/auth-messages";
import { friendlyDbError, setupMessage, toRecipe } from "@/lib/recipes";

test.describe("Way to break it: a login link that sends you to another site after you sign in (open redirect)", () => {
  // Someone shares rasoi-hub.../login?next=<evil>. If `next` escapes our site, the victim logs in and lands on a
  // look-alike page that asks for their password again.
  const attacks = ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\\/evil.com", "https://evil.com", "javascript:alert(1)", "/%2F%2Fevil.com/../..//evil.com"];
  for (const attack of attacks) {
    test(`rejects ${JSON.stringify(attack)}`, () => {
      const result = safeNextPath(attack);
      expect(new URL(result, "https://rasoi-hub-liard.vercel.app").origin).toBe("https://rasoi-hub-liard.vercel.app");
    });
  }
  test("keeps normal in-site paths, including query and hash", () => {
    expect(safeNextPath("/recipe/abc?notice=updated#comments")).toBe("/recipe/abc?notice=updated#comments");
    expect(safeNextPath("/saved")).toBe("/saved");
  });
  test("falls back to home for empty or missing values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});

test.describe("Way to break it: making the login page show your own text (?notice= / ?error=)", () => {
  test("unknown codes show nothing instead of echoing the URL", () => {
    expect(messageFor(authNotices, "Your account is locked. Call +91 99999 99999")).toBe("");
    expect(messageFor(authErrors, "<b>hacked</b>")).toBe("");
  });
  test("JavaScript built-in names are not treated as codes", () => {
    for (const code of ["constructor", "__proto__", "toString", "hasOwnProperty"]) expect(messageFor(authNotices, code)).toBe("");
  });
  test("known codes map to our own fixed messages", () => {
    expect(messageFor(authNotices, "email-confirmed")).toBe(authNotices["email-confirmed"]);
    expect(messageFor(authErrors, "reset-link")).toBe(authErrors["reset-link"]);
  });
});

test.describe("Way to break it: saving junk straight to the database so the recipe page crashes for everyone", () => {
  const row = (overrides: Record<string, unknown>) => ({
    id: "x", title: "Chai", category: "Drinks", is_veg: true, is_hostel_friendly: false, cooking_time: 5, servings: 1, image_url: "https://x/y.jpg",
    ingredients: ["Tea"], steps: ["Boil"], description: null, author_id: "a", created_at: "2026-01-01", profiles: { full_name: "Asha" }, ratings: [], ...overrides,
  }) as unknown as Parameters<typeof toRecipe>[0];

  test("objects, numbers and blanks in ingredients/steps are dropped, not rendered", () => {
    const recipe = toRecipe(row({ ingredients: ["Tea", { evil: true }, 42, null, "  "], steps: "not an array" }));
    expect(recipe.ingredients).toEqual(["Tea"]);
    expect(recipe.steps).toEqual([]);
  });
  test("non-string title/description/author fall back safely", () => {
    const recipe = toRecipe(row({ title: { a: 1 }, description: 7, profiles: { full_name: ["x"] }, ratings: null }));
    expect(recipe.title).toBe("Untitled recipe");
    expect(recipe.description).toBeUndefined();
    expect(recipe.author_name).toBe("Rasoi friend");
    expect(recipe.rating_count).toBe(0);
  });
  test("average rating is computed from the ratings", () => {
    expect(toRecipe(row({ ratings: [{ rating: 4 }, { rating: 5 }] })).rating).toBe(4.5);
  });
});

test.describe("Error messages users see", () => {
  test("a recipe deleted while you were looking at it says so (not 'database not set up')", () => {
    expect(friendlyDbError({ code: "23503", message: "fk" })).toBe("This recipe was just removed by its author.");
  });
  test("missing tables point to the setup steps", () => {
    expect(friendlyDbError({ code: "PGRST205", message: "x" })).toBe(setupMessage);
  });
  test("rule violations get a plain message; spam-limit messages pass through", () => {
    expect(friendlyDbError({ code: "23514", message: "violates check constraint" })).not.toContain("constraint");
    expect(friendlyDbError({ code: "P0001", message: "Slow down! You can post up to 5 comments a minute." })).toContain("Slow down");
  });
});
