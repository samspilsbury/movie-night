import { describe, expect, it } from "vitest";

import {
  applyCandidateGrades,
  applyCandidateGradesWithFallback,
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

  it("deduplicates exclusions and caps the retrieval shortlist at sixty", () => {
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
    expect(ranked.map((movie) => movie.title)).toEqual([
      "Body Heat",
      "The Shawshank Redemption",
    ]);
  });

  it("does not let ratings overtake a materially stronger intent match", () => {
    const celebrated = recommendation({
      id: 1,
      title: "Celebrated but vague",
      voteAverage: 9.2,
      voteCount: 30_000,
    });
    const relevant = recommendation({
      id: 2,
      title: "Clearly relevant",
      voteAverage: 6.3,
      voteCount: 120,
    });
    const grades = [
      {
        id: celebrated.id,
        relevanceScore: 65,
        matchedCriteria: ["one soft preference"],
        missingPrimaryCriteria: ["another soft preference"],
        contradictions: [],
        matchReason: "A partial match.",
      },
      {
        id: relevant.id,
        relevanceScore: 85,
        matchedCriteria: ["both important preferences"],
        missingPrimaryCriteria: [],
        contradictions: [],
        matchReason: "A strong match.",
      },
    ];

    expect(
      applyCandidateGrades([celebrated, relevant], intent(), grades).map(
        (movie) => movie.id,
      ),
    ).toEqual([relevant.id, celebrated.id]);
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
      keywordNames: ["london, england"],
      productionCountries: ["United Kingdom", "GB"],
    });
    const londonSynopsis = recommendation({
      id: 4,
      title: "A London Romance",
      overview:
        "A woman navigates friendship and an unexpected romance in London.",
      genres: ["Romance", "Comedy"],
      genreIds: [10749, 35],
      keywordNames: ["female friendship"],
    });
    const amIOkay = recommendation({
      id: 3,
      title: "Am I OK?",
      overview:
        "Two American friends face a change when one announces she is moving away.",
      genres: ["Romance", "Comedy", "Drama"],
      genreIds: [10749, 35, 18],
      keywordNames: ["female friendship", "relationship"],
      productionCountries: ["United States of America", "US"],
    });

    expect(deterministicGrade(bridget, request).relevanceScore).toBeGreaterThan(
      55,
    );
    expect(deterministicGrade(kingsman, request).relevanceScore).toBeLessThan(
      55,
    );
    expect(deterministicGrade(londonSynopsis, request).relevanceScore).toBe(
      100,
    );
    expect(
      deterministicGrade(amIOkay, request).missingPrimaryCriteria,
    ).toContain("United Kingdom");
    expect(
      applyCandidateGrades([amIOkay], request, [
        deterministicGrade(amIOkay, request),
      ]),
    ).toHaveLength(1);
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
      referenceCastMembers: ["Will Ferrell", "Paul Rudd", "Steve Carell"],
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
      cast: ["Will Ferrell", "Mark Wahlberg", "Eva Mendes"],
    });

    expect(
      deterministicGrade(ensemble, request).relevanceScore,
    ).toBeGreaterThan(80);
    expect(deterministicGrade(parasite, request).relevanceScore).toBeLessThan(
      55,
    );
  });

  it("requires a specifically requested actor", () => {
    const request = intent({
      requiredGenres: ["comedy"],
      castMembers: ["Paul Rudd"],
      preferences: [
        {
          category: "cast",
          value: "starring Paul Rudd",
          priority: "primary",
          source: "explicit",
        },
      ],
    });
    const withPaulRudd = recommendation({
      id: 1,
      genres: ["Comedy"],
      genreIds: [35],
      cast: ["Paul Rudd", "Jason Segel", "Rashida Jones"],
    });
    const withoutPaulRudd = recommendation({
      id: 2,
      genres: ["Comedy"],
      genreIds: [35],
      cast: ["Will Ferrell", "Steve Carell", "David Koechner"],
    });

    const ranked = applyCandidateGrades(
      [withoutPaulRudd, withPaulRudd],
      request,
      [withoutPaulRudd, withPaulRudd].map((movie) =>
        deterministicGrade(movie, request),
      ),
    );

    expect(ranked.map((movie) => movie.id)).toEqual([withPaulRudd.id]);
  });

  it("keeps a complete batch even when some soft evidence is weak", () => {
    const request = intent({ requiredGenres: ["comedy"] });
    const candidates = Array.from({ length: 5 }, (_, index) =>
      recommendation({
        id: index + 1,
        title: `Comedy ${index + 1}`,
        genres: ["Comedy"],
        genreIds: [35],
      }),
    );

    const result = applyCandidateGradesWithFallback(candidates, request, [
      {
        id: 1,
        relevanceScore: 90,
        matchedCriteria: ["comedy"],
        missingPrimaryCriteria: [],
        contradictions: [],
        matchReason: "A strong comedy match.",
      },
      ...candidates.slice(1).map((movie) => ({
        id: movie.id,
        relevanceScore: 20,
        matchedCriteria: [],
        missingPrimaryCriteria: [],
        contradictions: [],
        matchReason: "Weak semantic match.",
      })),
    ]);

    expect(result.usedFallback).toBe(false);
    expect(result.recommendations).toHaveLength(5);
  });

  it("recognises catalogue plot-twist evidence for a romcom fallback", () => {
    const request = intent({
      requiredGenres: ["romance", "comedy"],
      preferences: [
        {
          category: "theme",
          value: "major unexpected plot twist",
          priority: "primary",
          source: "explicit",
        },
      ],
      keywordTerms: ["plot twist", "unexpected revelation"],
    });
    const twistyRomcom = recommendation({
      title: "A Twisty Romance",
      overview: "A couple's courtship leads to a startling final reveal.",
      genres: ["Romance", "Comedy"],
      genreIds: [10749, 35],
      keywordNames: ["plot twist", "romantic comedy"],
    });

    const grade = deterministicGrade(twistyRomcom, request);

    expect(grade.missingPrimaryCriteria).toEqual([]);
    expect(grade.relevanceScore).toBeGreaterThan(80);
  });

  it("recognises psychological and structural twist evidence without spoilers in the overview", () => {
    const request = intent({
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
    });
    const fightClub = recommendation({
      title: "Fight Club",
      overview:
        "An insomniac and a soap salesman form an underground fight club.",
      genres: ["Drama", "Thriller"],
      genreIds: [18, 53],
      keywordNames: [
        "dual identity",
        "alter ego",
        "split personality",
        "dissociative identity disorder",
      ],
    });
    const genericThriller = recommendation({
      id: 2,
      title: "A Generic Thriller",
      overview: "A detective pursues a criminal through a dangerous city.",
      genres: ["Thriller"],
      genreIds: [53],
      keywordNames: ["police", "chase"],
    });

    const ranked = applyCandidateGrades(
      [genericThriller, fightClub],
      request,
      [genericThriller, fightClub].map((movie) =>
        deterministicGrade(movie, request),
      ),
    );

    expect(ranked.map((movie) => movie.title)).toEqual([
      "Fight Club",
      "A Generic Thriller",
    ]);
  });

  it("promotes a romcom with an unexpected turn before generic popular matches", () => {
    const request = intent({
      requiredGenres: ["romance", "comedy"],
      preferences: [
        {
          category: "theme",
          value: "prominent unexpected plot twist",
          priority: "primary",
          source: "explicit",
        },
      ],
      keywordTerms: ["plot twist", "unexpected twist", "surprise ending"],
    });
    const generic = candidate({
      id: 1,
      title: "A Popular Romance",
      overview: "A couple fall in love while chasing their dreams.",
      genreIds: [10749, 35],
      voteAverage: 8.5,
      voteCount: 30_000,
    });
    const unexpected = candidate({
      id: 2,
      title: "An Unexpected Romance",
      overview:
        "A happily engaged couple is tested when an unexpected turn sends their wedding week off the rails.",
      genreIds: [10749, 35],
      voteAverage: 6.5,
      voteCount: 200,
    });

    expect(rankCandidatePool([generic, unexpected], request, [])[0]?.id).toBe(
      unexpected.id,
    );
  });

  it("does not discard a hard-valid candidate for missing soft evidence", () => {
    const request = intent({
      requiredGenres: ["romance", "comedy"],
      preferences: [
        {
          category: "theme",
          value: "plot twist",
          priority: "primary",
          source: "explicit",
        },
      ],
    });
    const movie = recommendation({
      title: "The Drama",
      overview:
        "A happily engaged couple is tested when an unexpected turn sends their wedding week off the rails.",
      genres: ["Romance", "Comedy"],
      genreIds: [10749, 35],
    });

    const result = applyCandidateGradesWithFallback([movie], request, [
      {
        id: movie.id,
        relevanceScore: 30,
        matchedCriteria: ["romance", "comedy"],
        missingPrimaryCriteria: ["plot twist"],
        contradictions: [],
        matchReason: "A genre match without enough twist evidence.",
      },
    ]);

    expect(result.usedFallback).toBe(false);
    expect(result.recommendations.map((candidate) => candidate.title)).toEqual([
      "The Drama",
    ]);
  });

  it("treats multiple positive genres as an inclusive request", () => {
    const request = intent({ requiredGenres: ["romance", "comedy"] });
    const comedy = recommendation({ genres: ["Comedy"], genreIds: [35] });

    expect(
      applyCandidateGrades([comedy], request, [
        deterministicGrade(comedy, request),
      ]),
    ).toHaveLength(1);
  });

  it("enforces an explicitly requested production origin", () => {
    const request = intent({ productionOriginCountries: ["GB"] });
    const british = recommendation({
      id: 1,
      productionCountries: ["United Kingdom", "GB"],
    });
    const american = recommendation({
      id: 2,
      productionCountries: ["United States of America", "US"],
    });

    expect(
      applyCandidateGrades(
        [american, british],
        request,
        [american, british].map((movie) => deterministicGrade(movie, request)),
      ).map((movie) => movie.id),
    ).toEqual([british.id]);
  });
});
