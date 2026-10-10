# Rasoi Hub

Rasoi Hub is a recipe-only sharing app built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, and Zod. It has no ordering, payments, restaurants, carts, or delivery features.

## Run locally

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `supabase/schema.sql`.
3. Create a user in the Supabase dashboard, then optionally run `supabase/seed.sql` to add eight sample Indian recipes.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from Supabase project settings.
5. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` browse, search, category and diet filters
- `/recipe/[id]` recipe detail, rating, save, share and comment controls
- `/signup` and `/login` email/password auth
- `/upload` validated recipe upload with client-side image resizing
- `/my-recipes`, `/saved`, `/profile`

For a beginner-friendly plain HTML/CSS/JavaScript version of the dynamic recipe form, see `docs/vanilla-recipe-demo/index.html` and `docs/BEGINNER-GUIDE.md`.

## Deploy to Vercel

Import the repository into Vercel, add the two `NEXT_PUBLIC_SUPABASE_*` environment variables, and deploy. The public `recipe-images` bucket and RLS policies are created by `schema.sql`.

## Feature checklist

- [ ] Sign up, confirm email, log in, persist session, log out
- [ ] Create a recipe with dynamic ingredients and steps, image, diet, time and servings
- [ ] Edit/delete only recipes owned by the signed-in user
- [ ] Search title, ingredient, category and author; filter diet/time; sort and paginate
- [ ] Open a recipe, rate once/change rating, save/unsave and share
- [ ] Add and delete owned comments
- [ ] Confirm favourites and personal stats on the saved/profile pages
- [ ] Test mobile layout, keyboard focus, empty states and invalid form values