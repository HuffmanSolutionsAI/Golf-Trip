-- 0006_hole_scores.sql

create table public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid references public.players(id),
  scramble_entry_id uuid references public.scramble_entries(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  strokes int not null check (strokes between 1 and 15),
  entered_by uuid not null references auth.users(id),
  entered_at timestamptz not null default now(),
  check ((player_id is not null)::int + (scramble_entry_id is not null)::int = 1)
);

-- Unique per player/hole and per scramble/hole. Partial unique indexes let one NULL coexist.
create unique index hole_scores_player_round_hole_unique
  on public.hole_scores (player_id, round_id, hole_number)
  where player_id is not null;

create unique index hole_scores_scramble_hole_unique
  on public.hole_scores (scramble_entry_id, hole_number)
  where scramble_entry_id is not null;

-- Bump updated_at on parent round whenever any score is inserted / updated / deleted
create or replace function public.bump_round_updated_at()
returns trigger
language plpgsql
as $$
declare
  rid uuid;
begin
  rid := coalesce(new.round_id, old.round_id);
  update public.rounds set updated_at = now() where id = rid;
  return coalesce(new, old);
end;
$$;

create trigger hole_scores_bump_round
after insert or update or delete on public.hole_scores
for each row execute function public.bump_round_updated_at();
