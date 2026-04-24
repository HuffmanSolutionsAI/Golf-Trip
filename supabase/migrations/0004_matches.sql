-- 0004_matches.sql

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  match_number int not null check (match_number between 1 and 10),
  player1_id uuid not null references public.players(id),
  player2_id uuid not null references public.players(id),
  stroke_giver_id uuid references public.players(id),
  strokes_given int not null default 0 check (strokes_given between 0 and 11),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, match_number),
  check (player1_id <> player2_id)
);

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();
