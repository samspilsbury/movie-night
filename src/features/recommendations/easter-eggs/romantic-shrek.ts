import type { RecommendationBatch } from "../types";

/**
 * Temporary filming easter egg. Set this to false to restore the normal
 * recommendation pipeline and ten-count without changing any other file.
 */
export const ROMANTIC_SHREK_EASTER_EGG_ENABLED = true;

export const ROMANTIC_SHREK_PROMPT = "something romantic";
export const ROMANTIC_SHREK_COUNTDOWN_SECONDS = 3;

export function isRomanticShrekPrompt(prompt: string | null): boolean {
  return (
    ROMANTIC_SHREK_EASTER_EGG_ENABLED &&
    prompt?.trim() === ROMANTIC_SHREK_PROMPT
  );
}

export function getRomanticShrekBatch(
  prompt: string | null,
): RecommendationBatch | null {
  if (!isRomanticShrekPrompt(prompt)) return null;

  const intent: RecommendationBatch["intent"] = {
    requiredGenres: [],
    preferredGenres: ["romance"],
    excludedGenres: [],
    preferences: [
      {
        category: "mood",
        value: "romantic",
        priority: "primary",
        source: "explicit",
      },
    ],
    keywordTerms: [],
    castMembers: [],
    referenceCastMembers: [],
    productionOriginCountries: [],
    referenceMovies: [],
    minimumYear: null,
    maximumYear: null,
    maximumRuntimeMinutes: null,
    originalLanguage: null,
  };

  return {
    recommendations: [
      {
        id: 808,
        title: "Shrek",
        originalTitle: "Shrek",
        overview:
          "It ain't easy bein' green—especially for a lovable ogre whose quiet swamp is suddenly overrun by fairy-tale characters. To win his home back, Shrek sets out to rescue Princess Fiona and discovers a love story he never expected.",
        releaseDate: "2001-05-18",
        posterPath: "/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg",
        backdropPath: "/w0eKUOEog2ImtktCHAMUZws8qif.jpg",
        genreIds: [16, 35, 14, 12, 10751],
        voteAverage: 7.778,
        voteCount: 19_248,
        popularity: 36.4439,
        originalLanguage: "en",
        discoverySources: ["focused"],
        score: 100,
        runtimeMinutes: 90,
        certification: "U",
        genres: ["Animation", "Comedy", "Fantasy", "Adventure", "Family"],
        director: "Andrew Adamson",
        cast: ["Mike Myers", "Eddie Murphy", "Cameron Diaz"],
        castPopularity: 100,
        keywordNames: ["romantic", "fairy tale", "ogre", "princess"],
        productionCountries: ["United States of America", "US"],
        relevanceScore: 100,
        matchedCriteria: ["romantic"],
        matchReason:
          "True love, grand gestures, and proof that romance comes in unexpected packages.",
        availability: {
          stream: [
            { id: 8, name: "Netflix", logoPath: null },
            { id: 175, name: "Netflix Kids", logoPath: null },
          ],
          free: [],
          rent: [
            { id: 2, name: "Apple TV Store", logoPath: null },
            { id: 10, name: "Amazon Video", logoPath: null },
          ],
          buy: [
            { id: 2, name: "Apple TV Store", logoPath: null },
            { id: 10, name: "Amazon Video", logoPath: null },
          ],
          tmdbUrl: "https://www.themoviedb.org/movie/808-shrek/watch?locale=GB",
        },
      },
    ],
    remainingRecommendations: [],
    remainingCandidateIds: [],
    intent,
    referenceExclusionIds: [],
    demoMode: false,
  };
}
