import { describe, expect, it } from "vitest";

import { normalizeMovieIntent } from "@/features/recommendations/normalize-intent";
import type { MovieIntent } from "@/features/recommendations/types";

function intent(overrides: Partial<MovieIntent> = {}): MovieIntent {
  return {
    requiredGenres: [],
    preferredGenres: [],
    excludedGenres: [],
    castMembers: [],
    referenceCastMembers: [],
    productionOriginCountries: [],
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
    expect(normalized.keywordTerms.slice(0, 2)).toEqual([
      "plot twist",
      "twist ending",
    ]);
  });

  it("adds canonical retrieval terms when the model calls a twist shocking", () => {
    const normalized = normalizeMovieIntent(
      intent({
        requiredGenres: ["thriller"],
        preferences: [
          {
            category: "theme",
            value: "psychological tension and mind games",
            priority: "primary",
            source: "explicit",
          },
          {
            category: "theme",
            value: "plot twist",
            priority: "primary",
            source: "explicit",
          },
        ],
        keywordTerms: [
          "psychological suspense",
          "mind games",
          "unreliable perception",
          "shocking twist",
        ],
      }),
    );

    expect(normalized.keywordTerms.slice(0, 4)).toEqual([
      "plot twist",
      "twist ending",
      "psychological suspense",
      "mind games",
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

  it("turns chick flick into searchable genre and relationship signals", () => {
    const normalized = normalizeMovieIntent(
      intent({
        preferences: [
          {
            category: "style",
            value: "chick flick centred on female characters",
            priority: "primary",
            source: "explicit",
          },
          {
            category: "setting",
            value: "set in the UK",
            priority: "primary",
            source: "explicit",
          },
        ],
      }),
    );

    expect(normalized.preferredGenres).toEqual(["romance", "comedy"]);
    expect(normalized.preferences[0]?.value).toBe(
      "female-centred relationships and friendship",
    );
    expect(normalized.keywordTerms.slice(0, 4)).toEqual([
      "female friendship",
      "romantic relationship",
      "London, England",
      "England",
    ]);
  });

  it("extracts a named star from a cast preference", () => {
    const normalized = normalizeMovieIntent(
      intent({
        preferences: [
          {
            category: "cast",
            value: "starring Paul Rudd",
            priority: "primary",
            source: "explicit",
          },
        ],
      }),
    );

    expect(normalized.castMembers).toEqual(["Paul Rudd"]);
  });
});
