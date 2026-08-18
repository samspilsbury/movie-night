import { z } from "zod";

import { GENRE_NAMES } from "./types";

const currentYear = new Date().getUTCFullYear() + 5;

export const referenceMovieSchema = z.object({
  title: z.string().trim().min(1).max(120),
  year: z.number().int().min(1880).max(currentYear).nullable(),
});

export const movieIntentSchema = z.object({
  includedGenres: z.array(z.enum(GENRE_NAMES)).max(6),
  excludedGenres: z.array(z.enum(GENRE_NAMES)).max(6),
  moods: z.array(z.string().trim().min(1).max(40)).max(6),
  keywordTerms: z.array(z.string().trim().min(1).max(50)).max(6),
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
    qualityStage: z.number().int().min(0).max(3).default(0),
  })
  .refine((request) => request.prompt !== null || request.intent !== null, {
    message: "A prompt or previously validated intent is required.",
  });

export const movieDetailRequestSchema = z.object({
  intent: movieIntentSchema,
});
