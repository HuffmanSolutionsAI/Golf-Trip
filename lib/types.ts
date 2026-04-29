// Shared TS types mirroring the SQLite schema.

export type EventRow = {
  id: string;
  name: string;
  subtitle: string | null;
  start_date: string | null;
  end_date: string | null;
  visibility: "public" | "unlisted" | "private";
  commissioner_user_id: string | null;
  handicap_source: "manual" | "ghin" | "whs";
  brand_override_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandOverrideRow = {
  id: string;
  name: string;
  tokens_json: string;
  wordmark: string | null;
  hero_copy: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamRow = {
  id: string;
  event_id: string;
  name: string;
  display_color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  name: string;
  handicap: number;
  team_id: string;
  team_slot: "A" | "B" | "C" | "D";
  is_admin: number; // SQLite boolean = 0/1
  created_at: string;
  updated_at: string;
};

export type RoundRow = {
  id: string;
  event_id: string;
  course_id: string | null;
  day: 1 | 2 | 3;
  date: string;
  course_name: string;
  total_par: number;
  format: "singles" | "scramble_2man" | "scramble_4man";
  tee_time: string;
  is_locked: number;
  created_at: string;
  updated_at: string;
};

export type CourseRow = {
  id: string;
  name: string;
  location: string | null;
  total_par: number;
  hole_count: number;
  created_at: string;
  updated_at: string;
};

export type CourseHoleRow = {
  course_id: string;
  hole_number: number;
  par: number;
  handicap_index: number | null;
  yardage: number | null;
};

export type CourseTeeBoxRow = {
  id: string;
  course_id: string;
  name: string;
  rating: number;
  slope: number;
  total_yards: number | null;
  sort_order: number;
  created_at: string;
};

export type HoleRow = {
  id: string;
  round_id: string;
  hole_number: number;
  par: number;
  handicap_index: number | null;
  yardage: number | null;
  created_at: string;
  updated_at: string;
};

export type MatchRow = {
  id: string;
  round_id: string;
  match_number: number;
  player1_id: string;
  player2_id: string;
  stroke_giver_id: string | null;
  strokes_given: number;
  created_at: string;
  updated_at: string;
};

export type ScrambleEntryRow = {
  id: string;
  round_id: string;
  team_id: string;
  pool: "AD" | "BC" | null;
  manual_tiebreak_rank: number | null;
  created_at: string;
  updated_at: string;
};

export type ScrambleParticipantRow = {
  scramble_entry_id: string;
  player_id: string;
};

export type HoleScoreRow = {
  id: string;
  round_id: string;
  player_id: string | null;
  scramble_entry_id: string | null;
  hole_number: number;
  strokes: number;
  entered_by: string;
  entered_at: string;
};

export type ChatMessageRow = {
  id: string;
  event_id: string;
  player_id: string | null;
  body: string;
  kind: "human" | "system";
  posted_at: string;
};

export type AuditLogRow = {
  id: string;
  event_id: string;
  player_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before_value: string | null;
  after_value: string | null;
  occurred_at: string;
};

export type SessionRow = {
  id: string;
  player_id: string | null;
  user_id: string | null;
  created_at: string;
  expires_at: string;
};

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRoleRow = {
  event_id: string;
  user_id: string;
  role: "commissioner" | "scorer" | "player" | "spectator";
  created_at: string;
};

export type MagicLinkTokenRow = {
  token_hash: string;
  email: string;
  event_id: string | null;
  next_path: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type TeeGroupRow = {
  id: string;
  round_id: string;
  group_number: number;
  scheduled_time: string | null;
  scorer_player_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TeeGroupMemberRow = {
  tee_group_id: string;
  match_id: string;
};

export type TeeGroupEntryRow = {
  tee_group_id: string;
  scramble_entry_id: string;
};

// ---- Derived (TS-computed) shapes ----

export type LeaderboardRow = {
  team_id: string;
  name: string;
  display_color: string;
  sort_order: number;
  day1_points: number;
  day2_points: number;
  day3_points: number;
  total_points: number;
  rank: number;
  is_projected: boolean;
  status_label: string;
};

export type Day1MatchStateRow = {
  match_id: string;
  round_id: string;
  match_number: number;
  player1_id: string;
  player2_id: string;
  stroke_giver_id: string | null;
  strokes_given: number;
  p1_total_gross: number;
  p2_total_gross: number;
  p1_total_net: number;
  p2_total_net: number;
  p1_holes: number;
  p2_holes: number;
  holes_both_played: number;
  net_diff: number; // signed: + = p1 ahead (lower net), - = p2 ahead
  status: "pending" | "in_progress" | "final";
  winner_player_id: string | null;
  p1_team_points: number;
  p2_team_points: number;
};

export type Day2PoolRankRow = {
  entry_id: string;
  round_id: string;
  team_id: string;
  pool: "AD" | "BC";
  manual_tiebreak_rank: number | null;
  team_raw: number;
  holes_thru: number;
  rank_in_pool: number;
  points: number;
  projected: boolean;
};

export type Day3StandingsRow = {
  entry_id: string;
  round_id: string;
  team_id: string;
  team_raw: number;
  holes_thru: number;
  par_thru: number;
  under_par: number;
  rank: number;
  placement_points: number;
  bonus_points: number;
  total_points: number;
  projected: boolean;
};

// Tournament-style daily leaderboard rows (server-computed for the leaderboard page).

export type Day1IndividualRow = {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  display_color: string;
  team_slot: "A" | "B" | "C" | "D";
  handicap: number;
  match_id: string;
  match_number: number;
  opponent_id: string;
  opponent_name: string;
  gross_total: number;
  par_thru: number;
  score_to_par: number;
  holes_thru: number;
  match_status: "pending" | "in_progress" | "final";
  net_diff: number; // signed from this player's perspective (+ = ahead in net)
  is_winner: boolean | null;
  rank: number;
};

export type Day2EntryDisplayRow = {
  entry_id: string;
  team_id: string;
  team_name: string;
  display_color: string;
  pool: "AD" | "BC";
  participant_names: string[];
  team_raw: number;
  par_thru: number;
  score_to_par: number;
  holes_thru: number;
  rank_in_pool: number;
  rank_overall: number;
  points: number;
  projected: boolean;
};

export type Day3EntryDisplayRow = {
  entry_id: string;
  team_id: string;
  team_name: string;
  display_color: string;
  participant_names: string[];
  team_raw: number;
  par_thru: number;
  score_to_par: number;
  holes_thru: number;
  rank: number;
  placement_points: number;
  bonus_points: number;
  total_points: number;
  projected: boolean;
};
