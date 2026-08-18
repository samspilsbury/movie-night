import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { QUALITY_STAGES } from "@/features/recommendations/quality";
import { recommendationRequestSchema } from "@/features/recommendations/schemas";
import type { RecommendationBatch } from "@/features/recommendations/types";
import { getDemoCandidates, demoIntent } from "@/lib/demo/movies";
import { getServerEnv } from "@/lib/env";
import { interpretMovieIntent } from "@/lib/openai/interpret-movie-intent";
import { logProviderError, ProviderError } from "@/lib/provider-error";
import { discoverMovies, resolveReferenceExclusions } from "@/lib/tmdb/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = recommendationRequestSchema.parse(body);
    const env = getServerEnv();
    const intent =
      input.intent ??
      (env.demoMode
        ? demoIntent(input.prompt ?? "")
        : await interpretMovieIntent(input.prompt ?? ""));

    const referenceExclusionIds =
      input.intent !== null
        ? []
        : env.demoMode
          ? []
          : await resolveReferenceExclusions(intent);
    const allExcludedIds = [
      ...new Set([...input.excludedMovieIds, ...referenceExclusionIds]),
    ];

    const candidates = env.demoMode
      ? getDemoCandidates(intent, input.qualityStage, allExcludedIds)
      : await discoverMovies(intent, input.qualityStage, allExcludedIds);
    const quality = QUALITY_STAGES[input.qualityStage] ?? QUALITY_STAGES[0];

    const response: RecommendationBatch = {
      candidates,
      intent,
      referenceExclusionIds,
      qualityStage: input.qualityStage,
      qualityLabel: quality.label,
      demoMode: env.demoMode,
    };

    return NextResponse.json(response);
  } catch (error) {
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
