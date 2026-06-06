CREATE TYPE "public"."bet_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."bet_status";--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "status" SET DATA TYPE "public"."bet_status" USING "status"::"public"."bet_status";--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "token_balance_check" CHECK ("students"."token_balance" >= 0);