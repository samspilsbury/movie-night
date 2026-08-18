import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { movieDetailRequestSchema } from "@/features/recommendations/schemas";
import { getDemoMovie } from "@/lib/demo/movies";
import { getServerEnv } from "@/lib/env";
import { logProviderError, ProviderError } from "@/lib/provider-error";
import { getMovieRecommendation } from "@/lib/tmdb/client";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Movie ID is invalid." },
        { status: 400 },
      );
    }

    const input = movieDetailRequestSchema.parse(await request.json());
    const env = getServerEnv();
    const movie = env.demoMode
      ? getDemoMovie(id, input.intent)
      : await getMovieRecommendation(id, input.intent);

    if (!movie) {
      return NextResponse.json(
        { error: "That film is no longer on tonight's programme." },
        { status: 404 },
      );
    }

    return NextResponse.json({ movie, demoMode: env.demoMode });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "The saved movie brief is invalid." },
        { status: 400 },
      );
    }

    if (error instanceof ProviderError) {
      logProviderError("Movie detail request failed", error);
      return NextResponse.json(
        { error: error.publicMessage, code: `${error.provider}_${error.code}` },
        { status: error.responseStatus },
      );
    }

    console.error("Movie detail request failed", error);
    return NextResponse.json(
      { error: "We couldn't load this film. Try the next one." },
      { status: 502 },
    );
  }
}
