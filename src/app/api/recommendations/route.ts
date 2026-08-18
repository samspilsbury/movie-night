import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { buildRecommendationBatch } from "@/features/recommendations/recommend";
import { recommendationRequestSchema } from "@/features/recommendations/schemas";
import { getDemoCandidates, demoIntent } from "@/lib/demo/movies";
import { getServerEnv } from "@/lib/env";
import { interpretMovieIntent } from "@/lib/openai/interpret-movie-intent";
import { logProviderError, ProviderError } from "@/lib/provider-error";
import {
  discoverCandidatePool,
  resolveReferenceExclusions,
} from "@/lib/tmdb/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const RECOMMENDATION_BUDGET_MS = 25_000;

function errorKind(error: unknown): string {
  if (error instanceof ProviderError) return `${error.provider}_${error.code}`;
  if (error instanceof ZodError) return "validation";
  return error instanceof Error ? error.name : "unknown";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let previousStageAt = startedAt;
  const deadlineAt = startedAt + RECOMMENDATION_BUDGET_MS;
  const logStage = (
    stage: string,
    details: Record<string, boolean | number | string> = {},
  ) => {
    const now = Date.now();
    console.info("Recommendation pipeline stage", {
      requestId,
      stage,
      stageDurationMs: now - previousStageAt,
      totalDurationMs: now - startedAt,
      ...details,
    });
    previousStageAt = now;
  };

  try {
    const body: unknown = await request.json();
    const input = recommendationRequestSchema.parse(body);
    const env = getServerEnv();
    const intent =
      input.intent ??
      (env.demoMode
        ? demoIntent(input.prompt ?? "")
        : await interpretMovieIntent(input.prompt ?? ""));
    logStage("intent_complete", {
      source: input.intent ? "continuation" : env.demoMode ? "demo" : "model",
    });

    const continuing = input.intent !== null && input.candidateIds.length > 0;
    const referenceExclusionIds =
      continuing || env.demoMode
        ? []
        : await resolveReferenceExclusions(intent);
    logStage("reference_exclusions_complete", {
      count: referenceExclusionIds.length,
    });
    const allExcludedIds = [
      ...new Set([...input.excludedMovieIds, ...referenceExclusionIds]),
    ];

    const pool = continuing
      ? input.candidateIds.filter((id) => !allExcludedIds.includes(id))
      : env.demoMode
        ? getDemoCandidates(intent, allExcludedIds)
        : await discoverCandidatePool(intent, allExcludedIds);
    logStage("candidate_pool_complete", {
      candidates: pool.length,
      continuing,
    });
    const response = await buildRecommendationBatch({
      pool,
      intent,
      referenceExclusionIds,
      demoMode: env.demoMode,
      deadlineAt,
      onStage: logStage,
    });
    logStage("request_complete", {
      recommendations: response.recommendations.length,
      remainingCandidates: response.remainingCandidateIds.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    logStage("request_failed", { error: errorKind(error) });
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "That movie brief could not be understood.",
          details: error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    if (error instanceof ProviderError) {
      logProviderError("Recommendation request failed", error);
      return NextResponse.json(
        { error: error.publicMessage, code: `${error.provider}_${error.code}` },
        { status: error.responseStatus },
      );
    }

    console.error("Recommendation request failed", error);
    return NextResponse.json(
      {
        error:
          "We couldn't reach the programme. Check the connection and try again.",
      },
      { status: 502 },
    );
  }
}
