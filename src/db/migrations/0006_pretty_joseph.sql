CREATE TABLE "prediction_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"old_score1" integer,
	"old_score2" integer,
	"new_score1" integer NOT NULL,
	"new_score2" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"question_key" varchar(50) NOT NULL,
	"response_text" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tokens_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_student_id_question_key_unique" UNIQUE("student_id","question_key")
);
--> statement-breakpoint
CREATE TABLE "token_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"match_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "settled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "is_early" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "is_guest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "has_bought_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "last_floor_replenished_at" timestamp;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;