-- 0007_chat_audit.sql

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  player_id uuid references public.players(id),
  body text not null,
  kind text not null default 'human' check (kind in ('human','system')),
  posted_at timestamptz not null default now()
);

create index chat_messages_posted_at_idx
  on public.chat_messages (posted_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  before_value jsonb,
  after_value jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);

-- Generic audit trigger. Writes the BEFORE/AFTER row state for any change on
-- the target table, and tags with auth.uid() when available.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  action_kind text;
begin
  begin
    uid := auth.uid();
  exception when others then
    uid := null;
  end;

  if tg_op = 'INSERT' then
    action_kind := tg_argv[0] || '.insert';
    insert into public.audit_log (user_id, action, entity_type, entity_id, before_value, after_value)
    values (uid, action_kind, tg_argv[0], new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    action_kind := tg_argv[0] || '.update';
    insert into public.audit_log (user_id, action, entity_type, entity_id, before_value, after_value)
    values (uid, action_kind, tg_argv[0], new.id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    action_kind := tg_argv[0] || '.delete';
    insert into public.audit_log (user_id, action, entity_type, entity_id, before_value, after_value)
    values (uid, action_kind, tg_argv[0], old.id, to_jsonb(old), null);
    return old;
  end if;
end;
$$;

create trigger audit_hole_scores
after insert or update or delete on public.hole_scores
for each row execute function public.audit_row_change('hole_score');

create trigger audit_players_handicap
after update of handicap on public.players
for each row execute function public.audit_row_change('player');

create trigger audit_holes
after update of par, handicap_index on public.holes
for each row execute function public.audit_row_change('hole');

create trigger audit_scramble_entries_tiebreak
after update of manual_tiebreak_rank on public.scramble_entries
for each row execute function public.audit_row_change('scramble_entry');
