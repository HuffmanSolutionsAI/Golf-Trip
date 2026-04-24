-- 0003_rounds_holes.sql

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  day int not null check (day in (1,2,3)),
  date date not null,
  course_name text not null,
  total_par int not null,
  format text not null check (format in ('singles','scramble_2man','scramble_4man')),
  tee_time time not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(day)
);

create trigger rounds_set_updated_at
before update on public.rounds
for each row execute function public.set_updated_at();

create table public.holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 5),
  handicap_index int check (handicap_index between 1 and 18),
  yardage int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, hole_number)
);

create trigger holes_set_updated_at
before update on public.holes
for each row execute function public.set_updated_at();
