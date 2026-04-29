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
  ),
  (
    'brand-pebble',
    'Pebble',
    '{"tokens":{"--color-cream":"#ECDFC8","--color-navy":"#163D5C","--color-gold":"#8C714A","--color-stone":"#6F7D83","--color-oxblood":"#7A2222","--color-rule-cream":"rgba(22, 61, 92, 0.16)"}}',
    NULL
  ),
  (
    'brand-augusta',
    'Pinestraw',
    '{"tokens":{"--color-cream":"#F4EAD7","--color-navy":"#1F4030","--color-gold":"#C8A951","--color-stone":"#5D6648","--color-oxblood":"#7A2F1F","--color-rule-cream":"rgba(31, 64, 48, 0.16)"}}',
    NULL
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
