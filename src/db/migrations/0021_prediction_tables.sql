-- Migration 0021: players, scorer_predictions, lineup_predictions tables
-- Also adds missing match columns that were in schema.ts but never migrated

CREATE TABLE IF NOT EXISTS "players" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "position" varchar(3) NOT NULL,
  "club" varchar(100),
  "fantasy_value" integer NOT NULL DEFAULT 6,
  "fantasy_score" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "players_team_id_idx" ON "players" ("team_id");
CREATE INDEX IF NOT EXISTS "players_position_idx" ON "players" ("position");

CREATE TABLE IF NOT EXISTS "lineup_predictions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "player_id" uuid NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "player_name" varchar(100) NOT NULL,
  "position" varchar(3) NOT NULL,
  "is_correct" boolean,
  "is_processed" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "lineup_predictions_match_student_idx" ON "lineup_predictions" ("match_id", "student_id");
CREATE INDEX IF NOT EXISTS "lineup_predictions_student_idx" ON "lineup_predictions" ("student_id");

CREATE TABLE IF NOT EXISTS "scorer_predictions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "player_id" uuid NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "player_name" varchar(100) NOT NULL,
  "is_correct" boolean,
  "is_processed" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE("student_id", "match_id")
);
CREATE INDEX IF NOT EXISTS "scorer_predictions_match_idx" ON "scorer_predictions" ("match_id");
CREATE INDEX IF NOT EXISTS "scorer_predictions_student_idx" ON "scorer_predictions" ("student_id");

-- Missing columns on matches (in schema.ts but never had a migration)
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "watch_reminder_sent" boolean NOT NULL DEFAULT false;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "api_football_fixture_id" integer;

-- Fix token_balance default: new users should start with 1000
ALTER TABLE "students" ALTER COLUMN "token_balance" SET DEFAULT 1000;
