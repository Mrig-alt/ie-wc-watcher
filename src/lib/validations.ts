import { z } from "zod";

const safeUrl = z
  .string()
  .url("Must be a valid URL")
  .max(500)
  .refine(
    (u) => {
      const lower = u.toLowerCase().trim();
      return !lower.startsWith("javascript:") && !lower.startsWith("data:") && !lower.startsWith("vbscript:");
    },
    { message: "URL scheme not allowed" }
  );

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  nationality: z.preprocess(
    (v) => (typeof v === "string" && v.trim().length < 2 ? undefined : v),
    z.string().max(100).optional()
  ),
  teamId: z.string().uuid("Invalid team").optional().nullable(),
  isHonoraryFan: z.boolean().optional().nullable(),
  visibility: z.enum(["public", "friends", "stealth"]).default("public"),
  leaderboardVisibility: z.boolean().default(true),
  // PIN is now optional — if JOIN_PIN env var is not set, any value (or none) is accepted
  pin: z.string().optional(),
  isGuest: z.boolean().optional(),
  groupPin: z.string().length(8, "Group PIN must be exactly 8 characters").optional().or(z.literal("")),
  ref: z.string().uuid().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  // PIN optional for same reason
  pin: z.string().optional(),
});

export const updateStudentSchema = z.object({
  teamId: z.string().uuid().optional().nullable(),
  isHonoraryFan: z.boolean().optional(),
  visibility: z.enum(["public", "friends", "stealth"]).optional(),
  pin: z.string().optional(),
  ref: z.string().uuid().optional().or(z.literal("")),
});

export const predictionSchema = z.object({
  matchId: z.string().uuid(),
  predictedScore1: z.number().int().min(0).max(20),
  predictedScore2: z.number().int().min(0).max(20),
  stakeTokens: z.number().int().min(2),
});

export const reactionSchema = z.object({
  matchId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
  matchMinute: z.number().int().min(1).max(120).optional(),
});

export const vibeSchema = z.object({
  matchId: z.string().uuid(),
  vibe: z.enum(["intense", "boring", "heartbreaking"]),
});

export const watchTogetherSchema = z.object({
  matchId: z.string().uuid(),
  venueId: z.string().uuid().optional().nullable(),
  locationName: z.string().min(1).max(200),
  locationUrl: safeUrl.optional().nullable().or(z.literal("")),
});

export const connectionSchema = z.object({
  requesteeId: z.string().uuid(),
});
