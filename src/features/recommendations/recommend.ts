import {
  applyCandidateGrades,
  candidateScore,
  deterministicGrade,
  PRE_SHORTLIST_SIZE,
} from "./quality";
import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
  RecommendationBatch,
} from "./types";
import { getDemoMovie } from "@/lib/demo/movies";
import { rerankMovieCandidates } from "@/lib/openai/rerank-movie-candidates";
import { enrichMovieCandidates } from "@/lib/tmdb/client";

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

async function rankShortlist(
  candidates: MovieRecommendation[],
  intent: MovieIntent,
  demoMode: boolean,
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
  try {
    grades = await rerankMovieCandidates(intent, candidates);
  } catch (error) {
    console.warn(
      "Semantic candidate ranking failed; using deterministic ranking.",
      error instanceof Error ? error.message : "Unknown ranking error",
    );
    grades = candidates.map((candidate) =>
      deterministicGrade(candidate, intent),
    );
  }

  return applyCandidateGrades(candidates, intent, grades);
}

export async function buildRecommendationBatch({
  pool,
  intent,
  referenceExclusionIds,
  demoMode,
}: {
  pool: Array<MovieCandidate | number>;
  intent: MovieIntent;
  referenceExclusionIds: number[];
  demoMode: boolean;
}): Promise<RecommendationBatch> {
  const shortlist = pool.slice(0, PRE_SHORTLIST_SIZE);
  const enriched = (await enrichShortlist(shortlist, intent, demoMode)).map(
    (candidate) => ({
      ...candidate,
      score: candidate.score || candidateScore(candidate, intent),
    }),
  );
  const recommendations = await rankShortlist(enriched, intent, demoMode);
  const selectedIds = new Set(recommendations.map((movie) => movie.id));
  const unassessedCandidates = pool.slice(shortlist.length);
  const assessedButUnselected = shortlist.filter((candidate) => {
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
