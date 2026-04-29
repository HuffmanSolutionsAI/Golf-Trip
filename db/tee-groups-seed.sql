-- Tee groups bootstrap. Idempotent — runs on every boot so existing DBs
-- upgrade without db:reset. Default scorers: team captain (slot A) when one
-- is in the group, otherwise the lowest-slot player by team number. The
-- commissioner can override via /api/admin/tee-group-scorer.
--
-- Tee times: round's base tee_time + 8-minute increments per group.
--
-- Memberships are reset on every boot (DELETE + INSERT) so that any
-- adjustment to the canonical pairings here propagates immediately. Group
-- rows themselves are INSERT OR IGNORE so commissioner-set scorers persist.

-- ---------------------------------------------------------------------------
-- Day 1 — round-1 (Pinewild · base 10:21). Five groups of 4 players, each
-- containing 2 head-to-head matches.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO tee_groups (id, round_id, group_number, scheduled_time, scorer_player_id) VALUES
  ('tg-1-1', 'round-1', 1, '10:21:00', 'p-reid'),
  ('tg-1-2', 'round-1', 2, '10:29:00', 'p-keller'),
  ('tg-1-3', 'round-1', 3, '10:37:00', 'p-tom'),
  ('tg-1-4', 'round-1', 4, '10:45:00', 'p-foley'),
  ('tg-1-5', 'round-1', 5, '10:53:00', 'p-mallen');

DELETE FROM tee_group_matches
  WHERE tee_group_id IN ('tg-1-1','tg-1-2','tg-1-3','tg-1-4','tg-1-5');

INSERT INTO tee_group_matches (tee_group_id, match_id) VALUES
  ('tg-1-1', 'm-01'), ('tg-1-1', 'm-02'),
  ('tg-1-2', 'm-04'), ('tg-1-2', 'm-03'),
  ('tg-1-3', 'm-05'), ('tg-1-3', 'm-08'),
  ('tg-1-4', 'm-06'), ('tg-1-4', 'm-07'),
  ('tg-1-5', 'm-09'), ('tg-1-5', 'm-10');

-- Heal stale default scorer for Tee 5 (Luke moved to Tee 4 in the latest
-- pairings; only reset if the scorer is still the old stale default).
UPDATE tee_groups SET scorer_player_id = 'p-mallen', updated_at = datetime('now')
  WHERE id = 'tg-1-5' AND scorer_player_id = 'p-luke';

-- ---------------------------------------------------------------------------
-- Day 2 — round-2 (Talamore · base 08:45). Five groups, each containing one
-- AD pair from one team and one BC pair from another.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO tee_groups (id, round_id, group_number, scheduled_time, scorer_player_id) VALUES
  ('tg-2-1', 'round-2', 1, '08:45:00', 'p-reid'),
  ('tg-2-2', 'round-2', 2, '08:53:00', 'p-ham'),
  ('tg-2-3', 'round-2', 3, '09:01:00', 'p-pincus'),
  ('tg-2-4', 'round-2', 4, '09:09:00', 'p-nate'),
  ('tg-2-5', 'round-2', 5, '09:17:00', 'p-keller');

DELETE FROM tee_group_entries
  WHERE tee_group_id IN ('tg-2-1','tg-2-2','tg-2-3','tg-2-4','tg-2-5');

INSERT INTO tee_group_entries (tee_group_id, scramble_entry_id) VALUES
  ('tg-2-1', 's2-t1-ad'), ('tg-2-1', 's2-t2-bc'),
  ('tg-2-2', 's2-t2-ad'), ('tg-2-2', 's2-t5-bc'),
  ('tg-2-3', 's2-t3-ad'), ('tg-2-3', 's2-t4-bc'),
  ('tg-2-4', 's2-t4-ad'), ('tg-2-4', 's2-t3-bc'),
  ('tg-2-5', 's2-t5-ad'), ('tg-2-5', 's2-t1-bc');

-- ---------------------------------------------------------------------------
-- Day 3 — round-3 (Hyland · base 10:00). One group per team (the foursome
-- IS the team scramble entry).
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO tee_groups (id, round_id, group_number, scheduled_time, scorer_player_id) VALUES
  ('tg-3-1', 'round-3', 1, '10:00:00', 'p-reid'),
  ('tg-3-2', 'round-3', 2, '10:08:00', 'p-ham'),
  ('tg-3-3', 'round-3', 3, '10:16:00', 'p-pincus'),
  ('tg-3-4', 'round-3', 4, '10:24:00', 'p-nate'),
  ('tg-3-5', 'round-3', 5, '10:32:00', 'p-keller');

DELETE FROM tee_group_entries
  WHERE tee_group_id IN ('tg-3-1','tg-3-2','tg-3-3','tg-3-4','tg-3-5');

INSERT INTO tee_group_entries (tee_group_id, scramble_entry_id) VALUES
  ('tg-3-1', 's3-t1'),
  ('tg-3-2', 's3-t2'),
  ('tg-3-3', 's3-t3'),
  ('tg-3-4', 's3-t4'),
  ('tg-3-5', 's3-t5');
