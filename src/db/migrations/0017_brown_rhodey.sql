CREATE INDEX "group_members_student_idx" ON "group_members" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "live_reports_student_idx" ON "live_reports" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "live_reports_venue_idx" ON "live_reports" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "live_reports_match_idx" ON "live_reports" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "token_ledger_student_idx" ON "token_ledger" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "venues_added_by_idx" ON "venues" USING btree ("added_by");