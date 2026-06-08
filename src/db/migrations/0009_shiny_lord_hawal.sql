ALTER TYPE "public"."match_stage" ADD VALUE 'global';--> statement-breakpoint
ALTER TABLE "group_members" ALTER COLUMN "token_balance" SET DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "escrow_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "total_tokens_received" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "draw_odds" real;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "stake_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "total_tokens_received" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "escrow_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "device_id" varchar(255);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "referred_by" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "referral_tokens_earned" integer DEFAULT 0 NOT NULL;