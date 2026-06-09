CREATE INDEX "bets_student1_idx" ON "bets" USING btree ("student1_id");--> statement-breakpoint
CREATE INDEX "bets_student2_idx" ON "bets" USING btree ("student2_id");--> statement-breakpoint
CREATE INDEX "bets_status_idx" ON "bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "matches_match_datetime_idx" ON "matches" USING btree ("match_datetime");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");