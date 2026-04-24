-- 0002_teams_players.sql

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_color text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  handicap numeric(4,1) not null,
  team_id uuid not null references public.teams(id),
  team_slot text not null check (team_slot in ('A','B','C','D')),
  user_id uuid references auth.users(id) on delete set null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, team_slot)
);

create unique index players_user_id_unique
  on public.players (user_id)
  where user_id is not null;

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();
