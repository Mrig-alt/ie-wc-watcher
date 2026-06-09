ALTER TABLE "prediction_history" DROP CONSTRAINT "prediction_history_prediction_id_predictions_id_fk";
--> statement-breakpoint
ALTER TABLE "prediction_history" DROP CONSTRAINT "prediction_history_student_id_students_id_fk";
--> statement-breakpoint
ALTER TABLE "prediction_history" DROP CONSTRAINT "prediction_history_match_id_matches_id_fk";
--> statement-breakpoint
ALTER TABLE "prediction_history" ALTER COLUMN "prediction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_history" ALTER COLUMN "student_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_history" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_escrow_tokens_check" CHECK ("group_members"."escrow_tokens" >= 0);--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "escrow_tokens_check" CHECK ("students"."escrow_tokens" >= 0);