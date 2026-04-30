-- Idempotent tee-time group seed — INSERT OR IGNORE so safe to replay.
-- Each round has 5 groups of 4; group_number = tee-time order (1 = first off).

-- ------------------------------------------------------------------
-- Day 1 — Pinewild CC (round-1)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO tee_time_groups (id, round_id, group_number, position, player_id) VALUES
  ('ttg-r1-1-1','round-1',1,1,'p-reid'),
  ('ttg-r1-1-2','round-1',1,2,'p-ham'),
  ('ttg-r1-1-3','round-1',1,3,'p-pincus'),
  ('ttg-r1-1-4','round-1',1,4,'p-nate'),

  ('ttg-r1-2-1','round-1',2,1,'p-mellis'),
  ('ttg-r1-2-2','round-1',2,2,'p-ric'),
  ('ttg-r1-2-3','round-1',2,3,'p-keller'),
  ('ttg-r1-2-4','round-1',2,4,'p-mcardle'),

  ('ttg-r1-3-1','round-1',3,1,'p-tom'),
  ('ttg-r1-3-2','round-1',3,2,'p-byrnes'),
  ('ttg-r1-3-3','round-1',3,3,'p-mason'),
  ('ttg-r1-3-4','round-1',3,4,'p-cota'),

  ('ttg-r1-4-1','round-1',4,1,'p-foley'),
  ('ttg-r1-4-2','round-1',4,2,'p-bands'),
  ('ttg-r1-4-3','round-1',4,3,'p-bot'),
  ('ttg-r1-4-4','round-1',4,4,'p-matkins'),

  ('ttg-r1-5-1','round-1',5,1,'p-mallen'),
  ('ttg-r1-5-2','round-1',5,2,'p-bennett'),
  ('ttg-r1-5-3','round-1',5,3,'p-luke'),
  ('ttg-r1-5-4','round-1',5,4,'p-davis');

-- ------------------------------------------------------------------
-- Day 2 — Talamore Golf Club (round-2)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO tee_time_groups (id, round_id, group_number, position, player_id) VALUES
  ('ttg-r2-1-1','round-2',1,1,'p-reid'),
  ('ttg-r2-1-2','round-2',1,2,'p-bot'),
  ('ttg-r2-1-3','round-2',1,3,'p-cota'),
  ('ttg-r2-1-4','round-2',1,4,'p-mellis'),

  ('ttg-r2-2-1','round-2',2,1,'p-ham'),
  ('ttg-r2-2-2','round-2',2,2,'p-matkins'),
  ('ttg-r2-2-3','round-2',2,3,'p-davis'),
  ('ttg-r2-2-4','round-2',2,4,'p-mcardle'),

  ('ttg-r2-3-1','round-2',3,1,'p-bennett'),
  ('ttg-r2-3-2','round-2',3,2,'p-pincus'),
  ('ttg-r2-3-3','round-2',3,3,'p-bands'),
  ('ttg-r2-3-4','round-2',3,4,'p-byrnes'),

  ('ttg-r2-4-1','round-2',4,1,'p-mason'),
  ('ttg-r2-4-2','round-2',4,2,'p-nate'),
  ('ttg-r2-4-3','round-2',4,3,'p-luke'),
  ('ttg-r2-4-4','round-2',4,4,'p-ric'),

  ('ttg-r2-5-1','round-2',5,1,'p-keller'),
  ('ttg-r2-5-2','round-2',5,2,'p-mallen'),
  ('ttg-r2-5-3','round-2',5,3,'p-foley'),
  ('ttg-r2-5-4','round-2',5,4,'p-tom');

-- ------------------------------------------------------------------
-- Day 3 — Hyland Golf Club (round-3)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO tee_time_groups (id, round_id, group_number, position, player_id) VALUES
  ('ttg-r3-1-1','round-3',1,1,'p-reid'),
  ('ttg-r3-1-2','round-3',1,2,'p-tom'),
  ('ttg-r3-1-3','round-3',1,3,'p-foley'),
  ('ttg-r3-1-4','round-3',1,4,'p-bot'),

  ('ttg-r3-2-1','round-3',2,1,'p-ham'),
  ('ttg-r3-2-2','round-3',2,2,'p-byrnes'),
  ('ttg-r3-2-3','round-3',2,3,'p-bands'),
  ('ttg-r3-2-4','round-3',2,4,'p-matkins'),

  ('ttg-r3-3-1','round-3',3,1,'p-pincus'),
  ('ttg-r3-3-2','round-3',3,2,'p-ric'),
  ('ttg-r3-3-3','round-3',3,3,'p-luke'),
  ('ttg-r3-3-4','round-3',3,4,'p-bennett'),

  ('ttg-r3-4-1','round-3',4,1,'p-nate'),
  ('ttg-r3-4-2','round-3',4,2,'p-mcardle'),
  ('ttg-r3-4-3','round-3',4,3,'p-davis'),
  ('ttg-r3-4-4','round-3',4,4,'p-mason'),

  ('ttg-r3-5-1','round-3',5,1,'p-keller'),
  ('ttg-r3-5-2','round-3',5,2,'p-mellis'),
  ('ttg-r3-5-3','round-3',5,3,'p-cota'),
  ('ttg-r3-5-4','round-3',5,4,'p-mallen');
