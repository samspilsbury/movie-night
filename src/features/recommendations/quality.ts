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
export const PROGRAMME_FILL_LIMIT = 48;
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

const TWIST_REQUEST_PATTERN =
  /plot twist|unexpected (twist|revelation)|surprise (ending|revelation)/;
const TWIST_EVIDENCE_PATTERN =
  /plot twist|twist ending|surprise ending|unexpected (turn|revelation|place|places|direction)|startling (final )?reveal|hidden truth|discover(s|ed)? the truth|repeating the same day/;
const UNITED_KINGDOM_REQUEST_PATTERN =
  /united kingdom|\buk\b|britain|british|england|scotland|wales|northern ireland/;
const UNITED_KINGDOM_EVIDENCE_PATTERN =
  /united kingdom|\buk\b|britain|british|england|english|london|scotland|scottish|edinburgh|glasgow|wales|welsh|cardiff|northern ireland|belfast/;
const CHICK_FLICK_REQUEST_PATTERN =
  /chick flick|female centred|female centered|women centred|women centered/;
const FEMALE_RELATIONSHIP_EVIDENCE_PATTERN =
  /woman|women|female|girl|sister|mother|daughter|bride/;
const RELATIONSHIP_EVIDENCE_PATTERN =
  /friend|sister|relationship|romance|romantic|love|dating|wedding|marriage/;
const ANCHORMAN_STYLE_REQUEST_PATTERN =
  /anchorman|absurdist|irreverent|newsroom satire|ensemble workplace/;
const IRREVERENT_COMEDY_EVIDENCE_PATTERN =
  /absurd|irreverent|spoof|parody|slapstick|improvis|workplace|newsroom|television|broadcast|ridiculous|raunchy|hilarious/;

function textMatches(value: string, corpus: string): boolean {
  const phrase = normalise(value);
  if (!phrase) return false;
  if (
    TWIST_REQUEST_PATTERN.test(phrase) &&
    TWIST_EVIDENCE_PATTERN.test(corpus)
  ) {
    return true;
  }
  if (
    UNITED_KINGDOM_REQUEST_PATTERN.test(phrase) &&
    UNITED_KINGDOM_EVIDENCE_PATTERN.test(corpus)
  ) {
    return true;
  }
  if (
    CHICK_FLICK_REQUEST_PATTERN.test(phrase) &&
    FEMALE_RELATIONSHIP_EVIDENCE_PATTERN.test(corpus) &&
    RELATIONSHIP_EVIDENCE_PATTERN.test(corpus) &&
    /romance|comedy/.test(corpus)
  ) {
    return true;
  }
  if (
    ANCHORMAN_STYLE_REQUEST_PATTERN.test(phrase) &&
    IRREVERENT_COMEDY_EVIDENCE_PATTERN.test(corpus) &&
    /comedy/.test(corpus)
  ) {
    return true;
  }
  if (corpus.includes(phrase)) return true;
  const words = meaningfulWords(phrase);
  if (words.length > 0 && words.every((word) => corpus.includes(word))) {
    return true;
  }
  const matchingWords = words.filter((word) => corpus.includes(word));
  return (
    words.length >= 3 &&
    matchingWords.length >= 2 &&
    matchingWords.length / words.length >= 2 / 3
  );
}

function preferenceMatch(
  preference: IntentPreference,
  candidate: Pick<
    MovieRecommendation,
    | "title"
    | "overview"
    | "genres"
    | "keywordNames"
    | "castPopularity"
    | "cast"
    | "productionCountries"
  >,
  intent: MovieIntent,
): boolean {
  if (preference.category === "cast") {
    const referenceCast = new Set(intent.referenceCastMembers.map(normalise));
    const hasReferenceCastOverlap = candidate.cast.some((member) =>
      referenceCast.has(normalise(member)),
    );
    if (/similar|same|overlap/.test(normalise(preference.value))) {
      return hasReferenceCastOverlap;
    }
    const ensembleRequest = /ensemble|all star|star studded|famous cast/.test(
      normalise(preference.value),
    );
    return ensembleRequest
      ? candidate.cast.length >= 3 && candidate.castPopularity >= 30
      : textMatches(preference.value, normalise(candidate.cast.join(" ")));
  }

  if (preference.category === "setting") {
    const overview = normalise(candidate.overview);
    const keywords = normalise(candidate.keywordNames.join(" "));
    if (UNITED_KINGDOM_REQUEST_PATTERN.test(normalise(preference.value))) {
      return UNITED_KINGDOM_EVIDENCE_PATTERN.test(keywords);
    }
    return textMatches(preference.value, normalise(`${overview} ${keywords}`));
  }

  const corpus = normalise(
    [
      candidate.title,
      candidate.overview,
      ...candidate.genres,
      ...candidate.keywordNames,
    ].join(" "),
  );
  const anchorsAnchorman = intent.referenceMovies.some((reference) =>
    normalise(reference.title).includes("anchorman"),
  );
  const sharesReferenceCast = candidate.cast.some((member) =>
    intent.referenceCastMembers.map(normalise).includes(normalise(member)),
  );
  if (
    anchorsAnchorman &&
    (preference.category === "style" || preference.category === "tone") &&
    ANCHORMAN_STYLE_REQUEST_PATTERN.test(normalise(preference.value)) &&
    candidate.genres.map(normalise).includes("comedy") &&
    (sharesReferenceCast || IRREVERENT_COMEDY_EVIDENCE_PATTERN.test(corpus))
  ) {
    return true;
  }
  return textMatches(preference.value, corpus);
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
  const corpus = normalise(
    `${candidate.title} ${candidate.overview} ${genreIdsToNames(candidate.genreIds).join(" ")}`,
  );
  const terms = [
    ...intent.keywordTerms,
    ...intent.preferences.map((preference) => preference.value),
    ...intent.referenceMovies.flatMap((movie) => movie.similarityTraits),
  ];
  const termCoverage = terms.length
    ? terms.filter((term) => textMatches(term, corpus)).length / terms.length
    : 0.5;
  const sourceWeights: Record<
    MovieCandidate["discoverySources"][number],
    number
  > = {
    focused: 1,
    cast: 0.9,
    keyword: 0.72,
    genre: 0.45,
    broad: 0.15,
  };
  const strongestSource = Math.max(
    ...candidate.discoverySources.map((source) => sourceWeights[source]),
  );
  const sourceSignal = Math.min(
    strongestSource + Math.max(candidate.discoverySources.length - 1, 0) * 0.08,
    1,
  );
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
  const candidateCast = candidate.cast.map(normalise);

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
      candidate.originalLanguage !== intent.originalLanguage) ||
    intent.castMembers.some(
      (member) => !candidateCast.includes(normalise(member)),
    )
  );
}

export function deterministicGrade(
  candidate: MovieRecommendation,
  intent: MovieIntent,
): CandidateGrade {
  const matchedPreferences = intent.preferences.filter((preference) =>
    preferenceMatch(preference, candidate, intent),
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

export function applyCandidateGradesWithFallback(
  candidates: MovieRecommendation[],
  intent: MovieIntent,
  grades: CandidateGrade[],
): { recommendations: MovieRecommendation[]; usedFallback: boolean } {
  const recommendations = applyCandidateGrades(candidates, intent, grades);
  if (recommendations.length >= RECOMMENDATION_COUNT) {
    return { recommendations, usedFallback: false };
  }

  const deterministicRecommendations = applyCandidateGrades(
    candidates,
    intent,
    candidates.map((candidate) => deterministicGrade(candidate, intent)),
  );
  const recommendationIds = new Set(
    recommendations.map((candidate) => candidate.id),
  );
  const supplemented = [
    ...recommendations,
    ...deterministicRecommendations.filter(
      (candidate) => !recommendationIds.has(candidate.id),
    ),
  ]
    .sort((left, right) => right.score - left.score)
    .slice(0, RECOMMENDATION_COUNT);

  return {
    recommendations: supplemented,
    usedFallback: true,
  };
}
