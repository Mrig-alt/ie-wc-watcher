ALTER TABLE "matches" ADD COLUMN "team1_penalties" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "team2_penalties" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "leaderboard_visibility" boolean DEFAULT true NOT NULL;