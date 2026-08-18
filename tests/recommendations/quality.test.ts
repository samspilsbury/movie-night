import { describe, expect, it } from "vitest";

import {
  candidateScore,
  genreNamesToIds,
  rankCandidates,
} from "@/features/recommendations/quality";
import type {
  MovieCandidate,
  MovieIntent,
} from "@/features/recommendations/types";

const intent: MovieIntent = {
  includedGenres: ["thriller"],
  excludedGenres: [],
  moods: ["tense"],
  keywordTerms: [],
  referenceMovies: [],
  minimumYear: null,
  maximumYear: null,
  maximumRuntimeMinutes: null,
  originalLanguage: null,
};

function candidate(overrides: Partial<MovieCandidate>): MovieCandidate {
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
    voteCount: 1000,
    popularity: 50,
    score: 0,
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
    const established = candidate({ voteAverage: 7.8, voteCount: 8000 });
    const tinySample = candidate({ voteAverage: 9.2, voteCount: 10 });

    expect(candidateScore(established, intent, 500)).toBeGreaterThan(
      candidateScore(tinySample, intent, 500),
    );
  });

  it("removes excluded films and returns no more than eight", () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      candidate({ id: index + 1, voteCount: 1000 + index }),
    );

    const ranked = rankCandidates(candidates, intent, 500, [2, 4]);

    expect(ranked).toHaveLength(8);
    expect(ranked.map((movie) => movie.id)).not.toContain(2);
    expect(ranked.map((movie) => movie.id)).not.toContain(4);
  });
});
