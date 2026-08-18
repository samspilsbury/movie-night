import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MovieIntent } from "@/features/recommendations/types";
import {
  discoverCandidatePool,
  resolveReferenceContext,
  resolveReferenceExclusions,
} from "@/lib/tmdb/client";

const baseIntent: MovieIntent = {
  requiredGenres: ["thriller"],
  preferredGenres: ["science fiction"],
  excludedGenres: ["horror"],
  castMembers: [],
  referenceCastMembers: [],
  productionOriginCountries: [],
  preferences: [
    {
      category: "mood",
      value: "tense",
      priority: "primary",
      source: "explicit",
    },
  ],
  keywordTerms: [],
  referenceMovies: [],
  minimumYear: 1990,
  maximumYear: null,
  maximumRuntimeMinutes: 120,
  originalLanguage: null,
};

type TmdbMovieFixture = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
};

function tmdbMovie(overrides: Partial<TmdbMovieFixture>) {
  return {
    id: 1,
    title: "Example",
    original_title: "Example",
    overview: "Example overview",
    release_date: "2020-01-01",
    poster_path: null,
    backdrop_path: null,
    genre_ids: [53],
    vote_average: 7.8,
    vote_count: 1_000,
    popularity: 20,
    original_language: "en",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TMDB client", () => {
  beforeEach(() => {
    vi.stubEnv("MOVIE_NIGHT_DEMO_MODE", "false");
    vi.stubEnv("MOVIE_NIGHT_REGION", "GB");
    vi.stubEnv("TMDB_API_TOKEN", "test-token");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-5.6-luna");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses a lower retrieval floor and preserves hard constraints across lanes", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          results: Array.from({ length: 10 }, (_, index) =>
            tmdbMovie({
              id: index + 1,
              title: `Film ${index + 1}`,
              vote_count: 1_000 + index,
            }),
          ),
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await discoverCandidatePool(baseIntent, [2]);
    const [request, options] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit & { next?: { revalidate: number } },
    ];
    const url = new URL(request);

    expect(url.pathname).toBe("/3/discover/movie");
    expect(url.searchParams.get("vote_average.gte")).toBe("6.2");
    expect(url.searchParams.get("vote_count.gte")).toBe("100");
    expect(url.searchParams.get("with_genres")).toBe("53|878");
    expect(url.searchParams.get("without_genres")).toBe("27");
    expect(url.searchParams.get("with_runtime.lte")).toBe("120");
    expect(url.searchParams.get("primary_release_date.gte")).toBe("1990-01-01");
    expect(url.searchParams.get("primary_release_date.lte")).toBe(
      new Date().toISOString().slice(0, 10),
    );
    expect(url.searchParams.has("region")).toBe(false);
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
    expect(options.next?.revalidate).toBe(3_600);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(candidates).toHaveLength(9);
    expect(candidates.map((movie) => movie.id)).not.toContain(2);
  });

  it("builds a sixty-film shortlist from the broad retrieval backbone", async () => {
    const fetchMock = vi.fn().mockImplementation((request: URL) => {
      const url = new URL(request);
      const page = Number(url.searchParams.get("page"));
      const sortOffset =
        url.searchParams.get("sort_by") === "vote_count.desc" ? 60 : 0;
      return Promise.resolve(
        jsonResponse({
          results: Array.from({ length: 20 }, (_, index) =>
            tmdbMovie({
              id: sortOffset + (page - 1) * 20 + index + 1,
              genre_ids: [53],
              vote_count: 1_000 + index,
            }),
          ),
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await discoverCandidatePool(
      { ...baseIntent, preferredGenres: [] },
      [],
    );

    expect(candidates).toHaveLength(60);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("keeps useful candidates when individual keyword and discovery lanes fail", async () => {
    const intent: MovieIntent = {
      ...baseIntent,
      keywordTerms: ["plot twist", "surprise revelation"],
    };
    const fetchMock = vi.fn().mockImplementation((request: URL) => {
      const url = new URL(request);
      if (url.pathname === "/3/search/keyword") {
        return Promise.resolve(
          url.searchParams.get("query") === "plot twist"
            ? jsonResponse({ status_message: "Temporary failure" }, 503)
            : jsonResponse({ results: [{ id: 42, name: "revelation" }] }),
        );
      }

      const focusedLane =
        url.searchParams.has("with_genres") &&
        url.searchParams.has("with_keywords");
      return Promise.resolve(
        focusedLane
          ? jsonResponse({ status_message: "Temporary failure" }, 503)
          : jsonResponse({
              results: [
                tmdbMovie({
                  id: url.searchParams.has("with_keywords") ? 21 : 22,
                }),
              ],
            }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await discoverCandidatePool(intent, []);
    const paths = fetchMock.mock.calls.map(([request]) => new URL(request));

    expect(
      paths.filter((url) => url.pathname === "/3/search/keyword"),
    ).toHaveLength(2);
    expect(
      paths.filter((url) => url.pathname === "/3/discover/movie"),
    ).toHaveLength(6);
    expect(candidates.map((movie) => movie.id)).toEqual([22]);
  });

  it("keeps story setting soft and production origin explicit", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          results: [tmdbMovie({ id: 30, genre_ids: [35, 10749] })],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await discoverCandidatePool(
      {
        ...baseIntent,
        requiredGenres: ["comedy", "romance"],
        excludedGenres: [],
        preferences: [
          {
            category: "setting",
            value: "United Kingdom",
            priority: "primary",
            source: "explicit",
          },
        ],
      },
      [],
    );

    const discoverUrls = fetchMock.mock.calls
      .map(([request]) => new URL(request))
      .filter((url) => url.pathname === "/3/discover/movie");
    expect(
      discoverUrls.filter(
        (url) => url.searchParams.get("with_origin_country") === "GB",
      ),
    ).toHaveLength(0);

    fetchMock.mockClear();
    await discoverCandidatePool(
      {
        ...baseIntent,
        requiredGenres: ["comedy"],
        preferredGenres: [],
        excludedGenres: [],
        preferences: [],
        productionOriginCountries: ["GB"],
      },
      [],
    );
    const originUrls = fetchMock.mock.calls
      .map(([request]) => new URL(request))
      .filter((url) => url.pathname === "/3/discover/movie");
    expect(
      originUrls.every(
        (url) => url.searchParams.get("with_origin_country") === "GB",
      ),
    ).toBe(true);
  });

  it("selects the exact referenced title and excludes its collection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            tmdbMovie({ id: 11, title: "Inception: The Cobol Job" }),
            tmdbMovie({
              id: 12,
              title: "Inception",
              release_date: "2010-07-16",
            }),
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 12, belongs_to_collection: { id: 99 } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ parts: [{ id: 12 }, { id: 13 }, { id: 14 }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const exclusions = await resolveReferenceExclusions({
      ...baseIntent,
      referenceMovies: [
        { title: "Inception", year: 2010, similarityTraits: ["dream heist"] },
      ],
    });

    expect(exclusions).toEqual([12, 13, 14]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/movie/12");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/collection/99");
  });

  it("resolves reference cast and preserves a named cast constraint across broad lanes", async () => {
    const referenceFetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [tmdbMovie({ id: 8699, title: "Anchorman" })],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 8699,
          belongs_to_collection: null,
          credits: {
            cast: [
              { id: 23659, name: "Will Ferrell", order: 0 },
              { id: 22226, name: "Paul Rudd", order: 3 },
            ],
          },
        }),
      );
    vi.stubGlobal("fetch", referenceFetch);

    const context = await resolveReferenceContext({
      ...baseIntent,
      referenceMovies: [
        { title: "Anchorman", year: 2004, similarityTraits: [] },
      ],
    });

    expect(context).toEqual({
      exclusionIds: [8699],
      castIds: [23659, 22226],
      castNames: ["Will Ferrell", "Paul Rudd"],
    });

    const discoveryFetch = vi.fn().mockImplementation((request: URL) => {
      const url = new URL(request);
      if (url.pathname === "/3/search/person") {
        return Promise.resolve(
          jsonResponse({
            results: [
              { id: 22226, name: "Paul Rudd", known_for_department: "Acting" },
            ],
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({ results: [tmdbMovie({ id: 42 })] }),
      );
    });
    vi.stubGlobal("fetch", discoveryFetch);

    await discoverCandidatePool(
      {
        ...baseIntent,
        requiredGenres: ["comedy"],
        castMembers: ["Paul Rudd"],
      },
      [],
      context.castIds,
    );

    const discoveryUrls = discoveryFetch.mock.calls
      .map(([request]) => new URL(request))
      .filter((url) => url.pathname === "/3/discover/movie");
    expect(discoveryUrls).toHaveLength(5);
    expect(
      discoveryUrls.every(
        (url) => url.searchParams.get("with_cast") === "22226",
      ),
    ).toBe(true);
  });

  it("turns TMDB authentication failures into safe provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ success: false }, 401)),
    );

    await expect(discoverCandidatePool(baseIntent, [])).rejects.toMatchObject({
      provider: "tmdb",
      code: "authentication",
      responseStatus: 503,
    });
  });
});
