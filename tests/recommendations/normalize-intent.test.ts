import { describe, expect, it } from "vitest";

import { normalizeMovieIntent } from "@/features/recommendations/normalize-intent";
import type { MovieIntent } from "@/features/recommendations/types";

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

describe("movie intent normalization", () => {
  it("turns a verbose or truncated twist preference into one auditable concept", () => {
    const normalized = normalizeMovieIntent(
      intent({
        requiredGenres: ["romance", "comedy"],
        preferences: [
          {
            category: "theme",
            value:
              "romantic comedy centered around a major unexpected plot or:",
            priority: "primary",
            source: "explicit",
          },
          {
            category: "style",
            value: "a surprise revelation that subverts expectations",
            priority: "primary",
            source: "explicit",
          },
        ],
        keywordTerms: ["plot twist", "surprise revelation"],
      }),
    );

    expect(normalized.preferences).toEqual([
      {
        category: "theme",
        value: "plot twist",
        priority: "primary",
        source: "explicit",
      },
    ]);
  });

  it("leaves unrelated intent untouched", () => {
    const original = intent({
      preferences: [
        {
          category: "mood",
          value: "warm and uplifting",
          priority: "primary",
          source: "explicit",
        },
      ],
    });

    expect(normalizeMovieIntent(original)).toBe(original);
  });
});
