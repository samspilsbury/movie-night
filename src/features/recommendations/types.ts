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

export const PREFERENCE_CATEGORIES = [
  "mood",
  "tone",
  "theme",
  "setting",
  "cast",
  "pace",
  "style",
] as const;

export type GenreName = (typeof GENRE_NAMES)[number];
export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number];

export type ReferenceMovie = {
  title: string;
  year: number | null;
  similarityTraits: string[];
};

export type IntentPreference = {
  category: PreferenceCategory;
  value: string;
  priority: "primary" | "secondary";
  source: "explicit" | "inferred";
};

export type MovieIntent = {
  requiredGenres: GenreName[];
  preferredGenres: GenreName[];
  excludedGenres: GenreName[];
  preferences: IntentPreference[];
  keywordTerms: string[];
  castMembers: string[];
  referenceCastMembers: string[];
  productionOriginCountries: string[];
  referenceMovies: ReferenceMovie[];
  minimumYear: number | null;
  maximumYear: number | null;
  maximumRuntimeMinutes: number | null;
  originalLanguage: string | null;
};

export type DiscoverySource =
  "focused" | "keyword" | "cast" | "genre" | "broad";

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
  originalLanguage: string | null;
  discoverySources: DiscoverySource[];
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
  castPopularity: number;
  keywordNames: string[];
  productionCountries: string[];
  relevanceScore: number;
  matchedCriteria: string[];
  matchReason: string;
  availability: WatchAvailability;
};

export type RecommendationBatch = {
  recommendations: MovieRecommendation[];
  remainingRecommendations: MovieRecommendation[];
  remainingCandidateIds: number[];
  intent: MovieIntent;
  referenceExclusionIds: number[];
  demoMode: boolean;
};
