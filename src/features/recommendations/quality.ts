import type { MovieCandidate, MovieIntent } from "./types";

export const QUALITY_STAGES = [
  { label: "Strict", minimumRating: 7.2, minimumVotes: 500 },
  { label: "Lower vote floor", minimumRating: 7.2, minimumVotes: 200 },
  { label: "Broader", minimumRating: 6.8, minimumVotes: 200 },
  { label: "Niche fallback", minimumRating: 6.5, minimumVotes: 75 },
] as const;

export const QUEUE_SIZE = 8;

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

export function candidateScore(
  candidate: Pick<
    MovieCandidate,
    "voteAverage" | "voteCount" | "popularity" | "genreIds"
  >,
  intent: MovieIntent,
  minimumVotes: number,
): number {
  const globalMean = 6.8;
  const confidenceRating =
    (candidate.voteCount / (candidate.voteCount + minimumVotes)) *
      candidate.voteAverage +
    (minimumVotes / (candidate.voteCount + minimumVotes)) * globalMean;

  const desiredGenreIds = genreNamesToIds(intent.includedGenres);
  const genreMatch = desiredGenreIds.length
    ? desiredGenreIds.filter((id) => candidate.genreIds.includes(id)).length /
      desiredGenreIds.length
    : 0.5;

  const popularitySignal = Math.min(
    Math.log10(candidate.popularity + 1) / 3,
    1,
  );

  return Number(
    (
      confidenceRating * 0.78 +
      genreMatch * 1.5 +
      popularitySignal * 0.35
    ).toFixed(4),
  );
}

export function rankCandidates(
  candidates: MovieCandidate[],
  intent: MovieIntent,
  minimumVotes: number,
  excludedIds: Iterable<number>,
): MovieCandidate[] {
  const exclusions = new Set(excludedIds);

  return candidates
    .filter((candidate) => !exclusions.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      score: candidateScore(candidate, intent, minimumVotes),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, QUEUE_SIZE);
}
