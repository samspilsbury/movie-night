import { useEffect, useRef } from "react";

type ProgrammeEndProps = {
  programmeSize: number;
  canSearchAgain: boolean;
  isSearching: boolean;
  message: string;
  onSearchAgain: () => void;
  onRefinePrompt: () => void;
};

export function ProgrammeEnd({
  programmeSize,
  canSearchAgain,
  isSearching,
  message,
  onSearchAgain,
  onRefinePrompt,
}: ProgrammeEndProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="programme-end" aria-labelledby="programme-end-title">
      <div className="programme-end__ticket" aria-hidden="true">
        <span>End of programme</span>
        <span>{String(programmeSize).padStart(2, "0")} / 05</span>
      </div>
      <div className="programme-end__copy">
        <p className="kicker">
          You&apos;ve seen tonight&apos;s{" "}
          {programmeSize === 1 ? "film" : `${programmeSize} films`}
        </p>
        <h1 id="programme-end-title" ref={headingRef} tabIndex={-1}>
          Shall we look again?
        </h1>
        <p>
          Search the unused films from this programme, or refine your brief and
          start with a fresh slate.
        </p>
        {message ? (
          <p className="programme-end__message" role="status">
            {message}
          </p>
        ) : null}
        <div className="programme-end__actions">
          <button
            className="feature-button"
            type="button"
            disabled={!canSearchAgain || isSearching}
            onClick={onSearchAgain}
          >
            {isSearching
              ? "Preparing the next five…"
              : "Search this programme again"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onRefinePrompt}
          >
            Refine the prompt
          </button>
        </div>
      </div>
    </section>
  );
}
