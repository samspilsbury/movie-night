"use client";

import { useEffect, useState } from "react";

import { Countdown } from "./countdown";
import { MoviePrompt } from "./movie-prompt";
import { MovieReveal } from "./movie-reveal";
import type {
  MovieCandidate,
  MovieIntent,
  MovieRecommendation,
  RecommendationBatch,
} from "../types";

const SESSION_KEY = "movie-night:recommendation-session:v1";
const LAST_QUALITY_STAGE = 3;

type View = "prompt" | "loading" | "recommendation" | "error";

type RecommendationSession = {
  prompt: string;
  intent: MovieIntent;
  candidates: MovieCandidate[];
  candidateIndex: number;
  shownMovieIds: number[];
  referenceExclusionIds: number[];
  qualityStage: number;
  demoMode: boolean;
};

type SavedSession = {
  session: RecommendationSession;
  movie: MovieRecommendation;
};

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function requestMovie(
  candidate: MovieCandidate,
  intent: MovieIntent,
): Promise<MovieRecommendation> {
  const response = await fetch(`/api/movies/${candidate.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "We couldn't load this film."));
  }

  const payload = (await response.json()) as { movie: MovieRecommendation };
  return payload.movie;
}

async function requestBatchAcrossStages({
  prompt,
  intent,
  excludedMovieIds,
  startStage,
}: {
  prompt: string | null;
  intent: MovieIntent | null;
  excludedMovieIds: number[];
  startStage: number;
}): Promise<RecommendationBatch> {
  let currentIntent = intent;
  let stage = startStage;
  let accumulatedReferenceIds: number[] = [];
  let exclusions = [...excludedMovieIds];
  let lastBatch: RecommendationBatch | null = null;

  while (stage <= LAST_QUALITY_STAGE) {
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: currentIntent ? null : prompt,
        intent: currentIntent,
        excludedMovieIds: exclusions,
        qualityStage: stage,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await readError(response, "We couldn't reach the programme."),
      );
    }

    const batch = (await response.json()) as RecommendationBatch;
    lastBatch = batch;
    currentIntent = batch.intent;
    accumulatedReferenceIds = [
      ...new Set([...accumulatedReferenceIds, ...batch.referenceExclusionIds]),
    ];
    exclusions = [...new Set([...exclusions, ...accumulatedReferenceIds])];

    if (batch.candidates.length) {
      return {
        ...batch,
        referenceExclusionIds: accumulatedReferenceIds,
      };
    }

    stage += 1;
  }

  if (!lastBatch) {
    throw new Error("Nothing fits every part of tonight's brief yet.");
  }

  return {
    ...lastBatch,
    referenceExclusionIds: accumulatedReferenceIds,
  };
}

export function MovieNightExperience() {
  const [view, setView] = useState<View>("prompt");
  const [prompt, setPrompt] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(
    "Dimming the house lights…",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [session, setSession] = useState<RecommendationSession | null>(null);
  const [movie, setMovie] = useState<MovieRecommendation | null>(null);

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
        setView("recommendation");
      } catch {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }, 0);

    return () => window.clearTimeout(restoreSession);
  }, []);

  useEffect(() => {
    if (!session || !movie) return;
    const saved: SavedSession = { session, movie };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
  }, [session, movie]);

  async function startSearch() {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 3) {
      setErrorMessage("Tell us a little about the film you want tonight.");
      setView("error");
      return;
    }

    setLoadingMessage("Dimming the house lights…");
    setView("loading");
    setErrorMessage("");

    try {
      const countdown = delay(1350);
      const batch = await requestBatchAcrossStages({
        prompt: trimmedPrompt,
        intent: null,
        excludedMovieIds: [],
        startStage: 0,
      });

      if (!batch.candidates.length) {
        throw new Error(
          "Nothing fits every part of that brief yet. Try changing one detail.",
        );
      }

      const firstMovie = await requestMovie(batch.candidates[0], batch.intent);
      await countdown;

      setMovie(firstMovie);
      setSession({
        prompt: trimmedPrompt,
        intent: batch.intent,
        candidates: batch.candidates,
        candidateIndex: 0,
        shownMovieIds: [],
        referenceExclusionIds: batch.referenceExclusionIds,
        qualityStage: batch.qualityStage,
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

  async function tryAnother() {
    if (!session || !movie) return;

    const shownMovieIds = [...new Set([...session.shownMovieIds, movie.id])];
    const nextIndex = session.candidateIndex + 1;
    setLoadingMessage("Changing the programme…");
    setView("loading");

    try {
      const transition = delay(650);

      if (nextIndex < session.candidates.length) {
        const nextMovie = await requestMovie(
          session.candidates[nextIndex],
          session.intent,
        );
        await transition;
        setMovie(nextMovie);
        setSession({
          ...session,
          candidateIndex: nextIndex,
          shownMovieIds,
        });
        setView("recommendation");
        return;
      }

      const nextStage = session.qualityStage + 1;
      if (nextStage > LAST_QUALITY_STAGE) {
        throw new Error(
          "That was the end of tonight's programme. Change the brief and we'll start fresh.",
        );
      }

      const excludedMovieIds = [
        ...new Set([
          ...shownMovieIds,
          ...session.referenceExclusionIds,
          ...session.candidates.map((candidate) => candidate.id),
        ]),
      ];
      const batch = await requestBatchAcrossStages({
        prompt: null,
        intent: session.intent,
        excludedMovieIds,
        startStage: nextStage,
      });

      if (!batch.candidates.length) {
        throw new Error(
          "That was the end of tonight's programme. Change the brief and we'll start fresh.",
        );
      }

      const nextMovie = await requestMovie(batch.candidates[0], session.intent);
      await transition;
      setMovie(nextMovie);
      setSession({
        ...session,
        candidates: batch.candidates,
        candidateIndex: 0,
        shownMovieIds,
        qualityStage: batch.qualityStage,
        demoMode: batch.demoMode,
      });
      setView("recommendation");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't change the programme. Try again.",
      );
      setView("error");
    }
  }

  function changeBrief() {
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMovie(null);
    setErrorMessage("");
    setView("prompt");
  }

  return (
    <div className={`cinema-shell cinema-shell--${view}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <button className="wordmark" type="button" onClick={changeBrief}>
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

        {view === "loading" ? <Countdown message={loadingMessage} /> : null}

        {view === "recommendation" && movie && session ? (
          <MovieReveal
            movie={movie}
            remaining={Math.max(
              session.candidates.length - session.candidateIndex - 1,
              0,
            )}
            demoMode={session.demoMode}
            onTryAnother={tryAnother}
            onChangeBrief={changeBrief}
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
                onClick={changeBrief}
              >
                Change the brief
              </button>
            </div>
          </section>
        ) : null}
      </main>

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
