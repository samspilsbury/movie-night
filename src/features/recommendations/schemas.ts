import { z } from "zod";

import { GENRE_NAMES, PREFERENCE_CATEGORIES } from "./types";

const currentYear = new Date().getUTCFullYear() + 5;

export const referenceMovieSchema = z.object({
  title: z.string().trim().min(1).max(120),
  year: z.number().int().min(1880).max(currentYear).nullable(),
  similarityTraits: z.array(z.string().trim().min(1).max(50)).max(5),
});

export const intentPreferenceSchema = z.object({
  category: z.enum(PREFERENCE_CATEGORIES),
  value: z.string().trim().min(1).max(60),
  priority: z.enum(["primary", "secondary"]),
  source: z.enum(["explicit", "inferred"]),
});

export const movieIntentSchema = z.object({
  requiredGenres: z.array(z.enum(GENRE_NAMES)).max(4),
  preferredGenres: z.array(z.enum(GENRE_NAMES)).max(6),
  excludedGenres: z.array(z.enum(GENRE_NAMES)).max(6),
  preferences: z.array(intentPreferenceSchema).max(12),
  keywordTerms: z.array(z.string().trim().min(1).max(50)).max(8),
  referenceMovies: z.array(referenceMovieSchema).max(5),
  minimumYear: z.number().int().min(1880).max(currentYear).nullable(),
  maximumYear: z.number().int().min(1880).max(currentYear).nullable(),
  maximumRuntimeMinutes: z.number().int().min(30).max(360).nullable(),
  originalLanguage: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/)
    .nullable(),
});

export const recommendationRequestSchema = z
  .object({
    prompt: z.string().trim().min(3).max(500).nullable().default(null),
    intent: movieIntentSchema.nullable().default(null),
    excludedMovieIds: z.array(z.number().int().positive()).max(250).default([]),
    candidateIds: z.array(z.number().int().positive()).max(60).default([]),
  })
  .refine(
    (request) =>
      request.prompt !== null ||
      (request.intent !== null && request.candidateIds.length > 0),
    {
      message:
        "A prompt or a validated intent with unused candidate IDs is required.",
    },
  );

export const movieDetailRequestSchema = z.object({
  intent: movieIntentSchema,
});
