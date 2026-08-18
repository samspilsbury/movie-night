import {
  applyCandidateGrades,
  applyCandidateGradesWithFallback,
  candidateScore,
  deterministicGrade,
  PRE_SHORTLIST_SIZE,
  PROGRAMME_FILL_LIMIT,
  RECOMMENDATION_COUNT,
} from "./quality";
import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
  RecommendationBatch,
} from "./types";
import { getDemoMovie } from "@/lib/demo/movies";
import {
  rerankMovieCandidates,
  SEMANTIC_RERANK_TIMEOUT_MS,
} from "@/lib/openai/rerank-movie-candidates";
import { enrichMovieCandidates } from "@/lib/tmdb/client";

type StageDetails = Record<string, boolean | number | string>;
type StageLogger = (stage: string, details?: StageDetails) => void;

const RERANK_DEADLINE_BUFFER_MS = 500;

async function enrichShortlist(
  shortlist: Array<MovieCandidate | number>,
  intent: MovieIntent,
  demoMode: boolean,
): Promise<MovieRecommendation[]> {
  if (!demoMode) return enrichMovieCandidates(shortlist);

  return shortlist.flatMap((candidate) => {
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

async function rankShortlist(
  candidates: MovieRecommendation[],
  intent: MovieIntent,
  demoMode: boolean,
  deadlineAt: number,
  onStage?: StageLogger,
): Promise<MovieRecommendation[]> {
  if (demoMode) {
    return candidates.slice(0, 5).map((candidate) => ({
      ...candidate,
      relevanceScore: 75,
      matchedCriteria: intent.preferences.map((preference) => preference.value),
      matchReason: candidate.matchReason,
    }));
  }

  let grades;
  let strategy = "deterministic_budget";
  const hasRerankBudget =
    deadlineAt - Date.now() >=
    SEMANTIC_RERANK_TIMEOUT_MS + RERANK_DEADLINE_BUFFER_MS;

  if (hasRerankBudget) {
    try {
      grades = await rerankMovieCandidates(intent, candidates);
      strategy = "semantic";
    } catch (error) {
      console.warn(
        "Semantic candidate ranking failed; using deterministic ranking.",
        error instanceof Error ? error.message : "Unknown ranking error",
      );
      strategy = "deterministic_provider_fallback";
    }
  }

  if (!grades) {
    grades = candidates.map((candidate) =>
      deterministicGrade(candidate, intent),
    );
  }

  const ranked = applyCandidateGradesWithFallback(candidates, intent, grades);
  if (ranked.usedFallback && strategy === "semantic") {
    strategy = "deterministic_empty_fallback";
  }

  onStage?.("ranking_complete", {
    candidates: candidates.length,
    strategy,
  });
  return ranked.recommendations;
}

export async function buildRecommendationBatch({
  pool,
  intent,
  referenceExclusionIds,
  demoMode,
  deadlineAt,
  onStage,
}: {
  pool: Array<MovieCandidate | number>;
  intent: MovieIntent;
  referenceExclusionIds: number[];
  demoMode: boolean;
  deadlineAt?: number;
  onStage?: StageLogger;
}): Promise<RecommendationBatch> {
  const shortlist = pool.slice(0, PRE_SHORTLIST_SIZE);
  const enriched = scoreEnrichedCandidates(
    await enrichShortlist(shortlist, intent, demoMode),
    intent,
  );
  onStage?.("enrichment_complete", {
    received: enriched.length,
    requested: shortlist.length,
  });
  let recommendations = await rankShortlist(
    enriched,
    intent,
    demoMode,
    deadlineAt ?? Number.POSITIVE_INFINITY,
    onStage,
  );
  let assessedCandidates = shortlist;

  for (
    let start = shortlist.length;
    recommendations.length < RECOMMENDATION_COUNT &&
    start < Math.min(pool.length, PROGRAMME_FILL_LIMIT);
    start += PRE_SHORTLIST_SIZE
  ) {
    const fillCandidates = pool.slice(
      start,
      Math.min(start + PRE_SHORTLIST_SIZE, PROGRAMME_FILL_LIMIT),
    );
    const fillEnriched = scoreEnrichedCandidates(
      await enrichShortlist(fillCandidates, intent, demoMode),
      intent,
    );
    const fillRecommendations = applyCandidateGrades(
      fillEnriched,
      intent,
      fillEnriched.map((candidate) => deterministicGrade(candidate, intent)),
    );
    const selectedIds = new Set(
      recommendations.map((recommendation) => recommendation.id),
    );
    recommendations = [
      ...recommendations,
      ...fillRecommendations.filter(
        (recommendation) => !selectedIds.has(recommendation.id),
      ),
    ]
      .sort((left, right) => right.score - left.score)
      .slice(0, RECOMMENDATION_COUNT);
    assessedCandidates = [...assessedCandidates, ...fillCandidates];
    onStage?.("programme_fill_complete", {
      assessed: assessedCandidates.length,
      recommendations: recommendations.length,
    });
  }

  const selectedIds = new Set(recommendations.map((movie) => movie.id));
  const unassessedCandidates = pool.slice(assessedCandidates.length);
  const assessedButUnselected = assessedCandidates.filter((candidate) => {
    const id = typeof candidate === "number" ? candidate : candidate.id;
    return !selectedIds.has(id);
  });
  const remainingCandidateIds = [
    ...unassessedCandidates,
    ...assessedButUnselected,
  ]
    .map((candidate) =>
      typeof candidate === "number" ? candidate : candidate.id,
    )
    .filter(
      (id, index, ids) => !selectedIds.has(id) && ids.indexOf(id) === index,
    );

  return {
    recommendations,
    remainingCandidateIds,
    intent,
    referenceExclusionIds,
    demoMode,
  };
}
