// Shared TS types mirroring the DB schema.

export type TeamRow = {
  id: string;
  name: string;
  display_color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  name: string;
  handicap: number;
  team_id: string;
  team_slot: "A" | "B" | "C" | "D";
  user_id: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type RoundRow = {
  id: string;
  day: 1 | 2 | 3;
  date: string;
  course_name: string;
  total_par: number;
  format: "singles" | "scramble_2man" | "scramble_4man";
  tee_time: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
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
  user_id: string | null;
  player_id: string | null;
  body: string;
  kind: "human" | "system";
  posted_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before_value: unknown;
  after_value: unknown;
  occurred_at: string;
};

// View shapes

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
  stroke_hole_numbers: number[];
  p1_total_gross: number;
  p2_total_gross: number;
  p1_total_net: number;
  p2_total_net: number;
  p1_holes: number;
  p2_holes: number;
  holes_both_played: number;
  current_holes_up: number;
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
