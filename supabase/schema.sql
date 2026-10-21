-- Rasoi Hub database setup. Safe to run more than once: paste it into the Supabase SQL editor and press Run.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null default 'Rasoi friend', avatar_url text, created_at timestamptz not null default now());
alter table public.profiles drop column if exists account_type;
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120), category text not null check (category in ('Breakfast','Sabzi','Dal & Rice','Roti & Paratha','Snacks','Non-Veg','Sweets','Drinks')),
  is_veg boolean not null default true, is_hostel_friendly boolean not null default false, cooking_time integer not null check (cooking_time between 1 and 1440), servings integer not null check (servings between 1 and 50), image_url text not null,
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array'), steps jsonb not null check (jsonb_typeof(steps) = 'array'), description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ratings (id uuid primary key default gen_random_uuid(), recipe_id uuid not null references public.recipes(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, rating integer not null check (rating between 1 and 5), created_at timestamptz not null default now(), unique(user_id, recipe_id));
create table if not exists public.favourites (id uuid primary key default gen_random_uuid(), recipe_id uuid not null references public.recipes(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id, recipe_id));
create table if not exists public.comments (id uuid primary key default gen_random_uuid(), recipe_id uuid not null references public.recipes(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, body text not null check (char_length(body) between 1 and 1000), created_at timestamptz not null default now());
alter table public.recipes add column if not exists is_hostel_friendly boolean not null default false;

create index if not exists recipes_category_idx on public.recipes(category); create index if not exists recipes_author_idx on public.recipes(author_id); create index if not exists recipes_time_idx on public.recipes(cooking_time); create index if not exists recipes_created_idx on public.recipes(created_at desc); create index if not exists ratings_recipe_idx on public.ratings(recipe_id); create index if not exists comments_recipe_idx on public.comments(recipe_id, created_at desc); create index if not exists favourites_user_idx on public.favourites(user_id, created_at desc);

-- Every auth user needs a profile row: favourites, ratings, comments and recipes all reference it.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Rasoi friend')) on conflict (id) do nothing; return new; end; $$;
create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- Only the trigger should run this; keep it off the public API (/rest/v1/rpc).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Backfill profiles for users who signed up before this script was run.
insert into public.profiles (id, full_name) select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', 'Rasoi friend') from auth.users on conflict (id) do nothing;

-- Owner-only list of everyone who signed up (name, email, dates). Lives in a schema the website's API cannot reach,
-- so only you see it: Supabase dashboard -> Table Editor -> schema "private" -> registered_users.
-- Passwords are never stored in readable form; Supabase keeps only a one-way hash, so they can't be listed here.
create schema if not exists private;
revoke all on schema private from anon, authenticated;
create or replace view private.registered_users as
  select u.id, p.full_name as name, u.email, coalesce(u.raw_app_meta_data ->> 'provider', 'email') as signed_up_with,
    u.created_at as signed_up_at, u.email_confirmed_at, u.last_sign_in_at
  from auth.users u left join public.profiles p on p.id = u.id
  order by u.created_at desc;

alter table public.profiles enable row level security; alter table public.recipes enable row level security; alter table public.ratings enable row level security; alter table public.favourites enable row level security; alter table public.comments enable row level security;
drop policy if exists "profiles are public" on public.profiles; create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "users create own profile" on public.profiles; create policy "users create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "users update own profile" on public.profiles; create policy "users update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "recipes are public" on public.recipes; create policy "recipes are public" on public.recipes for select using (true);
drop policy if exists "signed in users create recipes" on public.recipes; create policy "signed in users create recipes" on public.recipes for insert to authenticated with check ((select auth.uid()) = author_id);
drop policy if exists "owners update recipes" on public.recipes; create policy "owners update recipes" on public.recipes for update using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
drop policy if exists "owners delete recipes" on public.recipes; create policy "owners delete recipes" on public.recipes for delete using ((select auth.uid()) = author_id);
drop policy if exists "ratings are public" on public.ratings; create policy "ratings are public" on public.ratings for select using (true);
drop policy if exists "signed in users rate" on public.ratings; create policy "signed in users rate" on public.ratings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users change own rating" on public.ratings; create policy "users change own rating" on public.ratings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users remove own rating" on public.ratings; create policy "users remove own rating" on public.ratings for delete using ((select auth.uid()) = user_id);
drop policy if exists "favourites are public" on public.favourites; create policy "favourites are public" on public.favourites for select using (true);
drop policy if exists "users save recipes" on public.favourites; create policy "users save recipes" on public.favourites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users unsave recipes" on public.favourites; create policy "users unsave recipes" on public.favourites for delete using ((select auth.uid()) = user_id);
drop policy if exists "comments are public" on public.comments; create policy "comments are public" on public.comments for select using (true);
drop policy if exists "signed in users comment" on public.comments; create policy "signed in users comment" on public.comments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "authors delete own comments" on public.comments; create policy "authors delete own comments" on public.comments for delete using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true) on conflict (id) do update set public = true;
drop policy if exists "recipe images are public" on storage.objects; create policy "recipe images are public" on storage.objects for select using (bucket_id = 'recipe-images');
drop policy if exists "users upload recipe images" on storage.objects; create policy "users upload recipe images" on storage.objects for insert to authenticated with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users update recipe images" on storage.objects; create policy "users update recipe images" on storage.objects for update to authenticated using (bucket_id = 'recipe-images' and owner_id = (select auth.uid())::text);
drop policy if exists "users delete recipe images" on storage.objects; create policy "users delete recipe images" on storage.objects for delete to authenticated using (bucket_id = 'recipe-images' and owner_id = (select auth.uid())::text);

-- ============================================================================================================
-- Hardening. The website validates its forms, but anyone can open devtools and call the API directly, so every
-- rule that matters is enforced here too. Each statement is re-runnable. Tests: tests/api-security.spec.ts.
-- ============================================================================================================

-- A JSON array of 1..max non-blank strings (ingredients/steps). Anything else (objects, numbers, "") is rejected,
-- because one non-string item would break the recipe page for everyone who opens it.
create or replace function public.is_text_list(value jsonb, max_items integer) returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'array' and jsonb_array_length(value) between 1 and max_items
    and not exists (select 1 from jsonb_array_elements(value) item where jsonb_typeof(item) <> 'string' or btrim(item #>> '{}') = '' or char_length(item #>> '{}') > 300);
$$;

alter table public.recipes drop constraint if exists recipes_title_not_blank; alter table public.recipes add constraint recipes_title_not_blank check (char_length(btrim(title)) >= 3);
alter table public.recipes drop constraint if exists recipes_description_length; alter table public.recipes add constraint recipes_description_length check (description is null or char_length(description) <= 1000);
alter table public.recipes drop constraint if exists recipes_image_https; alter table public.recipes add constraint recipes_image_https check (image_url ~ '^https://' and char_length(image_url) <= 1000);
alter table public.recipes drop constraint if exists recipes_ingredients_text; alter table public.recipes add constraint recipes_ingredients_text check (public.is_text_list(ingredients, 60));
alter table public.recipes drop constraint if exists recipes_steps_text; alter table public.recipes add constraint recipes_steps_text check (public.is_text_list(steps, 60));
alter table public.comments drop constraint if exists comments_body_not_blank; alter table public.comments add constraint comments_body_not_blank check (btrim(body) <> '');
alter table public.profiles drop constraint if exists profiles_name_length; alter table public.profiles add constraint profiles_name_length check (char_length(btrim(full_name)) between 1 and 60);

-- Who saved what is private: each user sees only their own favourites.
drop policy if exists "favourites are public" on public.favourites;
drop policy if exists "users see own favourites" on public.favourites; create policy "users see own favourites" on public.favourites for select to authenticated using ((select auth.uid()) = user_id);

-- No rating your own recipe (it would let authors inflate their scores).
drop policy if exists "signed in users rate" on public.ratings; create policy "signed in users rate" on public.ratings for insert to authenticated with check ((select auth.uid()) = user_id and not exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())));
drop policy if exists "users change own rating" on public.ratings; create policy "users change own rating" on public.ratings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and not exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())));

-- Spam brakes: at most 5 comments a minute and 20 new recipes an hour per user.
create or replace function public.limit_comment_rate() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Slow down! You can post up to 5 comments a minute.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create or replace trigger comments_rate_limit before insert on public.comments for each row execute function public.limit_comment_rate();
create or replace function public.limit_recipe_rate() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.recipes where author_id = new.author_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Slow down! You can share up to 20 recipes an hour.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create or replace trigger recipes_rate_limit before insert on public.recipes for each row execute function public.limit_recipe_rate();
revoke execute on function public.limit_comment_rate(), public.limit_recipe_rate() from public, anon, authenticated;

-- Photos only: no HTML/SVG/executables or huge files in the public bucket (it would otherwise be free file hosting).
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'recipe-images';
