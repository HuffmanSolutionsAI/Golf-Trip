-- 0010_realtime.sql
-- Add realtime-relevant tables to the `supabase_realtime` publication.

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.hole_scores;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.scramble_entries;
alter publication supabase_realtime add table public.players;
