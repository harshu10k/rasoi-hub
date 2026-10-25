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

-- ============================================================================================================
-- Admin portal. Roles live on profiles (user / admin / owner); every admin power is a security-definer function
-- that re-checks the caller, so the rules hold even if someone calls the API directly. Re-runnable.
-- Tests: tests/admin.spec.ts.
-- ============================================================================================================

alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_valid; alter table public.profiles add constraint profiles_role_valid check (role in ('user', 'admin', 'owner'));
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists banned_reason text;

-- Users may change only their own name/photo; role and ban status are written by the admin functions below.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
-- The ban reason is between the user and the admins; everyone else sees name, photo and role only.
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, created_at, role, is_banned) on public.profiles to anon, authenticated;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'owner') and not is_banned);
$$;
create or replace function public.is_active_user() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and not is_banned);
$$;
grant execute on function public.is_admin(), public.is_active_user() to anon, authenticated;

-- Moderation status. Recipes that existed before the portal stay visible (default 'approved' only applies once).
alter table public.recipes add column if not exists status text not null default 'approved';
alter table public.recipes alter column status set default 'pending';
alter table public.recipes drop constraint if exists recipes_status_valid; alter table public.recipes add constraint recipes_status_valid check (status in ('pending', 'approved', 'rejected'));
alter table public.recipes add column if not exists rejection_reason text;
alter table public.recipes add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.recipes add column if not exists reviewed_at timestamptz;
alter table public.recipes add column if not exists is_featured boolean not null default false;
create index if not exists recipes_status_idx on public.recipes(status, created_at desc);

create table if not exists public.site_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete set null);
insert into public.site_settings (key, value) values ('auto_approve', 'false'), ('announcement', '""') on conflict (key) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists "settings are public" on public.site_settings; create policy "settings are public" on public.site_settings for select using (true);

create table if not exists public.admin_actions (id uuid primary key default gen_random_uuid(), admin_id uuid references public.profiles(id) on delete set null, action text not null, target_type text, target_id text, details jsonb not null default '{}', created_at timestamptz not null default now());
create index if not exists admin_actions_created_idx on public.admin_actions(created_at desc);
alter table public.admin_actions enable row level security;
drop policy if exists "admins read the log" on public.admin_actions; create policy "admins read the log" on public.admin_actions for select to authenticated using (public.is_admin());

-- New recipes wait for review (unless auto-approve is on). Authors can't approve or feature their own; editing an
-- approved recipe's content sends it back for review so nothing unreviewed goes live.
create or replace function public.guard_recipe_moderation() returns trigger language plpgsql security definer set search_path = '' as $$
declare auto boolean := coalesce((select (value #>> '{}')::boolean from public.site_settings where key = 'auto_approve'), false);
begin
  if (select auth.uid()) is null then return new; end if; -- SQL editor / server maintenance
  if public.is_admin() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then new.reviewed_by := (select auth.uid()); new.reviewed_at := now(); end if;
    if tg_op = 'INSERT' then new.status := 'approved'; new.reviewed_by := (select auth.uid()); new.reviewed_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := case when auto then 'approved' else 'pending' end;
    new.is_featured := false; new.rejection_reason := null; new.reviewed_by := null; new.reviewed_at := null;
    return new;
  end if;
  new.is_featured := old.is_featured; new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  if (new.title, new.description, new.category, new.is_veg, new.is_hostel_friendly, new.cooking_time, new.servings, new.image_url, new.ingredients, new.steps)
     is distinct from (old.title, old.description, old.category, old.is_veg, old.is_hostel_friendly, old.cooking_time, old.servings, old.image_url, old.ingredients, old.steps) then
    new.status := case when auto then 'approved' else 'pending' end; new.rejection_reason := null;
  else
    new.status := old.status; new.rejection_reason := old.rejection_reason;
  end if;
  new.updated_at := now();
  return new;
end; $$;
create or replace trigger recipes_moderation before insert or update on public.recipes for each row execute function public.guard_recipe_moderation();
revoke execute on function public.guard_recipe_moderation() from public, anon, authenticated;

-- Visibility: everyone sees approved recipes; authors also see their own pending/rejected ones; admins see all.
drop policy if exists "recipes are public" on public.recipes;
drop policy if exists "approved recipes are public" on public.recipes; create policy "approved recipes are public" on public.recipes for select using (status = 'approved' or author_id = (select auth.uid()) or public.is_admin());
drop policy if exists "signed in users create recipes" on public.recipes; create policy "signed in users create recipes" on public.recipes for insert to authenticated with check ((select auth.uid()) = author_id and public.is_active_user());
drop policy if exists "owners update recipes" on public.recipes; create policy "owners update recipes" on public.recipes for update using ((select auth.uid()) = author_id or public.is_admin()) with check (((select auth.uid()) = author_id and public.is_active_user()) or public.is_admin());
drop policy if exists "owners delete recipes" on public.recipes; create policy "owners delete recipes" on public.recipes for delete using ((select auth.uid()) = author_id or public.is_admin());

-- Banned users can't post, rate or save; nobody can interact with recipes that aren't approved yet.
drop policy if exists "signed in users comment" on public.comments; create policy "signed in users comment" on public.comments for insert to authenticated with check ((select auth.uid()) = user_id and public.is_active_user() and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'approved'));
drop policy if exists "authors delete own comments" on public.comments; create policy "authors delete own comments" on public.comments for delete using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "signed in users rate" on public.ratings; create policy "signed in users rate" on public.ratings for insert to authenticated with check ((select auth.uid()) = user_id and public.is_active_user() and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'approved' and r.author_id <> (select auth.uid())));
drop policy if exists "users change own rating" on public.ratings; create policy "users change own rating" on public.ratings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and public.is_active_user() and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'approved' and r.author_id <> (select auth.uid())));
drop policy if exists "admins remove ratings" on public.ratings; create policy "admins remove ratings" on public.ratings for delete using (public.is_admin());
drop policy if exists "users save recipes" on public.favourites; create policy "users save recipes" on public.favourites for insert to authenticated with check ((select auth.uid()) = user_id and public.is_active_user() and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'approved'));
drop policy if exists "admins delete recipe images" on storage.objects; create policy "admins delete recipe images" on storage.objects for delete to authenticated using (bucket_id = 'recipe-images' and public.is_admin());

-- ---- Admin functions (each checks the caller and writes to the activity log) ----
create or replace function public.require_admin() returns void language plpgsql stable security definer set search_path = '' as $$
begin if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if; end; $$;
create or replace function public.log_admin_action(p_action text, p_type text, p_id text, p_details jsonb default '{}') returns void language sql security definer set search_path = '' as $$
  insert into public.admin_actions (admin_id, action, target_type, target_id, details) values ((select auth.uid()), p_action, p_type, p_id, coalesce(p_details, '{}'));
$$;
revoke execute on function public.require_admin(), public.log_admin_action(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_review_recipe(p_recipe uuid, p_status text, p_reason text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  perform public.require_admin();
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'Unknown status.' using errcode = '22023'; end if;
  if p_status = 'rejected' and coalesce(btrim(p_reason), '') = '' then raise exception 'Give the cook a reason for the rejection.' using errcode = '22023'; end if;
  update public.recipes set status = p_status, rejection_reason = case when p_status = 'rejected' then left(btrim(p_reason), 500) end,
    is_featured = case when p_status = 'approved' then is_featured else false end, reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_recipe returning title into v_title;
  if v_title is null then raise exception 'Recipe not found.' using errcode = 'P0002'; end if;
  perform public.log_admin_action('recipe.' || p_status, 'recipe', p_recipe::text, jsonb_build_object('title', v_title, 'reason', p_reason));
end; $$;

create or replace function public.admin_set_featured(p_recipe uuid, p_featured boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  perform public.require_admin();
  update public.recipes set is_featured = p_featured where id = p_recipe and (status = 'approved' or not p_featured) returning title into v_title;
  if v_title is null then raise exception 'Only approved recipes can be featured.' using errcode = '22023'; end if;
  perform public.log_admin_action(case when p_featured then 'recipe.featured' else 'recipe.unfeatured' end, 'recipe', p_recipe::text, jsonb_build_object('title', v_title));
end; $$;

create or replace function public.admin_delete_recipe(p_recipe uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_title text; v_image text;
begin
  perform public.require_admin();
  delete from public.recipes where id = p_recipe returning title, image_url into v_title, v_image;
  if v_title is null then raise exception 'Recipe not found.' using errcode = 'P0002'; end if;
  perform public.log_admin_action('recipe.deleted', 'recipe', p_recipe::text, jsonb_build_object('title', v_title));
  return v_image; -- the app removes the photo from storage
end; $$;

create or replace function public.admin_delete_comment(p_comment uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_body text; v_recipe uuid;
begin
  perform public.require_admin();
  delete from public.comments where id = p_comment returning body, recipe_id into v_body, v_recipe;
  if v_body is null then raise exception 'Comment not found.' using errcode = 'P0002'; end if;
  perform public.log_admin_action('comment.deleted', 'comment', p_comment::text, jsonb_build_object('body', left(v_body, 200), 'recipe_id', v_recipe));
end; $$;

-- Any admin can promote a user; only the owner can remove an admin. The owner can never be changed or banned.
create or replace function public.admin_set_role(p_user uuid, p_role text) returns void language plpgsql security definer set search_path = '' as $$
declare v_old text; v_name text;
begin
  perform public.require_admin();
  if p_role not in ('user', 'admin') then raise exception 'Role must be user or admin.' using errcode = '22023'; end if;
  select role, full_name into v_old, v_name from public.profiles where id = p_user;
  if v_old is null then raise exception 'User not found.' using errcode = 'P0002'; end if;
  if v_old = 'owner' then raise exception 'The owner''s role cannot be changed.' using errcode = '42501'; end if;
  if v_old = 'admin' and p_role = 'user' and not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'owner') then raise exception 'Only the owner can remove an admin.' using errcode = '42501'; end if;
  update public.profiles set role = p_role where id = p_user;
  perform public.log_admin_action('user.role.' || p_role, 'user', p_user::text, jsonb_build_object('name', v_name, 'from', v_old));
end; $$;

create or replace function public.admin_set_ban(p_user uuid, p_banned boolean, p_reason text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_role text; v_name text;
begin
  perform public.require_admin();
  select role, full_name into v_role, v_name from public.profiles where id = p_user;
  if v_role is null then raise exception 'User not found.' using errcode = 'P0002'; end if;
  if p_user = (select auth.uid()) then raise exception 'You cannot ban yourself.' using errcode = '42501'; end if;
  if p_banned and v_role <> 'user' then raise exception 'Remove admin rights before banning.' using errcode = '42501'; end if;
  update public.profiles set is_banned = p_banned, banned_reason = case when p_banned then left(btrim(coalesce(p_reason, '')), 500) end where id = p_user;
  perform public.log_admin_action(case when p_banned then 'user.banned' else 'user.unbanned' end, 'user', p_user::text, jsonb_build_object('name', v_name, 'reason', p_reason));
end; $$;

create or replace function public.admin_update_setting(p_key text, p_value jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_key not in ('auto_approve', 'announcement') then raise exception 'Unknown setting.' using errcode = '22023'; end if;
  if p_key = 'auto_approve' and jsonb_typeof(p_value) <> 'boolean' then raise exception 'auto_approve must be true or false.' using errcode = '22023'; end if;
  if p_key = 'announcement' and (jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 280) then raise exception 'Announcement must be text up to 280 characters.' using errcode = '22023'; end if;
  insert into public.site_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), (select auth.uid()))
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  perform public.log_admin_action('setting.' || p_key, 'setting', p_key, jsonb_build_object('value', p_value));
end; $$;

create or replace function public.admin_list_users() returns table (id uuid, name text, email text, role text, is_banned boolean, banned_reason text, signed_up_with text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed boolean, recipes bigint, approved bigint, pending bigint, comments bigint, ratings bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
    select u.id, p.full_name, u.email::text, coalesce(p.role, 'user'), coalesce(p.is_banned, false), p.banned_reason, coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
      u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
      (select count(*) from public.recipes r where r.author_id = u.id), (select count(*) from public.recipes r where r.author_id = u.id and r.status = 'approved'),
      (select count(*) from public.recipes r where r.author_id = u.id and r.status = 'pending'),
      (select count(*) from public.comments c where c.user_id = u.id), (select count(*) from public.ratings x where x.user_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id order by u.created_at desc;
end; $$;

create or replace function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'new_users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'active_users_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'banned', (select count(*) from public.profiles where is_banned),
    'admins', (select count(*) from public.profiles where role in ('admin', 'owner')),
    'recipes', (select count(*) from public.recipes), 'approved', (select count(*) from public.recipes where status = 'approved'),
    'pending', (select count(*) from public.recipes where status = 'pending'), 'rejected', (select count(*) from public.recipes where status = 'rejected'),
    'featured', (select count(*) from public.recipes where is_featured),
    'comments', (select count(*) from public.comments), 'ratings', (select count(*) from public.ratings), 'favourites', (select count(*) from public.favourites),
    'signups_14d', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', (select count(*) from auth.users where created_at::date = d::date)) order by d), '[]') from generate_series(current_date - 13, current_date, interval '1 day') d),
    'top_cooks', (select coalesce(jsonb_agg(t), '[]') from (select p.id, p.full_name as name, count(r.id) as recipes from public.profiles p join public.recipes r on r.author_id = p.id and r.status = 'approved' group by p.id order by count(r.id) desc limit 5) t)
  );
end; $$;

revoke execute on function public.admin_review_recipe(uuid, text, text), public.admin_set_featured(uuid, boolean), public.admin_delete_recipe(uuid), public.admin_delete_comment(uuid),
  public.admin_set_role(uuid, text), public.admin_set_ban(uuid, boolean, text), public.admin_update_setting(text, jsonb), public.admin_list_users(), public.admin_stats() from public, anon;
grant execute on function public.admin_review_recipe(uuid, text, text), public.admin_set_featured(uuid, boolean), public.admin_delete_recipe(uuid), public.admin_delete_comment(uuid),
  public.admin_set_role(uuid, text), public.admin_set_ban(uuid, boolean, text), public.admin_update_setting(text, jsonb), public.admin_list_users(), public.admin_stats() to authenticated;

-- ============================================================================
-- Duplicate detection for the review queue
-- Compares each pending recipe with the live and pending recipes submitted BEFORE it (so the first one is the
-- "original"), by title, ingredients and steps. Trigram similarity tolerates typos and small edits; titles use
-- word similarity so "Butter Chicken" matches "Dilli Wali Butter Chicken".
-- ============================================================================
create extension if not exists pg_trgm with schema extensions;

-- A recipe list (ingredients or steps) as plain comparable text: lower case, no quantities or punctuation.
-- Ingredients are sorted so a reordered list still matches; steps keep their order.
create or replace function public.recipe_fingerprint(p_items jsonb, p_sorted boolean) returns text language sql immutable set search_path = '' as $$
  select coalesce(btrim(regexp_replace(lower(string_agg(item, ' ' order by case when p_sorted then item end, position)), '[[:punct:][:digit:][:space:]]+', ' ', 'g')), '')
  from jsonb_array_elements_text(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) with ordinality as list(item, position);
$$;
revoke execute on function public.recipe_fingerprint(jsonb, boolean) from public, anon;

-- For each given recipe, its closest earlier match. kind = 'copy' when the ingredients and method are near-identical,
-- 'similar' when it looks like the same dish. Recipes with no meaningful match are left out.
create or replace function public.admin_find_duplicates(p_recipes uuid[]) returns table (
  recipe_id uuid, match_id uuid, match_title text, match_author text, match_status text, same_author boolean,
  title_score real, ingredients_score real, steps_score real, score real, kind text
) language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  with mine as (
    select r.id, r.author_id, r.created_at, lower(btrim(r.title)) as t,
      public.recipe_fingerprint(r.ingredients, true) as ing, public.recipe_fingerprint(r.steps, false) as stp
    from public.recipes r where r.id = any(p_recipes)
  ), scored as (
    select m.id as recipe_id, o.id as match_id, o.title as match_title, p.full_name as match_author, o.status as match_status,
      o.author_id = m.author_id as same_author,
      greatest(extensions.word_similarity(m.t, lower(btrim(o.title))), extensions.word_similarity(lower(btrim(o.title)), m.t)) as ts,
      extensions.similarity(m.ing, public.recipe_fingerprint(o.ingredients, true)) as ings,
      extensions.similarity(m.stp, public.recipe_fingerprint(o.steps, false)) as stps
    from mine m
    join public.recipes o on o.id <> m.id and o.created_at < m.created_at and o.status in ('approved', 'pending')
    left join public.profiles p on p.id = o.author_id
  ), ranked as (
    select s.*, (0.2 * s.ts + 0.4 * s.ings + 0.4 * s.stps)::real as total,
      case when s.ings >= 0.6 and s.stps >= 0.6 then 'copy' when s.ts >= 0.6 or (0.2 * s.ts + 0.4 * s.ings + 0.4 * s.stps) >= 0.4 then 'similar' end as k
    from scored s
  )
  select distinct on (x.recipe_id) x.recipe_id, x.match_id, x.match_title, x.match_author, x.match_status, x.same_author,
    x.ts::real, x.ings::real, x.stps::real, x.total, x.k
  from ranked x where x.k is not null
  order by x.recipe_id, (x.k = 'copy') desc, x.total desc;
end; $$;
revoke execute on function public.admin_find_duplicates(uuid[]) from public, anon;
grant execute on function public.admin_find_duplicates(uuid[]) to authenticated;

-- The owner: first admin, can't be demoted or banned by anyone.
update public.profiles set role = 'owner' where id = (select id from auth.users where email = 'sahil.015sharma@gmail.com');
