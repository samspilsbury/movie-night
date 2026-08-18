import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
} from "@/features/recommendations/types";
import { rankCandidatePool } from "@/features/recommendations/quality";
import { buildMatchReason } from "@/lib/tmdb/client";

const BASE_MOVIES: Array<
  Omit<
    MovieRecommendation,
    | "score"
    | "matchReason"
    | "availability"
    | "posterPath"
    | "backdropPath"
    | "originalLanguage"
    | "discoverySources"
    | "castPopularity"
    | "keywordNames"
    | "productionCountries"
    | "relevanceScore"
    | "matchedCriteria"
  > & {
    posterPath: string | null;
    backdropPath: string | null;
    availability: MovieRecommendation["availability"];
  }
> = [
  {
    id: 329865,
    title: "Arrival",
    originalTitle: "Arrival",
    overview:
      "A linguist works with the military to communicate with alien lifeforms after mysterious spacecraft appear around the world.",
    releaseDate: "2016-11-10",
    posterPath: "/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    backdropPath: "/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg",
    genreIds: [18, 878, 9648],
    voteAverage: 7.6,
    voteCount: 18420,
    popularity: 68,
    runtimeMinutes: 116,
    certification: "12",
    genres: ["Drama", "Science Fiction", "Mystery"],
    director: "Denis Villeneuve",
    cast: ["Amy Adams", "Jeremy Renner", "Forest Whitaker"],
    availability: {
      stream: [{ id: 8, name: "Netflix", logoPath: null }],
      free: [],
      rent: [
        { id: 10, name: "Amazon Video", logoPath: null },
        { id: 2, name: "Apple TV", logoPath: null },
      ],
      buy: [{ id: 2, name: "Apple TV", logoPath: null }],
      tmdbUrl: "https://www.themoviedb.org/movie/329865/watch?locale=GB",
    },
  },
  {
    id: 76341,
    title: "Mad Max: Fury Road",
    originalTitle: "Mad Max: Fury Road",
    overview:
      "In a ruined wasteland, Max joins Furiosa and a band of rebels fleeing a tyrant in a roaring war rig.",
    releaseDate: "2015-05-13",
    posterPath: "/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
    backdropPath: "/nlCHUWjY9XWbuEUQauCBgnY8ymF.jpg",
    genreIds: [28, 12, 878],
    voteAverage: 7.6,
    voteCount: 23000,
    popularity: 74,
    runtimeMinutes: 121,
    certification: "15",
    genres: ["Action", "Adventure", "Science Fiction"],
    director: "George Miller",
    cast: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult"],
    availability: {
      stream: [],
      free: [],
      rent: [{ id: 10, name: "Amazon Video", logoPath: null }],
      buy: [
        { id: 10, name: "Amazon Video", logoPath: null },
        { id: 2, name: "Apple TV", logoPath: null },
      ],
      tmdbUrl: "https://www.themoviedb.org/movie/76341/watch?locale=GB",
    },
  },
  {
    id: 496243,
    title: "Parasite",
    originalTitle: "기생충",
    overview:
      "A struggling family schemes its way into the home of a wealthy household, with consequences no one can control.",
    releaseDate: "2019-05-30",
    posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdropPath: "/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg",
    genreIds: [35, 53, 18],
    voteAverage: 8.5,
    voteCount: 19000,
    popularity: 82,
    runtimeMinutes: 133,
    certification: "15",
    genres: ["Comedy", "Thriller", "Drama"],
    director: "Bong Joon Ho",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"],
    availability: {
      stream: [{ id: 9, name: "BFI Player", logoPath: null }],
      free: [],
      rent: [{ id: 10, name: "Amazon Video", logoPath: null }],
      buy: [{ id: 2, name: "Apple TV", logoPath: null }],
      tmdbUrl: "https://www.themoviedb.org/movie/496243/watch?locale=GB",
    },
  },
  {
    id: 38,
    title: "Eternal Sunshine of the Spotless Mind",
    originalTitle: "Eternal Sunshine of the Spotless Mind",
    overview:
      "After a painful breakup, two former lovers erase each other from their memories and discover what they are losing.",
    releaseDate: "2004-03-19",
    posterPath: "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    backdropPath: "/7xQk3HdCvkNmk3gblDGn9fVnbsT.jpg",
    genreIds: [878, 18, 10749],
    voteAverage: 8.1,
    voteCount: 15000,
    popularity: 57,
    runtimeMinutes: 108,
    certification: "15",
    genres: ["Science Fiction", "Drama", "Romance"],
    director: "Michel Gondry",
    cast: ["Jim Carrey", "Kate Winslet", "Kirsten Dunst"],
    availability: {
      stream: [],
      free: [],
      rent: [{ id: 10, name: "Amazon Video", logoPath: null }],
      buy: [{ id: 2, name: "Apple TV", logoPath: null }],
      tmdbUrl: "https://www.themoviedb.org/movie/38/watch?locale=GB",
    },
  },
  {
    id: 546554,
    title: "Knives Out",
    originalTitle: "Knives Out",
    overview:
      "A celebrated crime novelist's death brings an eccentric detective and one deeply suspicious family together.",
    releaseDate: "2019-11-27",
    posterPath: "/pThyQovXQrw2m0s9x82twj48Jq4.jpg",
    backdropPath: "/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg",
    genreIds: [35, 80, 9648],
    voteAverage: 7.8,
    voteCount: 13000,
    popularity: 63,
    runtimeMinutes: 131,
    certification: "12",
    genres: ["Comedy", "Crime", "Mystery"],
    director: "Rian Johnson",
    cast: ["Daniel Craig", "Ana de Armas", "Chris Evans"],
    availability: {
      stream: [{ id: 8, name: "Netflix", logoPath: null }],
      free: [],
      rent: [],
      buy: [],
      tmdbUrl: "https://www.themoviedb.org/movie/546554/watch?locale=GB",
    },
  },
  {
    id: 244786,
    title: "Whiplash",
    originalTitle: "Whiplash",
    overview:
      "An ambitious young drummer enters a brutal battle of wills with a demanding conservatory instructor.",
    releaseDate: "2014-10-10",
    posterPath: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    backdropPath: "/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg",
    genreIds: [18, 10402],
    voteAverage: 8.4,
    voteCount: 16000,
    popularity: 71,
    runtimeMinutes: 107,
    certification: "15",
    genres: ["Drama", "Music"],
    director: "Damien Chazelle",
    cast: ["Miles Teller", "J.K. Simmons", "Paul Reiser"],
    availability: {
      stream: [{ id: 337, name: "Disney Plus", logoPath: null }],
      free: [],
      rent: [{ id: 10, name: "Amazon Video", logoPath: null }],
      buy: [{ id: 2, name: "Apple TV", logoPath: null }],
      tmdbUrl: "https://www.themoviedb.org/movie/244786/watch?locale=GB",
    },
  },
  {
    id: 264644,
    title: "Room",
    originalTitle: "Room",
    overview:
      "A mother creates a complete world for her young son inside the small room where they are held captive.",
    releaseDate: "2015-10-16",
    posterPath: "/pCURNjeomWbMSdiP64gj8NVVHTQ.jpg",
    backdropPath: "/tBhp8MGaiL3BXpPCSl5xY397sGH.jpg",
    genreIds: [18, 53],
    voteAverage: 8.0,
    voteCount: 9500,
    popularity: 44,
    runtimeMinutes: 118,
    certification: "15",
    genres: ["Drama", "Thriller"],
    director: "Lenny Abrahamson",
    cast: ["Brie Larson", "Jacob Tremblay", "Joan Allen"],
    availability: {
      stream: [],
      free: [],
      rent: [{ id: 10, name: "Amazon Video", logoPath: null }],
      buy: [{ id: 2, name: "Apple TV", logoPath: null }],
      tmdbUrl: "https://www.themoviedb.org/movie/264644/watch?locale=GB",
    },
  },
  {
    id: 508442,
    title: "Soul",
    originalTitle: "Soul",
    overview:
      "A jazz musician on the brink of his big break must find his way back to Earth after an unexpected detour.",
    releaseDate: "2020-12-25",
    posterPath: "/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg",
    backdropPath: "/kf456ZqeC45XTvo6W9pW5clYKfQ.jpg",
    genreIds: [16, 10751, 35, 14],
    voteAverage: 8.1,
    voteCount: 11000,
    popularity: 51,
    runtimeMinutes: 101,
    certification: "PG",
    genres: ["Animation", "Family", "Comedy", "Fantasy"],
    director: "Pete Docter",
    cast: ["Jamie Foxx", "Tina Fey", "Graham Norton"],
    availability: {
      stream: [{ id: 337, name: "Disney Plus", logoPath: null }],
      free: [],
      rent: [],
      buy: [],
      tmdbUrl: "https://www.themoviedb.org/movie/508442/watch?locale=GB",
    },
  },
];

export function demoIntent(prompt: string): MovieIntent {
  const lower = prompt.toLowerCase();
  const genrePairs: Array<[MovieIntent["preferredGenres"][number], string[]]> =
    [
      ["action", ["action", "explosive"]],
      ["comedy", ["comedy", "funny", "laugh"]],
      ["drama", ["drama", "emotional"]],
      ["horror", ["horror", "scary"]],
      ["mystery", ["mystery", "whodunnit"]],
      ["romance", ["romance", "romantic"]],
      ["science fiction", ["sci-fi", "science fiction", "space"]],
      ["thriller", ["thriller", "tense"]],
    ];

  const preferredGenres = genrePairs
    .filter(([, terms]) => terms.some((term) => lower.includes(term)))
    .map(([genre]) => genre);

  const referenceMovies = BASE_MOVIES.filter((movie) =>
    lower.includes(movie.title.toLowerCase()),
  ).map((movie) => ({
    title: movie.title,
    year: movie.releaseDate ? Number(movie.releaseDate.slice(0, 4)) : null,
    similarityTraits: [],
  }));

  return {
    requiredGenres: [],
    preferredGenres,
    excludedGenres: [],
    preferences: [
      {
        category: "mood",
        value: lower.includes("tense")
          ? "tense"
          : lower.includes("comfort")
            ? "comforting"
            : "absorbing",
        priority: "primary",
        source: "explicit",
      },
    ],
    keywordTerms: [],
    castMembers: [],
    referenceCastMembers: [],
    productionOriginCountries: [],
    referenceMovies,
    minimumYear: null,
    maximumYear: null,
    maximumRuntimeMinutes: lower.includes("under two hours") ? 120 : null,
    originalLanguage: null,
  };
}

export function getDemoCandidates(
  intent: MovieIntent,
  excludedIds: number[],
): MovieCandidate[] {
  const references = new Set(
    intent.referenceMovies.map((reference) => reference.title.toLowerCase()),
  );
  const candidates: MovieCandidate[] = BASE_MOVIES.filter(
    (movie) => !references.has(movie.title.toLowerCase()),
  ).map((movie) => ({
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    releaseDate: movie.releaseDate,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    genreIds: movie.genreIds,
    voteAverage: movie.voteAverage,
    voteCount: movie.voteCount,
    popularity: movie.popularity,
    originalLanguage: "en",
    discoverySources: ["broad"],
    score: 0,
  }));

  return rankCandidatePool(candidates, intent, excludedIds);
}

export function getDemoMovie(
  id: number,
  intent: MovieIntent,
): MovieRecommendation | null {
  const movie = BASE_MOVIES.find((candidate) => candidate.id === id);
  if (!movie) return null;

  return {
    ...movie,
    originalLanguage: "en",
    discoverySources: ["broad"],
    score: 0,
    castPopularity: 80,
    keywordNames: movie.genres.map((genre) => genre.toLowerCase()),
    productionCountries: ["United States of America", "US"],
    relevanceScore: 70,
    matchedCriteria: intent.preferences.map((preference) => preference.value),
    matchReason: buildMatchReason(intent, movie.genres),
  };
}
