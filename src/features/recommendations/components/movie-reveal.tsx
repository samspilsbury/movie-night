import Image from "next/image";
import { useEffect, useRef } from "react";

import type { MovieRecommendation } from "../types";

type MovieRevealProps = {
  movie: MovieRecommendation;
  remaining: number;
  demoMode: boolean;
  onTryAnother: () => void;
  onChangeBrief: () => void;
};

function formatRuntime(minutes: number | null) {
  if (!minutes) return "Runtime unavailable";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function formatVotes(votes: number) {
  return new Intl.NumberFormat("en-GB", { notation: "compact" }).format(votes);
}

function ProviderList({
  label,
  providers,
}: {
  label: string;
  providers: MovieRecommendation["availability"]["stream"];
}) {
  if (!providers.length) return null;

  return (
    <div className="availability-row">
      <dt>{label}</dt>
      <dd>{providers.map((provider) => provider.name).join(" · ")}</dd>
    </div>
  );
}

export function MovieReveal({
  movie,
  remaining,
  demoMode,
  onTryAnother,
  onChangeBrief,
}: MovieRevealProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const year = movie.releaseDate?.slice(0, 4) ?? "Year unavailable";
  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : null;
  const hasAvailability = Object.entries(movie.availability)
    .filter(([key]) => key !== "tmdbUrl")
    .some(([, providers]) => Array.isArray(providers) && providers.length > 0);

  useEffect(() => {
    headingRef.current?.focus();
  }, [movie.id]);

  return (
    <section className="auditorium" aria-labelledby="feature-title">
      <div className="house-lights" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="screen-frame">
        <article className="cinema-screen" data-surface="marquee">
          <div className="feature-poster">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt=""
                width={500}
                height={750}
                sizes="(max-width: 720px) 42vw, 280px"
                priority
              />
            ) : (
              <div className="feature-poster__missing" aria-hidden="true">
                <span>Tonight&apos;s</span>
                <span>Feature</span>
              </div>
            )}
          </div>

          <div className="feature-copy">
            <div className="feature-copy__topline">
              <p className="feature-eyebrow">Tonight&apos;s feature</p>
              {demoMode ? (
                <span className="demo-notice">Demo programme</span>
              ) : null}
            </div>
            <h1 id="feature-title" ref={headingRef} tabIndex={-1}>
              {movie.title}
            </h1>

            <ul className="feature-metadata" aria-label="Movie details">
              <li>{year}</li>
              <li>{formatRuntime(movie.runtimeMinutes)}</li>
              <li className="certificate">
                UK {movie.certification ?? "rating unavailable"}
              </li>
              <li>
                TMDB {movie.voteAverage.toFixed(1)} ·{" "}
                {formatVotes(movie.voteCount)} votes
              </li>
            </ul>

            <p className="match-reason">{movie.matchReason}</p>
            <p className="feature-overview">{movie.overview}</p>

            <dl className="credits">
              {movie.director ? (
                <div>
                  <dt>Directed by</dt>
                  <dd>{movie.director}</dd>
                </div>
              ) : null}
              {movie.cast.length ? (
                <div>
                  <dt>Featuring</dt>
                  <dd>{movie.cast.join(", ")}</dd>
                </div>
              ) : null}
              <div>
                <dt>Programme</dt>
                <dd>{movie.genres.slice(0, 3).join(" · ")}</dd>
              </div>
            </dl>

            <div className="availability">
              <h2>Where to watch in the UK</h2>
              {hasAvailability ? (
                <dl>
                  <ProviderList
                    label="Stream"
                    providers={movie.availability.stream}
                  />
                  <ProviderList
                    label="Free / ads"
                    providers={movie.availability.free}
                  />
                  <ProviderList
                    label="Rent"
                    providers={movie.availability.rent}
                  />
                  <ProviderList
                    label="Buy"
                    providers={movie.availability.buy}
                  />
                </dl>
              ) : (
                <p>No UK availability is listed right now.</p>
              )}
              <p className="availability__source">
                Availability data supplied by JustWatch via TMDB and may change.
              </p>
            </div>

            <div className="feature-actions">
              {movie.availability.tmdbUrl ? (
                <a
                  className="feature-button"
                  href={movie.availability.tmdbUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  See where to watch
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}
              <button
                className="secondary-button"
                type="button"
                onClick={onTryAnother}
              >
                Try another film
                <span aria-hidden="true">
                  {remaining > 0 ? remaining : "↻"}
                </span>
              </button>
              <button
                className="text-button"
                type="button"
                onClick={onChangeBrief}
              >
                Change the brief
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
