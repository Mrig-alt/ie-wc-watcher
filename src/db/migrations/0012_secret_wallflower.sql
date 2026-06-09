CREATE TABLE "watch_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_rsvps_invite_id_student_id_unique" UNIQUE("invite_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "student2_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bets" ADD COLUMN "is_open_market" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "watch_rsvps" ADD CONSTRAINT "watch_rsvps_invite_id_watch_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."watch_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_rsvps" ADD CONSTRAINT "watch_rsvps_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;