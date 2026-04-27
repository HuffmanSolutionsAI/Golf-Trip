-- SQLite seed — idempotent via INSERT OR IGNORE. Player IDs, team IDs,
-- round IDs, etc. are deterministic so the app can reference them by name.

-- ------------------------------------------------------------------
-- Teams
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO teams (id, name, display_color, sort_order) VALUES
  ('team-1', 'Team 1', '#A83232', 1),
  ('team-2', 'Team 2', '#2F5233', 2),
  ('team-3', 'Team 3', '#2D4E8A', 3),
  ('team-4', 'Team 4', '#B07324', 4),
  ('team-5', 'Team 5', '#5B2B4C', 5);

-- ------------------------------------------------------------------
-- Players
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO players (id, name, handicap, team_id, team_slot, is_admin) VALUES
  ('p-reid',    'Reid',     3.3, 'team-1', 'A', 1),
  ('p-tom',     'Tom',     13.0, 'team-1', 'B', 0),
  ('p-foley',   'Foley',   15.0, 'team-1', 'C', 0),
  ('p-bot',     'Bot',     34.9, 'team-1', 'D', 0),
  ('p-ham',     'Ham',      6.1, 'team-2', 'A', 0),
  ('p-byrnes',  'Byrnes',  12.1, 'team-2', 'B', 0),
  ('p-bands',   'Bands',   15.2, 'team-2', 'C', 0),
  ('p-matkins', 'Matkins', 24.6, 'team-2', 'D', 0),
  ('p-pincus',  'Pincus',   6.8, 'team-3', 'A', 0),
  ('p-ric',     'Ric',     11.0, 'team-3', 'B', 0),
  ('p-luke',    'Luke',    15.3, 'team-3', 'C', 0),
  ('p-bennett', 'Bennett', 22.8, 'team-3', 'D', 0),
  ('p-nate',    'Nate',     7.4, 'team-4', 'A', 0),
  ('p-mcardle', 'McArdle', 10.8, 'team-4', 'B', 0),
  ('p-davis',   'Davis',   15.6, 'team-4', 'C', 0),
  ('p-mason',   'Mason',   21.4, 'team-4', 'D', 0),
  ('p-keller',  'Keller',   7.6, 'team-5', 'A', 0),
  ('p-mellis',  'Mellis',  10.5, 'team-5', 'B', 0),
  ('p-cota',    'Cota',    20.0, 'team-5', 'C', 0),
  ('p-mallen',  'Mallen',  20.1, 'team-5', 'D', 0);

-- ------------------------------------------------------------------
-- Rounds
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO rounds (id, day, date, course_name, total_par, format, tee_time) VALUES
  ('round-1', 1, '2026-05-07', 'Pinewild CC — Magnolia Course', 72, 'singles',       '10:21:00'),
  ('round-2', 2, '2026-05-08', 'Talamore Golf Club',         71, 'scramble_2man', '08:45:00'),
  ('round-3', 3, '2026-05-09', 'Hyland Golf Club',           72, 'scramble_4man', '10:00:00');

-- ------------------------------------------------------------------
-- Holes — Day 1 Pinewild Magnolia (placeholders; fill in at pro shop 5/7)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO holes (id, round_id, hole_number, par, handicap_index) VALUES
  ('h1-01','round-1', 1, 4, NULL),  ('h1-02','round-1', 2, 5, NULL),
  ('h1-03','round-1', 3, 3, NULL),  ('h1-04','round-1', 4, 4, NULL),
  ('h1-05','round-1', 5, 4, NULL),  ('h1-06','round-1', 6, 4, NULL),
  ('h1-07','round-1', 7, 3, NULL),  ('h1-08','round-1', 8, 5, NULL),
  ('h1-09','round-1', 9, 4, NULL),  ('h1-10','round-1',10, 4, NULL),
  ('h1-11','round-1',11, 4, NULL),  ('h1-12','round-1',12, 3, NULL),
  ('h1-13','round-1',13, 5, NULL),  ('h1-14','round-1',14, 4, NULL),
  ('h1-15','round-1',15, 4, NULL),  ('h1-16','round-1',16, 4, NULL),
  ('h1-17','round-1',17, 3, NULL),  ('h1-18','round-1',18, 5, NULL);

-- ------------------------------------------------------------------
-- Holes — Day 2 Talamore (par 71)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO holes (id, round_id, hole_number, par, handicap_index) VALUES
  ('h2-01','round-2', 1, 5,  4),  ('h2-02','round-2', 2, 3, 16),
  ('h2-03','round-2', 3, 4,  6),  ('h2-04','round-2', 4, 5, 14),
  ('h2-05','round-2', 5, 3, 18),  ('h2-06','round-2', 6, 4, 12),
  ('h2-07','round-2', 7, 4,  2),  ('h2-08','round-2', 8, 4,  8),
  ('h2-09','round-2', 9, 4, 10),  ('h2-10','round-2',10, 4,  7),
  ('h2-11','round-2',11, 5, 15),  ('h2-12','round-2',12, 4,  5),
  ('h2-13','round-2',13, 3, 17),  ('h2-14','round-2',14, 4,  9),
  ('h2-15','round-2',15, 3, 13),  ('h2-16','round-2',16, 4,  1),
  ('h2-17','round-2',17, 4, 11),  ('h2-18','round-2',18, 4,  3);

-- ------------------------------------------------------------------
-- Holes — Day 3 Hyland (par 72)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO holes (id, round_id, hole_number, par, handicap_index) VALUES
  ('h3-01','round-3', 1, 4, 11),  ('h3-02','round-3', 2, 4,  7),
  ('h3-03','round-3', 3, 3, 17),  ('h3-04','round-3', 4, 4,  1),
  ('h3-05','round-3', 5, 4,  5),  ('h3-06','round-3', 6, 3, 15),
  ('h3-07','round-3', 7, 5,  9),  ('h3-08','round-3', 8, 4, 13),
  ('h3-09','round-3', 9, 5,  3),  ('h3-10','round-3',10, 3, 16),
  ('h3-11','round-3',11, 4, 10),  ('h3-12','round-3',12, 5,  2),
  ('h3-13','round-3',13, 3, 14),  ('h3-14','round-3',14, 4,  8),
  ('h3-15','round-3',15, 4,  6),  ('h3-16','round-3',16, 4, 18),
  ('h3-17','round-3',17, 5,  4),  ('h3-18','round-3',18, 4, 12);

-- ------------------------------------------------------------------
-- Matches — Day 1 singles (stroke alloc from §10.7 of the build brief)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO matches (id, round_id, match_number, player1_id, player2_id, stroke_giver_id, strokes_given) VALUES
  ('m-01','round-1', 1, 'p-reid',    'p-pincus',  'p-pincus',  4),
  ('m-02','round-1', 2, 'p-tom',     'p-ham',     'p-tom',     7),
  ('m-03','round-1', 3, 'p-luke',    'p-bands',   NULL,        0),
  ('m-04','round-1', 4, 'p-bot',     'p-bennett', 'p-bot',    11),
  ('m-05','round-1', 5, 'p-foley',   'p-davis',   NULL,        0),
  ('m-06','round-1', 6, 'p-byrnes',  'p-mcardle', NULL,        0),
  ('m-07','round-1', 7, 'p-matkins', 'p-cota',    'p-matkins', 5),
  ('m-08','round-1', 8, 'p-mallen',  'p-mason',   NULL,        0),
  ('m-09','round-1', 9, 'p-ric',     'p-mellis',  NULL,        0),
  ('m-10','round-1',10, 'p-nate',    'p-keller',  NULL,        0);

-- ------------------------------------------------------------------
-- Scramble entries — Day 2 (AD and BC pools)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO scramble_entries (id, round_id, team_id, pool) VALUES
  ('s2-t1-ad','round-2','team-1','AD'), ('s2-t1-bc','round-2','team-1','BC'),
  ('s2-t2-ad','round-2','team-2','AD'), ('s2-t2-bc','round-2','team-2','BC'),
  ('s2-t3-ad','round-2','team-3','AD'), ('s2-t3-bc','round-2','team-3','BC'),
  ('s2-t4-ad','round-2','team-4','AD'), ('s2-t4-bc','round-2','team-4','BC'),
  ('s2-t5-ad','round-2','team-5','AD'), ('s2-t5-bc','round-2','team-5','BC');

INSERT OR IGNORE INTO scramble_participants (scramble_entry_id, player_id) VALUES
  ('s2-t1-ad','p-reid'),    ('s2-t1-ad','p-bot'),
  ('s2-t1-bc','p-tom'),     ('s2-t1-bc','p-foley'),
  ('s2-t2-ad','p-ham'),     ('s2-t2-ad','p-matkins'),
  ('s2-t2-bc','p-byrnes'),  ('s2-t2-bc','p-bands'),
  ('s2-t3-ad','p-pincus'),  ('s2-t3-ad','p-bennett'),
  ('s2-t3-bc','p-ric'),     ('s2-t3-bc','p-luke'),
  ('s2-t4-ad','p-nate'),    ('s2-t4-ad','p-mason'),
  ('s2-t4-bc','p-mcardle'), ('s2-t4-bc','p-davis'),
  ('s2-t5-ad','p-keller'),  ('s2-t5-ad','p-mallen'),
  ('s2-t5-bc','p-mellis'),  ('s2-t5-bc','p-cota');

-- ------------------------------------------------------------------
-- Scramble entries — Day 3 (one per team, all 4 players)
-- ------------------------------------------------------------------
INSERT OR IGNORE INTO scramble_entries (id, round_id, team_id, pool) VALUES
  ('s3-t1','round-3','team-1',NULL),
  ('s3-t2','round-3','team-2',NULL),
  ('s3-t3','round-3','team-3',NULL),
  ('s3-t4','round-3','team-4',NULL),
  ('s3-t5','round-3','team-5',NULL);

INSERT OR IGNORE INTO scramble_participants (scramble_entry_id, player_id) VALUES
  ('s3-t1','p-reid'),    ('s3-t1','p-tom'),     ('s3-t1','p-foley'),   ('s3-t1','p-bot'),
  ('s3-t2','p-ham'),     ('s3-t2','p-byrnes'),  ('s3-t2','p-bands'),   ('s3-t2','p-matkins'),
  ('s3-t3','p-pincus'),  ('s3-t3','p-ric'),     ('s3-t3','p-luke'),    ('s3-t3','p-bennett'),
  ('s3-t4','p-nate'),    ('s3-t4','p-mcardle'), ('s3-t4','p-davis'),   ('s3-t4','p-mason'),
  ('s3-t5','p-keller'),  ('s3-t5','p-mellis'),  ('s3-t5','p-cota'),    ('s3-t5','p-mallen');
