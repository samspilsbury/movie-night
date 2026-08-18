export const GENRE_NAMES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "documentary",
  "drama",
  "family",
  "fantasy",
  "history",
  "horror",
  "music",
  "mystery",
  "romance",
  "science fiction",
  "thriller",
  "war",
  "western",
] as const;

export type GenreName = (typeof GENRE_NAMES)[number];

export type ReferenceMovie = {
  title: string;
  year: number | null;
};

export type MovieIntent = {
  includedGenres: GenreName[];
  excludedGenres: GenreName[];
  moods: string[];
  keywordTerms: string[];
  referenceMovies: ReferenceMovie[];
  minimumYear: number | null;
  maximumYear: number | null;
  maximumRuntimeMinutes: number | null;
  originalLanguage: string | null;
};

export type MovieCandidate = {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  genreIds: number[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
  score: number;
};

export type WatchProvider = {
  id: number;
  name: string;
  logoPath: string | null;
};

export type WatchAvailability = {
  stream: WatchProvider[];
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  tmdbUrl: string | null;
};

export type MovieRecommendation = MovieCandidate & {
  runtimeMinutes: number | null;
  certification: string | null;
  genres: string[];
  director: string | null;
  cast: string[];
  matchReason: string;
  availability: WatchAvailability;
};

export type RecommendationBatch = {
  candidates: MovieCandidate[];
  intent: MovieIntent;
  referenceExclusionIds: number[];
  qualityStage: number;
  qualityLabel: string;
  demoMode: boolean;
};
