import { describe, expect, it } from "vitest";

import {
  applyCandidateGrades,
  candidateScore,
  deterministicGrade,
  genreNamesToIds,
  rankCandidatePool,
} from "@/features/recommendations/quality";
import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
} from "@/features/recommendations/types";

function intent(overrides: Partial<MovieIntent> = {}): MovieIntent {
  return {
    requiredGenres: [],
    preferredGenres: [],
    excludedGenres: [],
    preferences: [],
    keywordTerms: [],
    referenceMovies: [],
    minimumYear: null,
    maximumYear: null,
    maximumRuntimeMinutes: null,
    originalLanguage: null,
    ...overrides,
  };
}

function candidate(overrides: Partial<MovieCandidate> = {}): MovieCandidate {
  return {
    id: 1,
    title: "Example",
    originalTitle: "Example",
    overview: "",
    releaseDate: "2020-01-01",
    posterPath: null,
    backdropPath: null,
    genreIds: [53],
    voteAverage: 7.5,
    voteCount: 1_000,
    popularity: 50,
    originalLanguage: "en",
    discoverySources: ["broad"],
    score: 0,
    ...overrides,
  };
}

function recommendation(
  overrides: Partial<MovieRecommendation> = {},
): MovieRecommendation {
  return {
    ...candidate(),
    runtimeMinutes: 110,
    certification: "15",
    genres: ["Drama"],
    director: null,
    cast: ["Actor One", "Actor Two", "Actor Three"],
    castPopularity: 20,
    keywordNames: [],
    productionCountries: [],
    relevanceScore: 0,
    matchedCriteria: [],
    matchReason: "",
    availability: {
      stream: [],
      free: [],
      rent: [],
      buy: [],
      tmdbUrl: null,
    },
    ...overrides,
  };
}

describe("recommendation quality", () => {
  it("maps allowlisted genre names to TMDB IDs", () => {
    expect(genreNamesToIds(["action", "science fiction", "thriller"])).toEqual([
      28, 878, 53,
    ]);
  });

  it("rewards vote confidence over a tiny rating sample", () => {
    const request = intent({ preferredGenres: ["thriller"] });
    const established = candidate({ voteAverage: 7.8, voteCount: 8_000 });
    const tinySample = candidate({ voteAverage: 9.2, voteCount: 10 });

    expect(candidateScore(established, request)).toBeGreaterThan(
      candidateScore(tinySample, request),
    );
  });

  it("deduplicates exclusions and caps the reusable pool at sixty", () => {
    const candidates = Array.from({ length: 70 }, (_, index) =>
      candidate({ id: index + 1, voteCount: 1_000 + index }),
    );
    const ranked = rankCandidatePool(candidates, intent(), [2, 4]);

    expect(ranked).toHaveLength(60);
    expect(ranked.map((movie) => movie.id)).not.toContain(2);
    expect(ranked.map((movie) => movie.id)).not.toContain(4);
  });

  it("does not treat a prestigious drama as a match for a sexy film", () => {
    const request = intent({
      preferences: [
        {
          category: "tone",
          value: "sensual",
          priority: "primary",
          source: "explicit",
        },
      ],
      keywordTerms: ["sensuality", "eroticism"],
    });
    const shawshank = recommendation({
      id: 1,
      title: "The Shawshank Redemption",
      overview: "Two imprisoned men form a friendship over many years.",
      voteAverage: 9.3,
      voteCount: 30_000,
      keywordNames: ["prison", "friendship", "hope"],
    });
    const bodyHeat = recommendation({
      id: 2,
      title: "Body Heat",
      overview: "A seductive affair draws a lawyer into an erotic murder plot.",
      keywordNames: ["sensual", "seduction", "eroticism"],
    });

    const ranked = applyCandidateGrades(
      [shawshank, bodyHeat],
      request,
      [shawshank, bodyHeat].map((movie) => deterministicGrade(movie, request)),
    );
    expect(ranked.map((movie) => movie.title)).toEqual(["Body Heat"]);
  });

  it("requires both the requested chick-flick style and UK setting", () => {
    const request = intent({
      preferredGenres: ["romance", "comedy"],
      preferences: [
        {
          category: "style",
          value: "female-centred romantic comedy",
          priority: "primary",
          source: "explicit",
        },
        {
          category: "setting",
          value: "United Kingdom",
          priority: "primary",
          source: "explicit",
        },
      ],
    });
    const kingsman = recommendation({
      id: 1,
      title: "Kingsman: The Secret Service",
      overview:
        "A British spy recruits a street kid into a violent secret service.",
      genres: ["Action", "Comedy"],
      genreIds: [28, 35],
      productionCountries: ["United Kingdom", "GB"],
    });
    const bridget = recommendation({
      id: 2,
      title: "Bridget Jones's Diary",
      overview:
        "A female-centred romantic comedy about love and friendship in London.",
      genres: ["Romance", "Comedy"],
      genreIds: [10749, 35],
      productionCountries: ["United Kingdom", "GB"],
    });

    expect(deterministicGrade(bridget, request).relevanceScore).toBeGreaterThan(
      55,
    );
    expect(deterministicGrade(kingsman, request).relevanceScore).toBeLessThan(
      55,
    );
  });

  it("does not let Parasite's comedy tag outrank an Anchorman-like ensemble comedy", () => {
    const request = intent({
      requiredGenres: ["comedy"],
      preferences: [
        {
          category: "style",
          value: "absurdist ensemble comedy",
          priority: "primary",
          source: "explicit",
        },
        {
          category: "cast",
          value: "star-studded cast",
          priority: "primary",
          source: "explicit",
        },
      ],
      referenceMovies: [
        {
          title: "Anchorman",
          year: 2004,
          similarityTraits: ["absurdist humour", "ensemble comedy"],
        },
      ],
    });
    const parasite = recommendation({
      id: 1,
      title: "Parasite",
      overview:
        "A struggling family enters a wealthy household in a dark social satire.",
      genres: ["Comedy", "Thriller", "Drama"],
      genreIds: [35, 53, 18],
      castPopularity: 18,
    });
    const ensemble = recommendation({
      id: 2,
      title: "The Other Guys",
      overview: "An absurdist ensemble comedy about two mismatched detectives.",
      genres: ["Comedy", "Action"],
      genreIds: [35, 28],
      castPopularity: 120,
    });

    expect(
      deterministicGrade(ensemble, request).relevanceScore,
    ).toBeGreaterThan(80);
    expect(deterministicGrade(parasite, request).relevanceScore).toBeLessThan(
      55,
    );
  });
});
