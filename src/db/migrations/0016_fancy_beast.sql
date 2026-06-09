ALTER TABLE "predictions" ADD COLUMN "reminder_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "kickoff_reminded";