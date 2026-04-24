-- 0008_rls_policies.sql
-- Row-level security per §8 of the brief.

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.holes enable row level security;
alter table public.matches enable row level security;
alter table public.scramble_entries enable row level security;
alter table public.scramble_participants enable row level security;
alter table public.hole_scores enable row level security;
alter table public.chat_messages enable row level security;
alter table public.audit_log enable row level security;

-- -------------------------------------------------------------------------
-- Read-for-all tables (spectator read-only)
-- -------------------------------------------------------------------------

create policy teams_select_all on public.teams
  for select using (true);
create policy teams_write_admin on public.teams
  for all using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));

create policy players_select_all on public.players
  for select using (true);
create policy players_update_admin on public.players
  for update using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));
create policy players_insert_admin on public.players
  for insert with check (public.is_admin_for(auth.uid()));
create policy players_delete_admin on public.players
  for delete using (public.is_admin_for(auth.uid()));
-- A player can claim their own row on first sign-in by linking user_id.
-- This is handled server-side via the /api/claim route (service role), not via direct RLS.

create policy rounds_select_all on public.rounds
  for select using (true);
create policy rounds_write_admin on public.rounds
  for all using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));

create policy holes_select_all on public.holes
  for select using (true);
create policy holes_write_admin on public.holes
  for all using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));

create policy matches_select_all on public.matches
  for select using (true);
create policy matches_write_admin on public.matches
  for all using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));

create policy scramble_entries_select_all on public.scramble_entries
  for select using (true);
create policy scramble_entries_write_admin on public.scramble_entries
  for all using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));

create policy scramble_participants_select_all on public.scramble_participants
  for select using (true);
create policy scramble_participants_write_admin on public.scramble_participants
  for all using (public.is_admin_for(auth.uid()))
  with check (public.is_admin_for(auth.uid()));

-- -------------------------------------------------------------------------
-- hole_scores: participant-or-admin writes
-- -------------------------------------------------------------------------

create policy hole_scores_select_all on public.hole_scores
  for select using (true);

-- A caller may insert / update a score if they are admin, OR
--   - (Day 1) the score is for their own player row, OR
--   - (Day 2/3) they are a participant in the target scramble_entry.
create policy hole_scores_upsert_participant on public.hole_scores
  for insert with check (
    public.is_admin_for(auth.uid())
    or (
      player_id is not null
      and exists (
        select 1 from public.players p
        where p.id = hole_scores.player_id
          and p.user_id = auth.uid()
      )
    )
    or (
      scramble_entry_id is not null
      and exists (
        select 1 from public.scramble_participants sp
        join public.players p on p.id = sp.player_id
        where sp.scramble_entry_id = hole_scores.scramble_entry_id
          and p.user_id = auth.uid()
      )
    )
  );

create policy hole_scores_update_participant on public.hole_scores
  for update using (
    public.is_admin_for(auth.uid())
    or (
      player_id is not null
      and exists (
        select 1 from public.players p
        where p.id = hole_scores.player_id and p.user_id = auth.uid()
      )
    )
    or (
      scramble_entry_id is not null
      and exists (
        select 1 from public.scramble_participants sp
        join public.players p on p.id = sp.player_id
        where sp.scramble_entry_id = hole_scores.scramble_entry_id
          and p.user_id = auth.uid()
      )
    )
  )
  with check (
    public.is_admin_for(auth.uid())
    or (
      player_id is not null
      and exists (
        select 1 from public.players p
        where p.id = hole_scores.player_id and p.user_id = auth.uid()
      )
    )
    or (
      scramble_entry_id is not null
      and exists (
        select 1 from public.scramble_participants sp
        join public.players p on p.id = sp.player_id
        where sp.scramble_entry_id = hole_scores.scramble_entry_id
          and p.user_id = auth.uid()
      )
    )
  );

create policy hole_scores_delete_admin on public.hole_scores
  for delete using (public.is_admin_for(auth.uid()));

-- -------------------------------------------------------------------------
-- chat_messages: authenticated-only, author-owned writes
-- -------------------------------------------------------------------------

create policy chat_select_authed on public.chat_messages
  for select using (auth.uid() is not null);

create policy chat_insert_self_human on public.chat_messages
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and kind = 'human'
  );

create policy chat_update_author_or_admin on public.chat_messages
  for update using (
    user_id = auth.uid() or public.is_admin_for(auth.uid())
  );

create policy chat_delete_author_or_admin on public.chat_messages
  for delete using (
    user_id = auth.uid() or public.is_admin_for(auth.uid())
  );

-- -------------------------------------------------------------------------
-- audit_log: admin-only SELECT; INSERTs come from triggers (security definer)
-- -------------------------------------------------------------------------

create policy audit_select_admin on public.audit_log
  for select using (public.is_admin_for(auth.uid()));
