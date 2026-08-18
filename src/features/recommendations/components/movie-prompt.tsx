import type { FormEvent, KeyboardEvent } from "react";

type MoviePromptProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
};

export function MoviePrompt({
  prompt,
  onPromptChange,
  onSubmit,
}: MoviePromptProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="foyer" aria-label="Movie recommendation finder">
      <div className="foyer__spotlights" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="theatre" data-surface="marquee">
        <div className="theatre__crown" aria-hidden="true">
          <span>★</span>
        </div>

        <div className="theatre__title">
          <h1 id="movie-brief-title">What are you in the mood for?</h1>
        </div>

        <div className="marquee">
          <div className="marquee__panel">
            <p className="marquee__now-showing">Now showing</p>

            <form className="movie-form" onSubmit={handleSubmit} noValidate>
              <label className="visually-hidden" htmlFor="movie-brief">
                What are you in the mood for?
              </label>
              <textarea
                id="movie-brief"
                name="movie-brief"
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                rows={3}
                required
                autoFocus
                aria-labelledby="movie-brief-title"
                placeholder="A tense, clever thriller like Inception, under two hours, with a proper ending…"
              />
              <button
                className="feature-button"
                type="submit"
                disabled={!prompt.trim()}
              >
                Find tonight&apos;s film
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        </div>

        <div className="theatre__entrance" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="foyer__carpet" aria-hidden="true" />
    </section>
  );
}
