import type { IntentPreference, MovieIntent } from "./types";

const TWIST_KEYWORD_PATTERN =
  /plot twist|unexpected twist|unexpected revelation|surprise ending|surprise revelation/;
const TWIST_PREFERENCE_PATTERN =
  /twist|unexpected plot|surprise|reveal|revelation|subvert/;
const CHICK_FLICK_PATTERN =
  /chick flick|female centred|female centered|women centred|women centered/;
const UNITED_KINGDOM_PATTERN =
  /united kingdom|\buk\b|britain|british|england|scotland|wales|northern ireland/;

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

function unique<T extends string>(values: T[]): T[] {
  return [
    ...new Map(values.map((value) => [normalise(value), value])).values(),
  ];
}

function castMembersFromPreferences(preferences: IntentPreference[]): string[] {
  return preferences.flatMap((preference) => {
    if (preference.category !== "cast") return [];
    const match = preference.value.match(/^starring\s+(.+)$/i);
    return match?.[1] ? [match[1].trim()] : [];
  });
}

export function normalizeMovieIntent(intent: MovieIntent): MovieIntent {
  const productionOriginCountries = unique(
    intent.productionOriginCountries ?? [],
  ).map((country) => country.toUpperCase());
  const castMembers = unique([
    ...intent.castMembers,
    ...castMembersFromPreferences(intent.preferences),
  ]);
  const castIsUnchanged =
    castMembers.length === intent.castMembers.length &&
    castMembers.every((member, index) => member === intent.castMembers[index]);
  const originsAreUnchanged =
    productionOriginCountries.length ===
      intent.productionOriginCountries.length &&
    productionOriginCountries.every(
      (country, index) => country === intent.productionOriginCountries[index],
    );
  let normalizedIntent: MovieIntent =
    castIsUnchanged &&
    intent.referenceCastMembers.length === 0 &&
    originsAreUnchanged
      ? intent
      : {
          ...intent,
          castMembers,
          referenceCastMembers: [],
          productionOriginCountries,
        };
  const chickFlickPreferences = normalizedIntent.preferences.filter(
    (preference) => CHICK_FLICK_PATTERN.test(normalise(preference.value)),
  );
  if (chickFlickPreferences.length) {
    const firstChickFlickIndex = normalizedIntent.preferences.findIndex(
      (preference) => chickFlickPreferences.includes(preference),
    );
    const remainingPreferences = normalizedIntent.preferences.filter(
      (preference) => !chickFlickPreferences.includes(preference),
    );
    remainingPreferences.splice(firstChickFlickIndex, 0, {
      category: "style",
      value: "female-centred relationships and friendship",
      priority: chickFlickPreferences.some(
        (preference) => preference.priority === "primary",
      )
        ? "primary"
        : "secondary",
      source: chickFlickPreferences.some(
        (preference) => preference.source === "explicit",
      )
        ? "explicit"
        : "inferred",
    });
    const hasUnitedKingdomSetting = remainingPreferences.some(
      (preference) =>
        preference.category === "setting" &&
        UNITED_KINGDOM_PATTERN.test(normalise(preference.value)),
    );
    normalizedIntent = {
      ...normalizedIntent,
      preferredGenres: unique([
        ...normalizedIntent.preferredGenres,
        "romance",
        "comedy",
      ]).filter(
        (genre) => !normalizedIntent.requiredGenres.includes(genre),
      ) as MovieIntent["preferredGenres"],
      preferences: remainingPreferences,
      keywordTerms: unique([
        "female friendship",
        "romantic relationship",
        ...(hasUnitedKingdomSetting
          ? ["London, England", "England", "United Kingdom"]
          : []),
        "chick flick",
        ...normalizedIntent.keywordTerms,
      ]).slice(0, 8),
    };
  }

  const hasTwistKeyword = normalizedIntent.keywordTerms.some((term) =>
    TWIST_KEYWORD_PATTERN.test(normalise(term)),
  );
  const twistPreferences = normalizedIntent.preferences.filter((preference) =>
    isTwistPreference(preference, hasTwistKeyword),
  );
  if (!twistPreferences.length) return normalizedIntent;

  const firstTwistIndex = normalizedIntent.preferences.findIndex((preference) =>
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
  const remainingPreferences = normalizedIntent.preferences.filter(
    (preference) => !twistPreferences.includes(preference),
  );

  remainingPreferences.splice(firstTwistIndex, 0, canonicalPreference);
  return {
    ...normalizedIntent,
    preferences: remainingPreferences,
    keywordTerms: unique([
      "plot twist",
      "twist ending",
      ...normalizedIntent.keywordTerms,
    ]).slice(0, 8),
  };
}
