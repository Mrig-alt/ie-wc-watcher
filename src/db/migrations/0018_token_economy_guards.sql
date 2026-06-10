-- Add FK constraint so referredBy always points to a real student (or NULL)
ALTER TABLE "students" ADD CONSTRAINT "students_referred_by_fkey"
  FOREIGN KEY ("referred_by") REFERENCES "students"("id") ON DELETE SET NULL;--> statement-breakpoint

-- Prevent group member token balances from going negative
ALTER TABLE "group_members" ADD CONSTRAINT "group_token_balance_check"
  CHECK ("token_balance" >= 0);--> statement-breakpoint

-- Track last weekly refill per student for cron idempotency
ALTER TABLE "students" ADD COLUMN "last_weekly_refill_at" timestamp;
