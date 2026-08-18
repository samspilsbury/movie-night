import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
  WatchProvider,
} from "@/features/recommendations/types";
import {
  genreIdsToNames,
  genreNamesToIds,
  QUALITY_STAGES,
  rankCandidates,
} from "@/features/recommendations/quality";
import { getServerEnv } from "@/lib/env";
import { ProviderError } from "@/lib/provider-error";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

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
  belongs_to_collection: { id: number } | null;
  credits?: {
    cast: Array<{ name: string; order: number }>;
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
  if (!TMDB_API_TOKEN) {
    throw new Error("TMDB_API_TOKEN is not configured.");
  }

  const url = new URL(`${TMDB_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_API_TOKEN}`,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12_000),
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
    const expectedYear = String(reference.year);
    const exactYearAndTitle = titleMatches.find((movie) =>
      movie.release_date?.startsWith(expectedYear),
    );
    if (exactYearAndTitle) return exactYearAndTitle;
  }

  return titleMatches[0] ?? results[0] ?? null;
}

function toCandidate(movie: TmdbDiscoverMovie): MovieCandidate {
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
    score: 0,
  };
}

async function resolveKeywordIds(terms: string[]): Promise<number[]> {
  const results = await Promise.all(
    terms.slice(0, 6).map(async (term) => {
      const response = await tmdbFetch<{
        results: Array<{ id: number; name: string }>;
      }>("/search/keyword", { query: term, page: 1 });

      return response.results[0]?.id ?? null;
    }),
  );

  return results.filter((id): id is number => id !== null);
}

export async function resolveReferenceExclusions(
  intent: MovieIntent,
): Promise<number[]> {
  const exclusionGroups = await Promise.all(
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
      if (!match) return [];

      const details = await tmdbFetch<TmdbDetails>(`/movie/${match.id}`, {
        language: "en-GB",
      });

      if (!details.belongs_to_collection) return [match.id];

      const collection = await tmdbFetch<{
        parts: Array<{ id: number }>;
      }>(`/collection/${details.belongs_to_collection.id}`, {
        language: "en-GB",
      });

      return [match.id, ...collection.parts.map((part) => part.id)];
    }),
  );

  return [...new Set(exclusionGroups.flat())];
}

export async function discoverMovies(
  intent: MovieIntent,
  qualityStage: number,
  excludedIds: number[],
): Promise<MovieCandidate[]> {
  const quality = QUALITY_STAGES[qualityStage] ?? QUALITY_STAGES[0];
  const keywordIds = await resolveKeywordIds(intent.keywordTerms);
  const includedGenreIds = genreNamesToIds(intent.includedGenres);
  const excludedGenreIds = genreNamesToIds(intent.excludedGenres);
  const today = new Date().toISOString().slice(0, 10);
  const requestedMaximumDate = intent.maximumYear
    ? `${intent.maximumYear}-12-31`
    : today;
  const maximumReleaseDate =
    requestedMaximumDate < today ? requestedMaximumDate : today;

  const response = await tmdbFetch<{ results: TmdbDiscoverMovie[] }>(
    "/discover/movie",
    {
      include_adult: true,
      include_video: false,
      language: "en-GB",
      page: 1,
      sort_by: "vote_average.desc",
      "vote_average.gte": quality.minimumRating,
      "vote_count.gte": quality.minimumVotes,
      with_genres: includedGenreIds.join("|"),
      without_genres: excludedGenreIds.join(","),
      with_keywords: keywordIds.join("|"),
      "primary_release_date.gte": intent.minimumYear
        ? `${intent.minimumYear}-01-01`
        : undefined,
      "primary_release_date.lte": maximumReleaseDate,
      "with_runtime.lte": intent.maximumRuntimeMinutes ?? undefined,
      with_original_language: intent.originalLanguage ?? undefined,
    },
  );

  return rankCandidates(
    response.results.map(toCandidate),
    intent,
    quality.minimumVotes,
    excludedIds,
  );
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

export function buildMatchReason(
  intent: MovieIntent,
  genres: string[],
): string {
  const details: string[] = [];
  if (intent.moods.length) {
    details.push(intent.moods.slice(0, 2).join(" and "));
  }

  const matchedGenres = intent.includedGenres.filter((genre) =>
    genres.map((value) => value.toLowerCase()).includes(genre),
  );
  if (matchedGenres.length) {
    details.push(matchedGenres.slice(0, 2).join(" and "));
  }

  if (intent.maximumRuntimeMinutes) {
    details.push(`under ${intent.maximumRuntimeMinutes} minutes`);
  }

  if (details.length === 0) {
    return "A highly rated film selected to fit tonight's brief.";
  }

  const [first, ...rest] = details;
  const joined = [first, ...rest].join(", ");
  return `A highly rated match for the ${joined} film you described.`;
}

export async function getMovieRecommendation(
  id: number,
  intent: MovieIntent,
): Promise<MovieRecommendation> {
  const { region } = getServerEnv();
  const details = await tmdbFetch<TmdbDetails>(`/movie/${id}`, {
    language: "en-GB",
    append_to_response: "credits,release_dates,watch/providers",
  });

  const regionalProviders = details["watch/providers"]?.results[region];
  const genres = details.genres.map((genre) => genre.name);
  const director = details.credits?.crew.find(
    (person) => person.job === "Director",
  )?.name;

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
    score: 0,
    runtimeMinutes: details.runtime,
    certification: findCertification(details, region),
    genres,
    director: director ?? null,
    cast:
      details.credits?.cast
        .sort((left, right) => left.order - right.order)
        .slice(0, 3)
        .map((person) => person.name) ?? [],
    matchReason: buildMatchReason(intent, genres),
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

export function candidateGenreNames(candidate: MovieCandidate): string[] {
  return genreIdsToNames(candidate.genreIds);
}
