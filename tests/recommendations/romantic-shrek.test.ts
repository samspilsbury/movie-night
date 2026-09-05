import { describe, expect, it } from "vitest";

import {
  getRomanticShrekBatch,
  isRomanticShrekPrompt,
  ROMANTIC_SHREK_COUNTDOWN_SECONDS,
} from "@/features/recommendations/easter-eggs/romantic-shrek";

describe("romantic Shrek easter egg", () => {
  it("returns Shrek with a three-count for the exact prompt", () => {
    const batch = getRomanticShrekBatch("something romantic");

    expect(isRomanticShrekPrompt("something romantic")).toBe(true);
    expect(ROMANTIC_SHREK_COUNTDOWN_SECONDS).toBe(3);
    expect(batch?.recommendations[0]).toMatchObject({
      id: 808,
      title: "Shrek",
      certification: "U",
      runtimeMinutes: 90,
    });
  });

  it("does not intercept other prompts", () => {
    expect(getRomanticShrekBatch("Something romantic")).toBeNull();
    expect(getRomanticShrekBatch("something very romantic")).toBeNull();
  });
});
