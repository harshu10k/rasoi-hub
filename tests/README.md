# Rasoi Hub tests

Each test is named after a way a real user could break the app ("Way to break it: …") and checks that it can't.

| File | What it covers | Needs |
|---|---|---|
| `unit.spec.ts` | Open-redirect guard, login-page message codes, cleaning bad database rows, error messages | Nothing |
| `api-security.spec.ts` | Everything a user can try from devtools: touching others' data, acting as someone else, junk data, file uploads, self-rating, spam | Accounts A and B |
| `e2e.spec.ts` | In a real browser: private pages, tricky links, forms, Back after logout, XSS, double-clicks, deleted recipes, long text, photo replacement, 404s | Account A (logged-out tests need nothing) |

## One-time setup

1. Create two accounts just for testing, with "+rasoitest" in the email (e.g. `you+rasoitest1@gmail.com`), and confirm them. The tests wipe everything these accounts own, and refuse to run with any other address.
2. Create `.env.test.local` in the project root (it is git-ignored):

   ```
   RASOI_TEST_A_EMAIL=you+rasoi-a@gmail.com
   RASOI_TEST_A_PASSWORD=...
   RASOI_TEST_B_EMAIL=you+rasoi-b@gmail.com
   RASOI_TEST_B_PASSWORD=...
   ```

3. Make sure `supabase/schema.sql` has been run on the project (the API tests check the database rules it adds).

Tests use your installed Google Chrome; no browser download is needed. Tests without accounts are skipped, not failed.

## Running

```
npm test              # everything (starts the dev server if it isn't running)
npm run test:unit     # fast, no browser or network
npm run test:api
npm run test:e2e
```

Against the live site (PowerShell):

```
$env:RASOI_BASE_URL="https://rasoi-hub-liard.vercel.app"; npm test
```

Every row the tests create starts with `[test] ` and is deleted afterwards. On a failure, `npx playwright show-trace test-results/<test>/trace.zip` replays what the browser saw.
