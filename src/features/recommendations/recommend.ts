import {
  candidateScore,
  deterministicGrade,
  rankAllCandidates,
  RANKED_POOL_SIZE,
  RECOMMENDATION_COUNT,
} from "./quality";
import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
  RecommendationBatch,
} from "./types";
import { getDemoMovie } from "@/lib/demo/movies";
import { enrichMovieCandidates } from "@/lib/tmdb/client";

type StageDetails = Record<string, boolean | number | string>;
type StageLogger = (stage: string, details?: StageDetails) => void;

async function enrichPool(
  pool: Array<MovieCandidate | number>,
  intent: MovieIntent,
  demoMode: boolean,
): Promise<MovieRecommendation[]> {
  if (!demoMode) return enrichMovieCandidates(pool);

  return pool.flatMap((candidate) => {
    const id = typeof candidate === "number" ? candidate : candidate.id;
    const movie = getDemoMovie(id, intent);
    return movie ? [movie] : [];
  });
}

function scoreEnrichedCandidates(
  candidates: MovieRecommendation[],
  intent: MovieIntent,
): MovieRecommendation[] {
  return candidates.map((candidate) => ({
    ...candidate,
    score: candidate.score || candidateScore(candidate, intent),
  }));
}

export async function buildRecommendationBatch({
  pool,
  intent,
  referenceExclusionIds,
  demoMode,
  onStage,
}: {
  pool: Array<MovieCandidate | number>;
  intent: MovieIntent;
  referenceExclusionIds: number[];
  demoMode: boolean;
  deadlineAt?: number;
  onStage?: StageLogger;
}): Promise<RecommendationBatch> {
  const enriched = scoreEnrichedCandidates(
    await enrichPool(pool, intent, demoMode),
    intent,
  );
  onStage?.("enrichment_complete", {
    received: enriched.length,
    requested: pool.length,
  });

  const ranked = rankAllCandidates(
    enriched,
    intent,
    enriched.map((candidate) => deterministicGrade(candidate, intent)),
  ).slice(0, RANKED_POOL_SIZE);
  onStage?.("ranking_complete", {
    candidates: ranked.length,
    strategy: "deterministic_global",
  });

  const recommendations = ranked.slice(0, RECOMMENDATION_COUNT);
  const remainingRecommendations = ranked.slice(RECOMMENDATION_COUNT);

  return {
    recommendations,
    remainingRecommendations,
    remainingCandidateIds: remainingRecommendations.map((movie) => movie.id),
    intent,
    referenceExclusionIds,
    demoMode,
  };
}
