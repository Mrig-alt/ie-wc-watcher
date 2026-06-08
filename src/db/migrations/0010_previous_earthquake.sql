ALTER TABLE "students" ADD COLUMN "notifications_onboarded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "push_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "email_enabled" boolean DEFAULT false NOT NULL;