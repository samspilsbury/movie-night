import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoviePrompt } from "@/features/recommendations/components/movie-prompt";

afterEach(cleanup);

describe("MoviePrompt", () => {
  it("associates the visible question and submits with Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onPromptChange = vi.fn();

    const { getByLabelText } = render(
      <MoviePrompt
        prompt="A tense thriller"
        onPromptChange={onPromptChange}
        onSubmit={onSubmit}
      />,
    );

    const field = getByLabelText("What are you in the mood for?");
    expect(field).toBeVisible();

    await user.click(field);
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("allows Shift + Enter without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const { getByLabelText } = render(
      <MoviePrompt
        prompt="A funny mystery"
        onPromptChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(getByLabelText("What are you in the mood for?"));
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
