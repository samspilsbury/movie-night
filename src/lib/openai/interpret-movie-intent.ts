import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { movieIntentSchema } from "@/features/recommendations/schemas";
import type { MovieIntent } from "@/features/recommendations/types";
import { getServerEnv } from "@/lib/env";
import { ProviderError } from "@/lib/provider-error";

const SYSTEM_PROMPT = `You translate a viewer's natural-language movie request into search intent.

Rules:
- Extract preferences only; do not recommend any titles.
- Put every movie used as a comparison, example, positive reference, or negative reference in referenceMovies so it can be excluded.
- For a positive reference movie, infer a small number of its broadly recognised genre, mood, and story traits into the other fields. Do not copy cast, director, franchise, or character names into keywordTerms.
- Turn abstract moods into one to three concrete, TMDB-searchable story or theme concepts in keywordTerms when doing so would materially narrow the search. Do not add unrelated concepts merely to fill the array.
- Use only the allowed genre enum values.
- Moods are short lowercase descriptions such as tense, comforting, cerebral, funny, or visually spectacular.
- Keyword terms should be concise TMDB-searchable concepts such as time travel, heist, courtroom, or found family.
- Use a two-letter ISO 639-1 original-language code only when the viewer explicitly asks for a language.
- Do not infer a year, runtime, or language constraint unless the viewer expresses it.
- Return empty arrays and nulls for unspecified criteria.`;

function mapOpenAIError(error: unknown): never {
  if (error instanceof APIConnectionTimeoutError) {
    throw new ProviderError(
      "openai",
      "timeout",
      504,
      "The recommendation service took too long to respond. Try again.",
      { cause: error },
    );
  }

  if (error instanceof APIConnectionError) {
    throw new ProviderError(
      "openai",
      "connection",
      503,
      "The recommendation service is temporarily unreachable. Try again.",
      { cause: error },
    );
  }

  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) {
      throw new ProviderError(
        "openai",
        "authentication",
        503,
        "The recommendation service is not configured correctly.",
        { cause: error },
      );
    }

    if (error.status === 429 && error.code === "insufficient_quota") {
      throw new ProviderError(
        "openai",
        "quota",
        503,
        "The recommendation service is temporarily unavailable. Try again later.",
        { cause: error },
      );
    }

    if (error.status === 429) {
      throw new ProviderError(
        "openai",
        "rate_limit",
        503,
        "The recommendation service is busy. Wait a moment and try again.",
        { cause: error },
      );
    }

    throw new ProviderError(
      "openai",
      error.status === 400 ? "invalid_request" : "unavailable",
      error.status === 400 ? 502 : 503,
      "The recommendation service could not interpret that brief. Try rewording it.",
      { cause: error },
    );
  }

  throw error;
}

export async function interpretMovieIntent(
  prompt: string,
): Promise<MovieIntent> {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    maxRetries: 2,
    timeout: 20_000,
  });

  let response;
  try {
    response = await client.responses.parse({
      model: env.OPENAI_MODEL,
      store: false,
      max_output_tokens: 1_000,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      text: {
        format: zodTextFormat(movieIntentSchema, "movie_intent"),
      },
    });
  } catch (error) {
    mapOpenAIError(error);
  }

  if (!response.output_parsed) {
    throw new Error("The movie brief could not be interpreted.");
  }

  return movieIntentSchema.parse(response.output_parsed);
}
