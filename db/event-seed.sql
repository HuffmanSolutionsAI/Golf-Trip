-- Bootstrap the canonical first event. Idempotent — INSERT OR IGNORE means
-- the row is created on a fresh DB and left alone afterward, so commissioner
-- edits to event metadata persist across boots.
--
-- This must run BEFORE any seed.sql / tee-groups-seed.sql inserts that
-- reference event_id='event-1' via the column default.

INSERT OR IGNORE INTO brand_overrides (id, name, tokens_json, hero_copy) VALUES
  (
    'brand-editorial-v2',
    'Editorial / Volume II',
    '{"palette":"midnight-oak","fonts":{"display":"DM Serif Display Italic","body":"Tinos","ui":"Inter","mono":"JetBrains Mono"},"accents":{"rule":"gold","grain":"paper"}}',
    'Volume II'
  );

INSERT OR IGNORE INTO events (
  id, name, subtitle, start_date, end_date,
  visibility, handicap_source, brand_override_id
) VALUES (
  'event-1',
  'N&P Invitational',
  'Volume II',
  '2026-04-29',
  '2026-05-01',
  'public',
  'manual',
  'brand-editorial-v2'
);
