import type {
  IntentPreference,
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
} from "./types";

export const DISCOVERY_MINIMUM_RATING = 6.2;
export const DISCOVERY_MINIMUM_VOTES = 100;
export const CANDIDATE_POOL_SIZE = 60;
export const PRE_SHORTLIST_SIZE = 12;
export const RECOMMENDATION_COUNT = 5;
export const MINIMUM_RELEVANCE_SCORE = 55;

const GENRE_IDS: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  thriller: 53,
  war: 10752,
  western: 37,
};

export type CandidateGrade = {
  id: number;
  relevanceScore: number;
  matchedCriteria: string[];
  missingPrimaryCriteria: string[];
  contradictions: string[];
  matchReason: string;
};

export function genreNamesToIds(genres: string[]): number[] {
  return genres.flatMap((genre) => {
    const id = GENRE_IDS[genre];
    return id ? [id] : [];
  });
}

export function genreIdsToNames(ids: number[]): string[] {
  const namesById = new Map(
    Object.entries(GENRE_IDS).map(([name, id]) => [id, name]),
  );

  return ids.flatMap((id) => {
    const name = namesById.get(id);
    return name ? [name] : [];
  });
}

function normalise(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function meaningfulWords(value: string): string[] {
  return normalise(value)
    .split(" ")
    .filter(
      (word) => word.length > 2 && !["film", "movie", "with"].includes(word),
    );
}

function textMatches(value: string, corpus: string): boolean {
  const phrase = normalise(value);
  if (!phrase) return false;
  if (corpus.includes(phrase)) return true;
  const words = meaningfulWords(phrase);
  return words.length > 0 && words.every((word) => corpus.includes(word));
}

function preferenceMatch(
  preference: IntentPreference,
  candidate: Pick<
    MovieRecommendation,
    | "title"
    | "overview"
    | "genres"
    | "keywordNames"
    | "productionCountries"
    | "castPopularity"
    | "cast"
  >,
): boolean {
  if (preference.category === "cast") {
    const ensembleRequest = /ensemble|all star|star studded|famous cast/.test(
      normalise(preference.value),
    );
    return ensembleRequest
      ? candidate.cast.length >= 3 && candidate.castPopularity >= 30
      : textMatches(preference.value, normalise(candidate.cast.join(" ")));
  }

  if (preference.category === "setting") {
    return textMatches(
      preference.value,
      normalise(
        [
          candidate.overview,
          ...candidate.keywordNames,
          ...candidate.productionCountries,
        ].join(" "),
      ),
    );
  }

  return textMatches(
    preference.value,
    normalise(
      [
        candidate.title,
        candidate.overview,
        ...candidate.genres,
        ...candidate.keywordNames,
      ].join(" "),
    ),
  );
}

function qualitySignal(
  candidate: Pick<MovieCandidate, "voteAverage" | "voteCount">,
) {
  const globalMean = 6.8;
  const confidence = 400;
  const bayesianRating =
    (candidate.voteCount / (candidate.voteCount + confidence)) *
      candidate.voteAverage +
    (confidence / (candidate.voteCount + confidence)) * globalMean;
  return Math.max(0, Math.min(1, (bayesianRating - 5.5) / 3.5));
}

export function candidateScore(
  candidate: Pick<
    MovieCandidate,
    | "title"
    | "overview"
    | "voteAverage"
    | "voteCount"
    | "popularity"
    | "genreIds"
    | "discoverySources"
  >,
  intent: MovieIntent,
): number {
  const desiredGenreIds = genreNamesToIds([
    ...intent.requiredGenres,
    ...intent.preferredGenres,
  ]);
  const genreCoverage = desiredGenreIds.length
    ? desiredGenreIds.filter((id) => candidate.genreIds.includes(id)).length /
      desiredGenreIds.length
    : 0.5;
  const corpus = normalise(`${candidate.title} ${candidate.overview}`);
  const terms = [
    ...intent.keywordTerms,
    ...intent.preferences.map((preference) => preference.value),
    ...intent.referenceMovies.flatMap((movie) => movie.similarityTraits),
  ];
  const termCoverage = terms.length
    ? terms.filter((term) => textMatches(term, corpus)).length / terms.length
    : 0.5;
  const sourceSignal = Math.min(candidate.discoverySources.length / 3, 1);
  const popularitySignal = Math.min(
    Math.log10(candidate.popularity + 1) / 3,
    1,
  );

  return Number(
    (
      genreCoverage * 38 +
      termCoverage * 27 +
      qualitySignal(candidate) * 25 +
      sourceSignal * 7 +
      popularitySignal * 3
    ).toFixed(3),
  );
}

export function rankCandidatePool(
  candidates: MovieCandidate[],
  intent: MovieIntent,
  excludedIds: Iterable<number>,
): MovieCandidate[] {
  const exclusions = new Set(excludedIds);
  return candidates
    .filter((candidate) => !exclusions.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      score: candidateScore(candidate, intent),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, CANDIDATE_POOL_SIZE);
}

export function failsHardConstraints(
  candidate: MovieRecommendation,
  intent: MovieIntent,
): boolean {
  const requiredGenres = genreNamesToIds(intent.requiredGenres);
  const excludedGenres = genreNamesToIds(intent.excludedGenres);
  const year = candidate.releaseDate
    ? Number(candidate.releaseDate.slice(0, 4))
    : null;

  return (
    requiredGenres.some((id) => !candidate.genreIds.includes(id)) ||
    excludedGenres.some((id) => candidate.genreIds.includes(id)) ||
    (intent.minimumYear !== null &&
      (year === null || year < intent.minimumYear)) ||
    (intent.maximumYear !== null &&
      (year === null || year > intent.maximumYear)) ||
    (intent.maximumRuntimeMinutes !== null &&
      (candidate.runtimeMinutes === null ||
        candidate.runtimeMinutes > intent.maximumRuntimeMinutes)) ||
    (intent.originalLanguage !== null &&
      candidate.originalLanguage !== intent.originalLanguage)
  );
}

export function deterministicGrade(
  candidate: MovieRecommendation,
  intent: MovieIntent,
): CandidateGrade {
  const matchedPreferences = intent.preferences.filter((preference) =>
    preferenceMatch(preference, candidate),
  );
  const primaryPreferences = intent.preferences.filter(
    (preference) => preference.priority === "primary",
  );
  const missingPrimary = primaryPreferences.filter(
    (preference) => !matchedPreferences.includes(preference),
  );
  const desiredGenres = [...intent.requiredGenres, ...intent.preferredGenres];
  const candidateGenres = candidate.genres.map(normalise);
  const matchedGenres = desiredGenres.filter((genre) =>
    candidateGenres.includes(normalise(genre)),
  );
  const preferenceWeight = intent.preferences.reduce(
    (total, preference) => total + (preference.priority === "primary" ? 2 : 1),
    0,
  );
  const matchedWeight = matchedPreferences.reduce(
    (total, preference) => total + (preference.priority === "primary" ? 2 : 1),
    0,
  );
  const preferenceCoverage = preferenceWeight
    ? matchedWeight / preferenceWeight
    : 0.65;
  const genreCoverage = desiredGenres.length
    ? matchedGenres.length / desiredGenres.length
    : 0.65;
  const contradictions = failsHardConstraints(candidate, intent)
    ? ["conflicts with a hard constraint"]
    : [];
  const relevanceScore = contradictions.length
    ? 0
    : Math.round(
        preferenceCoverage * 62 +
          genreCoverage * 23 +
          qualitySignal(candidate) * 12 +
          Math.min(candidate.castPopularity / 100, 1) * 3,
      );
  const matchedCriteria = [
    ...matchedPreferences.map((preference) => preference.value),
    ...matchedGenres,
  ];
  const reason = matchedCriteria.length
    ? `Matches the brief through ${matchedCriteria.slice(0, 3).join(", ")}.`
    : "A strong catalogue match with dependable audience support.";

  return {
    id: candidate.id,
    relevanceScore,
    matchedCriteria,
    missingPrimaryCriteria: missingPrimary.map(
      (preference) => preference.value,
    ),
    contradictions,
    matchReason: reason,
  };
}

export function applyCandidateGrades(
  candidates: MovieRecommendation[],
  intent: MovieIntent,
  grades: CandidateGrade[],
): MovieRecommendation[] {
  const gradesById = new Map(grades.map((grade) => [grade.id, grade]));

  return candidates
    .map((candidate) => {
      const grade =
        gradesById.get(candidate.id) ?? deterministicGrade(candidate, intent);
      const relevanceScore = grade.missingPrimaryCriteria.length
        ? Math.min(grade.relevanceScore, MINIMUM_RELEVANCE_SCORE - 1)
        : grade.relevanceScore;
      const finalScore = grade.contradictions.length
        ? 0
        : relevanceScore * 0.82 + candidate.score * 0.18;
      return {
        ...candidate,
        score: Number(finalScore.toFixed(3)),
        relevanceScore,
        matchedCriteria: grade.matchedCriteria,
        matchReason: grade.matchReason,
      };
    })
    .filter(
      (candidate) =>
        !failsHardConstraints(candidate, intent) &&
        candidate.relevanceScore >= MINIMUM_RELEVANCE_SCORE,
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, RECOMMENDATION_COUNT);
}
