import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  unique,
  index,
  decimal,
  real,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const matchStatusEnum = pgEnum("match_status", [
  "upcoming",
  "live",
  "completed",
]);

export const matchStageEnum = pgEnum("match_stage", [
  "friendly",
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
  "global",
]);

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "friends",
  "stealth",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "accepted",
  "declined",
]);

export const liveReportStatusEnum = pgEnum("live_report_status", [
  "buzzing",
  "getting_busy",
  "packed",
  "queue_outside",
  "entry_fee",
  "good_screens",
  "quiet_now",
  "planning",
]);

export const betStatusEnum = pgEnum("bet_status", ["pending", "accepted", "declined", "expired"]);

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  countryCode: varchar("country_code", { length: 3 }).notNull().unique(),
  flagEmoji: varchar("flag_emoji", { length: 10 }).notNull(),
  group: varchar("group", { length: 1 }),
  confederation: varchar("confederation", { length: 10 }).notNull(),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  eliminatedStage: matchStageEnum("eliminated_stage"),
});

// ─── Students ─────────────────────────────────────────────────────────────────

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nationality: varchar("nationality", { length: 100 }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  isHonoraryFan: boolean("is_honorary_fan").notNull().default(false),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  leaderboardVisibility: boolean("leaderboard_visibility").notNull().default(true),
  tokenBalance: integer("token_balance").notNull().default(100),
  flagged: boolean("flagged").notNull().default(false),
  isGuest: boolean("is_guest").notNull().default(false),
  hasBoughtIn: boolean("has_bought_in").notNull().default(false),
  totalTokensReceived: integer("total_tokens_received").notNull().default(0),
  escrowTokens: integer("escrow_tokens").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at"),
  pushSubscription: text("push_subscription"),
  deviceId: varchar("device_id", { length: 255 }), // Anti-cheat persistent cookie identifier
  referredBy: uuid("referred_by"), // FK enforced at DB level via migration 0018 (self-ref causes circular TS inference in Drizzle)
  referralTokensEarned: integer("referral_tokens_earned").notNull().default(0),
  tournamentPickTeamId: uuid("tournament_pick_team_id").references(() => teams.id, { onDelete: "set null" }),
  notificationsOnboarded: boolean("notifications_onboarded").notNull().default(false),
  pushEnabled: boolean("push_enabled").notNull().default(false),
  emailEnabled: boolean("email_enabled").notNull().default(false),

  deletedAt: timestamp("deleted_at"),
  lastFloorReplenishedAt: timestamp("last_floor_replenished_at"),
  lastWeeklyRefillAt: timestamp("last_weekly_refill_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("token_balance_check", sql`${t.tokenBalance} >= 0`),
  check("escrow_tokens_check", sql`${t.escrowTokens} >= 0`),
  index("students_flagged_idx").on(t.flagged),
  index("students_team_id_idx").on(t.teamId),
  index("students_token_balance_idx").on(t.tokenBalance),
  index("students_flagged_visibility_idx").on(t.flagged, t.visibility),
]);

// ─── Connections ──────────────────────────────────────────────────────────────

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    requesteeId: uuid("requestee_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: connectionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.requesterId, t.requesteeId),
    index("connections_requester_idx").on(t.requesterId),
    index("connections_requestee_idx").on(t.requesteeId),
  ]
);

// ─── Friend Groups ────────────────────────────────────────────────────────────

export const friendGroups = pgTable("friend_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  inviteCode: varchar("invite_code", { length: 8 }).notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => friendGroups.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    tokenBalance: integer("token_balance").notNull().default(1000),
    escrowTokens: integer("escrow_tokens").notNull().default(0),
    totalTokensReceived: integer("total_tokens_received").notNull().default(1000),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.groupId, t.studentId),
    index("group_members_student_idx").on(t.studentId),
    check("group_token_balance_check", sql`${t.tokenBalance} >= 0`),
    check("group_escrow_tokens_check", sql`${t.escrowTokens} >= 0`),
  ]
);

// ─── Venues ───────────────────────────────────────────────────────────────────

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  area: varchar("area", { length: 100 }),
  address: varchar("address", { length: 300 }),
  mapsUrl: varchar("maps_url", { length: 500 }),
  lat: decimal("lat", { precision: 9, scale: 6 }),
  lng: decimal("lng", { precision: 9, scale: 6 }),
  isCustom: boolean("is_custom").notNull().default(false),
  addedBy: uuid("added_by").references(() => students.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("venues_added_by_idx").on(t.addedBy),
]);

// ─── Matches ──────────────────────────────────────────────────────────────────

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: integer("external_id").unique(),
  team1Id: uuid("team1_id").references(() => teams.id, { onDelete: "set null" }),
  team2Id: uuid("team2_id").references(() => teams.id, { onDelete: "set null" }),
  matchDatetime: timestamp("match_datetime", { withTimezone: true }).notNull(),
  venue: varchar("venue", { length: 150 }),
  city: varchar("city", { length: 100 }),
  stage: matchStageEnum("stage").notNull().default("group"),
  groupName: varchar("group_name", { length: 1 }),
  team1Score: integer("team1_score"),
  team2Score: integer("team2_score"),
  team1Penalties: integer("team1_penalties"),
  team2Penalties: integer("team2_penalties"),
  status: matchStatusEnum("status").notNull().default("upcoming"),
  team1Placeholder: varchar("team1_placeholder", { length: 60 }),
  team2Placeholder: varchar("team2_placeholder", { length: 60 }),
  team1Odds: real("team1_odds"),
  team2Odds: real("team2_odds"),
  drawOdds: real("draw_odds"),
  startNotificationSent: boolean("start_notification_sent").notNull().default(false),
  watchReminderSent: boolean("watch_reminder_sent").notNull().default(false),
}, (t) => [
  index("matches_match_datetime_idx").on(t.matchDatetime),
  index("matches_status_idx").on(t.status),
]);

// ─── Predictions ──────────────────────────────────────────────────────────────

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    predictedScore1: integer("predicted_score1").notNull(),
    predictedScore2: integer("predicted_score2").notNull(),
    stakeTokens: integer("stake_tokens").notNull().default(0),
    tokensEarned: integer("tokens_earned"),
    settled: boolean("settled").notNull().default(false),
    isEarly: boolean("is_early").notNull().default(false),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.studentId, t.matchId),
    index("predictions_match_idx").on(t.matchId),
    index("predictions_student_idx").on(t.studentId),
  ]
);

// ─── Token Bets ───────────────────────────────────────────────────────────────

export const bets = pgTable(
  "bets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    student1Id: uuid("student1_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    student2Id: uuid("student2_id").references(() => students.id, { onDelete: "cascade" }),
    isOpenMarket: boolean("is_open_market").notNull().default(false),
    groupId: uuid("group_id").references(() => friendGroups.id, { onDelete: "cascade" }),
    status: betStatusEnum("status").notNull().default("pending"),
    challengerTeamSide: integer("challenger_team_side"),
    stakeTokens: integer("stake_tokens").notNull().default(10),
    winnerId: uuid("winner_id").references(() => students.id),
    settled: boolean("settled").notNull().default(false),
    student1Score1: integer("student1_score1"),
    student1Score2: integer("student1_score2"),
    student2Score1: integer("student2_score1"),
    student2Score2: integer("student2_score2"),
  },
  (t) => [
    unique().on(t.matchId, t.student1Id, t.student2Id),
    index("bets_match_idx").on(t.matchId),
    index("bets_student1_idx").on(t.student1Id),
    index("bets_student2_idx").on(t.student2Id),
    index("bets_status_idx").on(t.status),
    index("bets_settled_idx").on(t.settled),
    index("bets_open_market_idx").on(t.isOpenMarket),
    index("bets_settled_status_idx").on(t.settled, t.status),
  ]
);

// ─── Match Reactions ──────────────────────────────────────────────────────────

export const matchReactions = pgTable(
  "match_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    matchMinute: integer("match_minute"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("match_reactions_match_idx").on(t.matchId, t.createdAt)]
);

// ─── Post-Match Vibes ─────────────────────────────────────────────────────────

export const matchVibes = pgTable(
  "match_vibes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    vibe: varchar("vibe", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.studentId, t.matchId)]
);

// ─── Watch Invites ────────────────────────────────────────────────────────────

export const watchInvites = pgTable(
  "watch_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    locationName: varchar("location_name", { length: 200 }),
    locationUrl: varchar("location_url", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.inviterId, t.matchId)]
);

export const watchRsvps = pgTable(
  "watch_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => watchInvites.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.inviteId, t.studentId)]
);

// ─── Live Reports ─────────────────────────────────────────────────────────────

export const liveReports = pgTable("live_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  venueId: uuid("venue_id")
    .references(() => venues.id, { onDelete: "set null" }),
  venueName: varchar("venue_name", { length: 200 }),
  matchId: uuid("match_id")
    .references(() => matches.id, { onDelete: "set null" }),
  status: liveReportStatusEnum("status").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("live_reports_student_idx").on(t.studentId),
  index("live_reports_venue_idx").on(t.venueId),
  index("live_reports_match_idx").on(t.matchId),
]);

// ─── Survey Responses ─────────────────────────────────────────────────────────

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    questionKey: varchar("question_key", { length: 50 }).notNull(),
    responseText: text("response_text").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    tokensAwarded: integer("tokens_awarded").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.studentId, t.questionKey),
  ]
);

// ─── Token Ledger ─────────────────────────────────────────────────────────────

export const tokenLedger = pgTable("token_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("token_ledger_student_idx").on(t.studentId),
]);

// ─── Prediction History ───────────────────────────────────────────────────────

export const predictionHistory = pgTable("prediction_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  predictionId: uuid("prediction_id").references(() => predictions.id, { onDelete: "set null" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
  matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
  oldScore1: integer("old_score1"),
  oldScore2: integer("old_score2"),
  newScore1: integer("new_score1").notNull(),
  newScore2: integer("new_score2").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type Team = typeof teams.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Bet = typeof bets.$inferSelect;
export type MatchReaction = typeof matchReactions.$inferSelect;
export type MatchVibe = typeof matchVibes.$inferSelect;
export type WatchInvite = typeof watchInvites.$inferSelect;
export type FriendGroup = typeof friendGroups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type LiveReport = typeof liveReports.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type TokenLedgerEntry = typeof tokenLedger.$inferSelect;
export type PredictionHistoryEntry = typeof predictionHistory.$inferSelect;
export type LiveReportStatus = (typeof liveReportStatusEnum.enumValues)[number];

export type MatchStatus = (typeof matchStatusEnum.enumValues)[number];
export type MatchStage = (typeof matchStageEnum.enumValues)[number];
export type Visibility = (typeof visibilityEnum.enumValues)[number];
