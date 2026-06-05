ALTER TABLE "bets" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "bets" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "bets" ADD COLUMN "challenger_team_side" integer;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "token_balance" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_group_id_friend_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."friend_groups"("id") ON DELETE cascade ON UPDATE no action;