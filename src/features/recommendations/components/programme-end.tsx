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
        <span>Programme complete</span>
        <span>
          {String(programmeSize).padStart(2, "0")}{" "}
          {programmeSize === 1 ? "film" : "films"}
        </span>
      </div>
      <div className="programme-end__copy">
        <p className="kicker">
          {programmeSize === 1
            ? "That was the only confident match in this batch"
            : `You've seen all ${programmeSize} films in this batch`}
        </p>
        <h1 id="programme-end-title" ref={headingRef} tabIndex={-1}>
          {canSearchAgain ? "Ready for five more?" : "Try a broader brief?"}
        </h1>
        <p>
          {canSearchAgain
            ? "Choose another five from the same search, or refine your brief and start fresh."
            : "There are no more confident matches in this search. Refine your brief to start fresh."}
        </p>
        {message ? (
          <p className="programme-end__message" role="status">
            {message}
          </p>
        ) : null}
        <div className="programme-end__actions">
          {canSearchAgain ? (
            <button
              className="feature-button"
              type="button"
              disabled={isSearching}
              onClick={onSearchAgain}
            >
              {isSearching ? "Preparing five more…" : "Find five more films"}
            </button>
          ) : null}
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
