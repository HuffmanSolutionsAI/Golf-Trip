-- 0005_scramble.sql

create table public.scramble_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  pool text check (pool in ('AD','BC')),
  manual_tiebreak_rank int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, team_id, pool)
);

create trigger scramble_entries_set_updated_at
before update on public.scramble_entries
for each row execute function public.set_updated_at();

create table public.scramble_participants (
  scramble_entry_id uuid not null references public.scramble_entries(id) on delete cascade,
  player_id uuid not null references public.players(id),
  primary key (scramble_entry_id, player_id)
);
