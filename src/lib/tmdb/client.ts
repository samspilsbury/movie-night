import type {
  DiscoverySource,
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
  WatchProvider,
} from "@/features/recommendations/types";
import {
  DISCOVERY_MINIMUM_RATING,
  DISCOVERY_MINIMUM_VOTES,
  genreIdsToNames,
  genreNamesToIds,
  rankCandidatePool,
} from "@/features/recommendations/quality";
import { getServerEnv } from "@/lib/env";
import { ProviderError } from "@/lib/provider-error";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_REQUEST_TIMEOUT_MS = 6_000;
const MAX_KEYWORD_LOOKUPS = 4;

type TmdbDiscoverMovie = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language?: string;
};

type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

type TmdbDetails = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Array<{ id: number; name: string }>;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language?: string;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  belongs_to_collection: { id: number } | null;
  keywords?: { keywords: Array<{ id: number; name: string }> };
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      order: number;
      popularity?: number;
    }>;
    crew: Array<{ name: string; job: string }>;
  };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string; type: number }>;
    }>;
  };
  "watch/providers"?: {
    results: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbProvider[];
        free?: TmdbProvider[];
        ads?: TmdbProvider[];
        rent?: TmdbProvider[];
        buy?: TmdbProvider[];
      }
    >;
  };
};

async function tmdbFetch<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const { TMDB_API_TOKEN } = getServerEnv();
  if (!TMDB_API_TOKEN) throw new Error("TMDB_API_TOKEN is not configured.");

  const url = new URL(`${TMDB_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "")
      url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_API_TOKEN}`,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(TMDB_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new ProviderError(
      "tmdb",
      timedOut ? "timeout" : "connection",
      timedOut ? 504 : 503,
      timedOut
        ? "The movie catalogue took too long to respond. Try again."
        : "The movie catalogue is temporarily unreachable. Try again.",
      { cause: error },
    );
  }

  if (!response.ok) {
    const authenticationFailure =
      response.status === 401 || response.status === 403;
    const rateLimited = response.status === 429;
    throw new ProviderError(
      "tmdb",
      authenticationFailure
        ? "authentication"
        : rateLimited
          ? "rate_limit"
          : response.status >= 500
            ? "unavailable"
            : "response",
      authenticationFailure ? 503 : response.status >= 500 ? 503 : 502,
      authenticationFailure
        ? "The movie catalogue is not configured correctly."
        : rateLimited
          ? "The movie catalogue is busy. Wait a moment and try again."
          : "The movie catalogue could not complete the search. Try again.",
    );
  }

  return (await response.json()) as T;
}

function normalizeMovieTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function selectReferenceMatch(
  results: TmdbDiscoverMovie[],
  reference: MovieIntent["referenceMovies"][number],
): TmdbDiscoverMovie | null {
  const expectedTitle = normalizeMovieTitle(reference.title);
  const titleMatches = results.filter(
    (movie) =>
      normalizeMovieTitle(movie.title) === expectedTitle ||
      normalizeMovieTitle(movie.original_title) === expectedTitle,
  );
  if (reference.year) {
    const exact = titleMatches.find((movie) =>
      movie.release_date?.startsWith(String(reference.year)),
    );
    if (exact) return exact;
  }
  return titleMatches[0] ?? results[0] ?? null;
}

function toCandidate(
  movie: TmdbDiscoverMovie,
  source: DiscoverySource,
): MovieCandidate {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    releaseDate: movie.release_date || null,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    genreIds: movie.genre_ids,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
    originalLanguage: movie.original_language ?? null,
    discoverySources: [source],
    score: 0,
  };
}

async function resolveKeywordIds(terms: string[]): Promise<number[]> {
  const results = await Promise.allSettled(
    terms.slice(0, MAX_KEYWORD_LOOKUPS).map(async (term) => {
      const response = await tmdbFetch<{
        results: Array<{ id: number; name: string }>;
      }>("/search/keyword", { query: term, page: 1 });
      const expected = normalizeMovieTitle(term);
      const exact = response.results.find(
        (keyword) => normalizeMovieTitle(keyword.name) === expected,
      );
      return exact?.id ?? response.results[0]?.id ?? null;
    }),
  );
  return [
    ...new Set(
      results.flatMap((result) =>
        result.status === "fulfilled" && result.value !== null
          ? [result.value]
          : [],
      ),
    ),
  ];
}

async function resolveCastIds(names: string[]): Promise<number[]> {
  const results = await Promise.allSettled(
    names.map(async (name) => {
      const response = await tmdbFetch<{
        results: Array<{
          id: number;
          name: string;
          known_for_department?: string;
        }>;
      }>("/search/person", { query: name, page: 1 });
      const expected = normalizeMovieTitle(name);
      const exact = response.results.find(
        (person) =>
          normalizeMovieTitle(person.name) === expected &&
          person.known_for_department === "Acting",
      );
      return exact?.id ?? response.results[0]?.id ?? null;
    }),
  );
  return [
    ...new Set(
      results.flatMap((result) =>
        result.status === "fulfilled" && result.value !== null
          ? [result.value]
          : [],
      ),
    ),
  ];
}

export type ReferenceContext = {
  exclusionIds: number[];
  castIds: number[];
  castNames: string[];
};

export async function resolveReferenceContext(
  intent: MovieIntent,
): Promise<ReferenceContext> {
  const referenceGroups = await Promise.all(
    intent.referenceMovies.map(async (reference) => {
      const search = await tmdbFetch<{ results: TmdbDiscoverMovie[] }>(
        "/search/movie",
        {
          query: reference.title,
          year: reference.year ?? undefined,
          include_adult: true,
          language: "en-GB",
          page: 1,
        },
      );
      const match = selectReferenceMatch(search.results, reference);
      if (!match) return { exclusionIds: [], castIds: [], castNames: [] };
      const details = await tmdbFetch<TmdbDetails>(`/movie/${match.id}`, {
        language: "en-GB",
        append_to_response: "credits",
      });
      const cast = [...(details.credits?.cast ?? [])]
        .sort((left, right) => left.order - right.order)
        .slice(0, 6);
      if (!details.belongs_to_collection) {
        return {
          exclusionIds: [match.id],
          castIds: cast.map((member) => member.id),
          castNames: cast.map((member) => member.name),
        };
      }
      const collection = await tmdbFetch<{ parts: Array<{ id: number }> }>(
        `/collection/${details.belongs_to_collection.id}`,
        { language: "en-GB" },
      );
      return {
        exclusionIds: [match.id, ...collection.parts.map((part) => part.id)],
        castIds: cast.map((member) => member.id),
        castNames: cast.map((member) => member.name),
      };
    }),
  );
  return {
    exclusionIds: [
      ...new Set(referenceGroups.flatMap((group) => group.exclusionIds)),
    ],
    castIds: [...new Set(referenceGroups.flatMap((group) => group.castIds))],
    castNames: [
      ...new Set(referenceGroups.flatMap((group) => group.castNames)),
    ],
  };
}

export async function resolveReferenceExclusions(
  intent: MovieIntent,
): Promise<number[]> {
  return (await resolveReferenceContext(intent)).exclusionIds;
}

type DiscoveryLane = {
  source: DiscoverySource;
  page: number;
  genres?: string;
  keywords?: string;
  cast?: string;
  originCountry?: string;
};

function discoveryLanes(
  genreQuery: string,
  keywordQuery: string,
  castQuery: string,
  originCountry: string,
): DiscoveryLane[] {
  if (castQuery) {
    return [
      { source: "cast", page: 1, genres: genreQuery, cast: castQuery },
      { source: "cast", page: 2, genres: genreQuery, cast: castQuery },
      {
        source: "focused",
        page: 1,
        genres: genreQuery,
        keywords: keywordQuery,
        cast: castQuery,
      },
    ];
  }
  if (originCountry) {
    return [
      {
        source: "focused",
        page: 1,
        genres: genreQuery,
        keywords: keywordQuery,
        originCountry,
      },
      {
        source: "focused",
        page: 2,
        genres: genreQuery,
        originCountry,
      },
      { source: "keyword", page: 1, keywords: keywordQuery },
    ];
  }
  if (genreQuery && keywordQuery) {
    return [
      {
        source: "focused",
        page: 1,
        genres: genreQuery,
        keywords: keywordQuery,
      },
      { source: "keyword", page: 1, keywords: keywordQuery },
      { source: "genre", page: 1, genres: genreQuery },
    ];
  }
  if (keywordQuery) {
    return [
      { source: "keyword", page: 1, keywords: keywordQuery },
      { source: "keyword", page: 2, keywords: keywordQuery },
      { source: "broad", page: 1 },
    ];
  }
  if (genreQuery) {
    return [
      { source: "genre", page: 1, genres: genreQuery },
      { source: "genre", page: 2, genres: genreQuery },
      { source: "broad", page: 1 },
    ];
  }
  return [1, 2, 3].map((page) => ({ source: "broad" as const, page }));
}

export async function discoverCandidatePool(
  intent: MovieIntent,
  excludedIds: number[],
  referenceCastIds: number[] = [],
): Promise<MovieCandidate[]> {
  const [keywordIds, requestedCastIds] = await Promise.all([
    resolveKeywordIds(intent.keywordTerms),
    resolveCastIds(intent.castMembers),
  ]);
  const requiredGenreIds = genreNamesToIds(intent.requiredGenres);
  const preferredGenreIds = genreNamesToIds(intent.preferredGenres);
  const excludedGenreIds = genreNamesToIds(intent.excludedGenres);
  const genreQuery = requiredGenreIds.length
    ? requiredGenreIds.join(",")
    : preferredGenreIds.join("|");
  const keywordQuery = keywordIds.join("|");
  const wantsSimilarCast = intent.preferences.some(
    (preference) =>
      preference.category === "cast" &&
      /similar|same|overlap/.test(normalizeMovieTitle(preference.value)),
  );
  const castQuery = (
    requestedCastIds.length
      ? requestedCastIds
      : wantsSimilarCast
        ? referenceCastIds
        : []
  ).join("|");
  const originCountry = intent.preferences.some(
    (preference) =>
      preference.category === "setting" &&
      /united kingdom|\buk\b|britain|british|england|scotland|wales|northern ireland/.test(
        normalizeMovieTitle(preference.value),
      ),
  )
    ? "GB"
    : "";
  const today = new Date().toISOString().slice(0, 10);
  const requestedMaximumDate = intent.maximumYear
    ? `${intent.maximumYear}-12-31`
    : today;
  const maximumReleaseDate =
    requestedMaximumDate < today ? requestedMaximumDate : today;

  const laneResults = await Promise.allSettled(
    discoveryLanes(genreQuery, keywordQuery, castQuery, originCountry).map(
      async (lane) => {
        const response = await tmdbFetch<{ results: TmdbDiscoverMovie[] }>(
          "/discover/movie",
          {
            include_adult: true,
            include_video: false,
            language: "en-GB",
            page: lane.page,
            sort_by: "popularity.desc",
            "vote_average.gte": DISCOVERY_MINIMUM_RATING,
            "vote_count.gte": DISCOVERY_MINIMUM_VOTES,
            with_genres: lane.genres,
            without_genres: excludedGenreIds.join(","),
            with_keywords: lane.keywords,
            with_cast: lane.cast,
            with_origin_country: lane.originCountry,
            "primary_release_date.gte": intent.minimumYear
              ? `${intent.minimumYear}-01-01`
              : undefined,
            "primary_release_date.lte": maximumReleaseDate,
            "with_runtime.lte": intent.maximumRuntimeMinutes ?? undefined,
            with_original_language: intent.originalLanguage ?? undefined,
          },
        );
        return response.results.map((movie) => toCandidate(movie, lane.source));
      },
    ),
  );

  const successfulLanes = laneResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (!successfulLanes.length) {
    const failure = laneResults.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }

  const deduplicated = new Map<number, MovieCandidate>();
  for (const candidate of successfulLanes.flat()) {
    const existing = deduplicated.get(candidate.id);
    if (existing) {
      existing.discoverySources = [
        ...new Set([
          ...existing.discoverySources,
          ...candidate.discoverySources,
        ]),
      ];
    } else {
      deduplicated.set(candidate.id, candidate);
    }
  }
  return rankCandidatePool([...deduplicated.values()], intent, excludedIds);
}

function mapProvider(provider: TmdbProvider): WatchProvider {
  return {
    id: provider.provider_id,
    name: provider.provider_name,
    logoPath: provider.logo_path,
  };
}

function uniqueProviders(providers: TmdbProvider[] = []): WatchProvider[] {
  return [
    ...new Map(
      providers.map((provider) => [provider.provider_id, provider]),
    ).values(),
  ].map(mapProvider);
}

function findCertification(
  details: TmdbDetails,
  region: string,
): string | null {
  const regionalReleases = details.release_dates?.results.find(
    (entry) => entry.iso_3166_1 === region,
  );
  if (!regionalReleases) return null;
  const preference = [3, 4, 5, 2, 1, 6];
  return (
    [...regionalReleases.release_dates]
      .filter((release) => release.certification.trim())
      .sort(
        (left, right) =>
          preference.indexOf(left.type) - preference.indexOf(right.type),
      )[0]?.certification ?? null
  );
}

async function enrichMovie(
  candidate: MovieCandidate | number,
): Promise<MovieRecommendation> {
  const { region } = getServerEnv();
  const id = typeof candidate === "number" ? candidate : candidate.id;
  const details = await tmdbFetch<TmdbDetails>(`/movie/${id}`, {
    language: "en-GB",
    append_to_response: "credits,keywords,release_dates,watch/providers",
  });
  const regionalProviders = details["watch/providers"]?.results[region];
  const sortedCast = [...(details.credits?.cast ?? [])].sort(
    (left, right) => left.order - right.order,
  );
  const baseScore = typeof candidate === "number" ? 0 : candidate.score;
  const discoverySources =
    typeof candidate === "number"
      ? (["broad"] as const)
      : candidate.discoverySources;

  return {
    id: details.id,
    title: details.title,
    originalTitle: details.original_title,
    overview: details.overview,
    releaseDate: details.release_date || null,
    posterPath: details.poster_path,
    backdropPath: details.backdrop_path,
    genreIds: details.genres.map((genre) => genre.id),
    voteAverage: details.vote_average,
    voteCount: details.vote_count,
    popularity: details.popularity,
    originalLanguage: details.original_language ?? null,
    discoverySources: [...discoverySources],
    score: baseScore,
    runtimeMinutes: details.runtime,
    certification: findCertification(details, region),
    genres: details.genres.map((genre) => genre.name),
    director:
      details.credits?.crew.find((person) => person.job === "Director")?.name ??
      null,
    cast: sortedCast.slice(0, 5).map((person) => person.name),
    castPopularity: Number(
      sortedCast
        .slice(0, 5)
        .reduce((total, person) => total + (person.popularity ?? 0), 0)
        .toFixed(2),
    ),
    keywordNames:
      details.keywords?.keywords.map((keyword) => keyword.name) ?? [],
    productionCountries:
      details.production_countries?.flatMap((country) => [
        country.name,
        country.iso_3166_1,
      ]) ?? [],
    relevanceScore: 0,
    matchedCriteria: [],
    matchReason: "Selected for tonight's brief.",
    availability: {
      stream: uniqueProviders(regionalProviders?.flatrate),
      free: uniqueProviders([
        ...(regionalProviders?.free ?? []),
        ...(regionalProviders?.ads ?? []),
      ]),
      rent: uniqueProviders(regionalProviders?.rent),
      buy: uniqueProviders(regionalProviders?.buy),
      tmdbUrl: regionalProviders?.link ?? null,
    },
  };
}

export async function enrichMovieCandidates(
  candidates: Array<MovieCandidate | number>,
): Promise<MovieRecommendation[]> {
  const results = await Promise.allSettled(candidates.map(enrichMovie));
  const movies = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (!movies.length) {
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  return movies;
}

export async function getMovieRecommendation(
  id: number,
  intent: MovieIntent,
): Promise<MovieRecommendation> {
  const movie = await enrichMovie(id);
  return {
    ...movie,
    matchReason: buildMatchReason(intent, movie.genres),
  };
}

export function buildMatchReason(
  intent: MovieIntent,
  genres: string[],
): string {
  const desired = [...intent.requiredGenres, ...intent.preferredGenres].filter(
    (genre) => genres.map((value) => value.toLowerCase()).includes(genre),
  );
  const preferences = intent.preferences.map((preference) => preference.value);
  const details = [...preferences, ...desired].slice(0, 3);
  return details.length
    ? `Matches the brief through ${details.join(", ")}.`
    : "A strong catalogue match with dependable audience support.";
}

export function candidateGenreNames(candidate: MovieCandidate): string[] {
  return genreIdsToNames(candidate.genreIds);
}
