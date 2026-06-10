-- Migration 0020: tournament winner pick + match-start notification flag
ALTER TABLE students ADD COLUMN IF NOT EXISTS tournament_pick_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS start_notification_sent boolean NOT NULL DEFAULT false;
