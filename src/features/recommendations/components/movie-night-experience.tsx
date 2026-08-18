"use client";

import { useEffect, useRef, useState } from "react";

import { Countdown } from "./countdown";
import { MoviePrompt } from "./movie-prompt";
import { MovieReveal } from "./movie-reveal";
import { PopcornTransition } from "./popcorn-transition";
import { ProgrammeEnd } from "./programme-end";
import type {
  MovieIntent,
  MovieRecommendation,
  RecommendationBatch,
} from "../types";

const SESSION_KEY = "movie-night:recommendation-session:v3";

type View = "prompt" | "loading" | "recommendation" | "programme-end" | "error";

type RecommendationSession = {
  prompt: string;
  intent: MovieIntent;
  recommendations: MovieRecommendation[];
  recommendationIndex: number;
  remainingCandidateIds: number[];
  shownMovieIds: number[];
  referenceExclusionIds: number[];
  demoMode: boolean;
};

type SavedSession = {
  session: RecommendationSession;
  movie: MovieRecommendation;
  view: "recommendation" | "programme-end";
};

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function requestBatch(body: {
  prompt: string | null;
  intent: MovieIntent | null;
  excludedMovieIds: number[];
  candidateIds: number[];
}): Promise<RecommendationBatch> {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      await readError(response, "We couldn't reach the programme."),
    );
  }
  return (await response.json()) as RecommendationBatch;
}

export function MovieNightExperience() {
  const [view, setView] = useState<View>("prompt");
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [endMessage, setEndMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChangingRecommendation, setIsChangingRecommendation] =
    useState(false);
  const [session, setSession] = useState<RecommendationSession | null>(null);
  const [movie, setMovie] = useState<MovieRecommendation | null>(null);
  const recommendationTransitionTimers = useRef<number[]>([]);

  function clearRecommendationTransition() {
    recommendationTransitionTimers.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    recommendationTransitionTimers.current = [];
    setIsChangingRecommendation(false);
  }

  useEffect(() => {
    const restoreSession = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(SESSION_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as SavedSession;
        if (!parsed.session?.intent || !parsed.movie?.id) return;
        setPrompt(parsed.session.prompt);
        setSession(parsed.session);
        setMovie(parsed.movie);
        setView(parsed.view ?? "recommendation");
      } catch {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }, 0);
    return () => window.clearTimeout(restoreSession);
  }, []);

  useEffect(() => {
    if (
      !session ||
      !movie ||
      (view !== "recommendation" && view !== "programme-end")
    ) {
      return;
    }
    const saved: SavedSession = { session, movie, view };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
  }, [session, movie, view]);

  useEffect(
    () => () => {
      recommendationTransitionTimers.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
    },
    [],
  );

  async function startSearch() {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 3) {
      setErrorMessage("Tell us a little about the film you want tonight.");
      setView("error");
      return;
    }

    setView("loading");
    setErrorMessage("");
    setEndMessage("");

    try {
      const batch = await requestBatch({
        prompt: trimmedPrompt,
        intent: null,
        excludedMovieIds: [],
        candidateIds: [],
      });
      if (!batch.recommendations.length) {
        throw new Error(
          "Nothing confidently fits every important part of that brief yet. Try changing one detail.",
        );
      }

      setMovie(batch.recommendations[0]);
      setSession({
        prompt: trimmedPrompt,
        intent: batch.intent,
        recommendations: batch.recommendations,
        recommendationIndex: 0,
        remainingCandidateIds: batch.remainingCandidateIds,
        shownMovieIds: [],
        referenceExclusionIds: batch.referenceExclusionIds,
        demoMode: batch.demoMode,
      });
      setView("recommendation");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't reach the programme. Try again.",
      );
      setView("error");
    }
  }

  function tryAnother() {
    if (!session || !movie || isChangingRecommendation) return;
    const shownMovieIds = [...new Set([...session.shownMovieIds, movie.id])];
    const nextIndex = session.recommendationIndex + 1;

    if (nextIndex < session.recommendations.length) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMovie(session.recommendations[nextIndex]);
        setSession({
          ...session,
          recommendationIndex: nextIndex,
          shownMovieIds,
        });
        return;
      }

      setIsChangingRecommendation(true);
      recommendationTransitionTimers.current = [
        window.setTimeout(() => {
          setMovie(session.recommendations[nextIndex]);
          setSession({
            ...session,
            recommendationIndex: nextIndex,
            shownMovieIds,
          });
        }, 260),
        window.setTimeout(() => {
          recommendationTransitionTimers.current = [];
          setIsChangingRecommendation(false);
        }, 820),
      ];
      return;
    }

    setSession({ ...session, shownMovieIds });
    setEndMessage("");
    setView("programme-end");
  }

  async function searchAgain() {
    if (!session || isRefreshing || !session.remainingCandidateIds.length)
      return;
    setIsRefreshing(true);
    setEndMessage("");

    try {
      const batch = await requestBatch({
        prompt: null,
        intent: session.intent,
        candidateIds: session.remainingCandidateIds,
        excludedMovieIds: [
          ...new Set([
            ...session.shownMovieIds,
            ...session.referenceExclusionIds,
            ...session.recommendations.map(
              (recommendation) => recommendation.id,
            ),
          ]),
        ],
      });

      if (!batch.recommendations.length) {
        setSession({
          ...session,
          remainingCandidateIds: [],
        });
        setEndMessage(
          "We couldn't find another confident batch in this search. Refine the brief to open up a new programme.",
        );
        return;
      }

      setMovie(batch.recommendations[0]);
      setSession({
        ...session,
        recommendations: batch.recommendations,
        recommendationIndex: 0,
        remainingCandidateIds: batch.remainingCandidateIds,
        demoMode: batch.demoMode,
      });
      setView("recommendation");
    } catch (error) {
      setEndMessage(
        error instanceof Error
          ? error.message
          : "We couldn't prepare the next programme. Try again.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  function refinePrompt() {
    clearRecommendationTransition();
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMovie(null);
    setErrorMessage("");
    setEndMessage("");
    setView("prompt");
  }

  return (
    <div className={`cinema-shell cinema-shell--${view}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <button className="wordmark" type="button" onClick={refinePrompt}>
          <span aria-hidden="true">MN</span>
          <span>Movie Night</span>
        </button>
        <p>One good film. No endless scrolling.</p>
      </header>

      <main id="main-content">
        {view === "prompt" ? (
          <MoviePrompt
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={startSearch}
          />
        ) : null}
        {view === "loading" ? (
          <Countdown message="Dimming the house lights…" />
        ) : null}
        {view === "recommendation" && movie && session ? (
          <MovieReveal
            key={movie.id}
            movie={movie}
            remaining={Math.max(
              session.recommendations.length - session.recommendationIndex - 1,
              0,
            )}
            demoMode={session.demoMode}
            isTransitioning={isChangingRecommendation}
            onTryAnother={tryAnother}
            onChangeBrief={refinePrompt}
          />
        ) : null}
        {view === "programme-end" && session ? (
          <ProgrammeEnd
            programmeSize={session.recommendations.length}
            canSearchAgain={session.remainingCandidateIds.length > 0}
            isSearching={isRefreshing}
            message={endMessage}
            onSearchAgain={searchAgain}
            onRefinePrompt={refinePrompt}
          />
        ) : null}
        {view === "error" ? (
          <section className="error-stage" aria-labelledby="error-title">
            <p className="kicker">Programme interrupted</p>
            <h1 id="error-title">We couldn&apos;t find the next feature.</h1>
            <p role="alert">{errorMessage}</p>
            <div className="error-stage__actions">
              <button
                className="feature-button"
                type="button"
                onClick={startSearch}
              >
                Try the search again
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={refinePrompt}
              >
                Change the brief
              </button>
            </div>
          </section>
        ) : null}
      </main>

      {isChangingRecommendation ? <PopcornTransition /> : null}

      <footer className="site-footer">
        <p>
          Movie data and imagery from TMDB. Availability supplied by JustWatch.
        </p>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </footer>
    </div>
  );
}
