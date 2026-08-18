import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { CandidateGrade } from "@/features/recommendations/quality";
import type {
  MovieIntent,
  MovieRecommendation,
} from "@/features/recommendations/types";
import { getServerEnv } from "@/lib/env";

const candidateGradeSchema = z.object({
  id: z.number().int().positive(),
  relevanceScore: z.number().int().min(0).max(100),
  matchedCriteria: z.array(z.string().trim().min(1).max(80)).max(6),
  missingPrimaryCriteria: z.array(z.string().trim().min(1).max(80)).max(6),
  contradictions: z.array(z.string().trim().min(1).max(100)).max(4),
  matchReason: z.string().trim().min(1).max(220),
});

const candidateRankingSchema = z.object({
  grades: z.array(candidateGradeSchema).max(12),
});

const SYSTEM_PROMPT = `Rank only the supplied TMDB movie candidates against the supplied validated viewer intent.

Rules:
- Judge semantic relevance before popularity, rating, prestige, or general quality.
- Treat required genres, excluded genres, year, runtime, and language as hard constraints. Put any conflict in contradictions and score it 0.
- Primary preferences must have concrete evidence in the supplied overview, genres, keywords, setting/country, or cast metadata. Incidental genre overlap is not enough.
- Do not assume that a production country proves the story is set there; require overview or keyword evidence for setting.
- Do not assume that an adult certification, romance genre, or dramatic relationship makes a film "sexy"; require sensual, erotic, seductive, or closely related evidence.
- "Chick flick" means a female-centred relationship, friendship, romance, or comedy style. It is not satisfied by an unrelated action film.
- A request like Anchorman calls for broad, absurdist ensemble comedy. A dark satire or thriller with a comedy tag is not a close match.
- An all-star or ensemble cast preference requires evidence from the supplied cast size and cast popularity signal.
- Use only supplied candidate IDs and facts. Never invent a film or fact.
- Give each candidate an independent 0-100 relevance score. Missing a primary preference should normally keep the score below 55.
- matchReason must be one concise, viewer-facing sentence grounded in matchedCriteria. Do not mention scoring, filtering, APIs, or missing criteria.`;

function candidateEvidence(candidate: MovieRecommendation) {
  return {
    id: candidate.id,
    title: candidate.title,
    year: candidate.releaseDate?.slice(0, 4) ?? null,
    overview: candidate.overview,
    genres: candidate.genres,
    runtimeMinutes: candidate.runtimeMinutes,
    originalLanguage: candidate.originalLanguage,
    keywords: candidate.keywordNames,
    productionCountries: candidate.productionCountries,
    cast: candidate.cast,
    castPopularity: candidate.castPopularity,
    voteAverage: candidate.voteAverage,
    voteCount: candidate.voteCount,
  };
}

export async function rerankMovieCandidates(
  intent: MovieIntent,
  candidates: MovieRecommendation[],
): Promise<CandidateGrade[]> {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    maxRetries: 1,
    timeout: 20_000,
  });
  const response = await client.responses.parse({
    model: env.OPENAI_MODEL,
    store: false,
    max_output_tokens: 2_000,
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          intent,
          candidates: candidates.map(candidateEvidence),
        }),
      },
    ],
    text: {
      format: zodTextFormat(candidateRankingSchema, "candidate_ranking"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Candidate ranking was not returned.");
  }

  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  return response.output_parsed.grades.filter((grade) =>
    candidateIds.has(grade.id),
  );
}
