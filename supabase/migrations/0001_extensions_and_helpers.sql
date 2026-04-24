-- 0001_extensions_and_helpers.sql
-- Extensions and shared helper functions used across the schema.

create extension if not exists pgcrypto;

-- updated_at trigger function used by every table with an updated_at column
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- is_admin_for helper used by RLS policies
create or replace function public.is_admin_for(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where user_id = uid and is_admin = true
  );
$$;
