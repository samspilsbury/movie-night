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

const SYSTEM_PROMPT = `You translate a viewer's natural-language movie request into precise, auditable search intent.

Rules:
- Extract preferences only; do not recommend any titles.
- Put every movie used as a comparison, example, positive reference, or negative reference in referenceMovies so it can be excluded.
- Separate hard genre constraints from preferences. A directly requested genre ("a comedy") belongs in requiredGenres; a genre merely inferred from a mood, style, or reference belongs in preferredGenres.
- Express every meaningful non-genre request in preferences. Preserve the user's actual meaning: mood, tone, theme, setting, cast, pace, or style. Mark directly stated, central requirements primary and explicit; mark helpful implications secondary and inferred.
- For a positive reference movie, add two to five broadly recognised similarityTraits that explain what the user is likely asking to carry over. Do not infer cast, director, franchise, or character names unless the user explicitly requests them.
- Turn abstract intent into two to eight concrete, TMDB-searchable keyword concepts when they materially improve retrieval. Do not add unrelated concepts merely to fill the array.
- Use only the allowed genre enum values.
- Use a two-letter ISO 639-1 original-language code only when the viewer explicitly asks for a language.
- Do not infer a year, runtime, or language constraint unless the viewer expresses it.
- "set in" describes story setting, not production country or original language.
- "all-star cast" or "ensemble cast" is a primary cast preference; do not reduce it to a genre.
- "sexy" is a primary tone preference. Add relevant concepts such as sensuality or eroticism, without treating any adult-rated drama as a match.
- "chick flick" is a style request normally associated with female-centred relationships, romance, friendship, or comedy; it is not satisfied by an unrelated action film with incidental UK locations.
- For "comedy like Anchorman with an all-star cast", require comedy and preserve absurdist ensemble comedy plus star-studded cast as primary preferences. A dark film merely tagged comedy is not a match.
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
