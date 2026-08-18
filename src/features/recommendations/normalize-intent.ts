import type { IntentPreference, MovieIntent } from "./types";

const TWIST_KEYWORD_PATTERN =
  /plot twist|unexpected twist|unexpected revelation|surprise ending|surprise revelation/;
const TWIST_PREFERENCE_PATTERN =
  /twist|unexpected plot|surprise|reveal|revelation|subvert/;

function normalise(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isTwistPreference(
  preference: IntentPreference,
  hasTwistKeyword: boolean,
): boolean {
  const value = normalise(preference.value);
  return (
    /plot twist|unexpected twist|surprise ending/.test(value) ||
    (hasTwistKeyword && TWIST_PREFERENCE_PATTERN.test(value))
  );
}

export function normalizeMovieIntent(intent: MovieIntent): MovieIntent {
  const hasTwistKeyword = intent.keywordTerms.some((term) =>
    TWIST_KEYWORD_PATTERN.test(normalise(term)),
  );
  const twistPreferences = intent.preferences.filter((preference) =>
    isTwistPreference(preference, hasTwistKeyword),
  );
  if (!twistPreferences.length) return intent;

  const firstTwistIndex = intent.preferences.findIndex((preference) =>
    twistPreferences.includes(preference),
  );
  const canonicalPreference: IntentPreference = {
    category: "theme",
    value: "plot twist",
    priority: twistPreferences.some(
      (preference) => preference.priority === "primary",
    )
      ? "primary"
      : "secondary",
    source: twistPreferences.some(
      (preference) => preference.source === "explicit",
    )
      ? "explicit"
      : "inferred",
  };
  const remainingPreferences = intent.preferences.filter(
    (preference) => !twistPreferences.includes(preference),
  );

  remainingPreferences.splice(firstTwistIndex, 0, canonicalPreference);
  return { ...intent, preferences: remainingPreferences };
}
