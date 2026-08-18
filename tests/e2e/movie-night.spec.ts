import { expect, test } from "@playwright/test";

const intent = {
  requiredGenres: ["thriller"],
  preferredGenres: [],
  excludedGenres: [],
  castMembers: [],
  referenceCastMembers: [],
  productionOriginCountries: [],
  preferences: [
    {
      category: "mood",
      value: "tense",
      priority: "primary",
      source: "explicit",
    },
  ],
  keywordTerms: [],
  referenceMovies: [],
  minimumYear: null,
  maximumYear: null,
  maximumRuntimeMinutes: 120,
  originalLanguage: null,
};

function recommendation(id: number, title: string) {
  return {
    id,
    title,
    originalTitle: title,
    overview: `${title} is a tense mystery selected for tonight.`,
    releaseDate: "2020-01-01",
    posterPath: null,
    backdropPath: null,
    genreIds: [53],
    voteAverage: 7.6,
    voteCount: 10_000,
    popularity: 60,
    originalLanguage: "en",
    discoverySources: ["focused"],
    score: 90,
    runtimeMinutes: 110,
    certification: "15",
    genres: ["Thriller"],
    director: "A Director",
    cast: ["Actor One", "Actor Two", "Actor Three"],
    castPopularity: 90,
    keywordNames: ["mystery"],
    productionCountries: ["United Kingdom", "GB"],
    relevanceScore: 88,
    matchedCriteria: ["tense"],
    matchReason: "Its tense mystery closely matches tonight's brief.",
    availability: {
      stream: [{ id: 8, name: "Netflix", logoPath: null }],
      free: [],
      rent: [],
      buy: [],
      tmdbUrl: null,
    },
  };
}

test("ranks five films, skips instantly, and reuses the original pool", async ({
  page,
}) => {
  const firstFive = [
    recommendation(101, "Arrival"),
    recommendation(102, "The Guilty"),
    recommendation(103, "Prisoners"),
    recommendation(104, "Calibre"),
    recommendation(105, "The Invitation"),
  ];
  let recommendationRequests = 0;

  await page.route("**/api/recommendations", async (route) => {
    recommendationRequests += 1;

    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      json: {
        recommendations: firstFive,
        remainingRecommendations: [
          recommendation(201, "The Next Feature"),
          recommendation(202, "Second Encore"),
        ],
        remainingCandidateIds: [201, 202],
        intent,
        referenceExclusionIds: [],
        demoMode: true,
      },
    });
  });

  await page.goto("/");
  const brief = page.getByLabel("What are you in the mood for?");
  await expect(brief).toBeVisible();
  await expect(page.locator("#movie-brief-title")).toHaveText(
    "What are you in the mood for?",
  );
  await expect(
    page.getByRole("heading", { name: "Now showing" }),
  ).toBeVisible();

  const promptLayout = await page.evaluate(() => {
    const foyer = document.querySelector(".foyer")!.getBoundingClientRect();
    const theatre = document.querySelector(".theatre")!.getBoundingClientRect();
    const fontSize = (selector: string) =>
      Number.parseFloat(
        window.getComputedStyle(document.querySelector(selector)!).fontSize,
      );
    return {
      foyerCenter: foyer.top + foyer.height / 2,
      theatreCenter: theatre.top + theatre.height / 2,
      nowShowingSize: fontSize(".theatre__title h1"),
      questionSize: fontSize(".marquee__now-showing"),
    };
  });
  expect(promptLayout.nowShowingSize).toBeGreaterThan(
    promptLayout.questionSize,
  );
  if ((page.viewportSize()?.width ?? 0) <= 640) {
    expect(
      Math.abs(promptLayout.foyerCenter - promptLayout.theatreCenter),
    ).toBeLessThan(24);
  }

  await brief.fill("A tense, clever thriller under two hours");
  await page.getByRole("button", { name: "Find tonight's film" }).click();
  await expect(page.locator(".countdown__number")).toHaveText("10");
  await expect(page.locator("#feature-title")).toHaveText("Arrival");

  const featureLayout = await page.evaluate(() => {
    const poster = document
      .querySelector(".feature-poster")!
      .getBoundingClientRect();
    const copy = document
      .querySelector(".feature-copy")!
      .getBoundingClientRect();
    const supporting = document
      .querySelector(".feature-supporting")!
      .getBoundingClientRect();
    return {
      poster: {
        top: poster.top,
        left: poster.left,
        right: poster.right,
        bottom: poster.bottom,
        width: poster.width,
      },
      copy: {
        top: copy.top,
        left: copy.left,
        right: copy.right,
        bottom: copy.bottom,
        width: copy.width,
      },
      supporting: {
        top: supporting.top,
        left: supporting.left,
        right: supporting.right,
        width: supporting.width,
      },
    };
  });
  if ((page.viewportSize()?.width ?? 0) > 640) {
    expect(featureLayout.poster.right).toBeLessThan(featureLayout.copy.left);
    expect(
      Math.abs(featureLayout.poster.top - featureLayout.copy.top),
    ).toBeLessThan(2);
    expect(featureLayout.poster.width).toBeLessThan(featureLayout.copy.width);
    expect(featureLayout.supporting.top).toBeGreaterThanOrEqual(
      Math.max(featureLayout.poster.bottom, featureLayout.copy.bottom),
    );
    expect(
      Math.abs(featureLayout.supporting.left - featureLayout.poster.left),
    ).toBeLessThan(2);
    expect(
      Math.abs(featureLayout.supporting.right - featureLayout.copy.right),
    ).toBeLessThan(2);
    expect(featureLayout.supporting.width).toBeGreaterThan(
      featureLayout.copy.width,
    );
  } else {
    expect(featureLayout.poster.bottom).toBeLessThan(featureLayout.copy.top);
    expect(featureLayout.copy.bottom).toBeLessThan(
      featureLayout.supporting.top,
    );
  }

  const tryAnother = page.getByRole("button", { name: /Try another film/ });
  await tryAnother.click();
  await expect(page.locator(".popcorn-transition")).toBeVisible();
  await expect(page.locator("#feature-title")).toHaveText("The Guilty");
  await expect(page.locator(".countdown")).toHaveCount(0);
  await expect(page.locator(".popcorn-transition")).toHaveCount(0);

  for (const title of ["Prisoners", "Calibre", "The Invitation"]) {
    await tryAnother.click();
    await expect(page.locator("#feature-title")).toHaveText(title);
  }
  await tryAnother.click();
  await expect(
    page.getByRole("heading", { name: "Ready for five more?" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Find five more films" }).click();
  await expect(page.locator("#feature-title")).toHaveText("The Next Feature");
  expect(recommendationRequests).toBe(1);
  await tryAnother.click();
  await expect(page.locator("#feature-title")).toHaveText("Second Encore");
  await tryAnother.click();
  await expect(
    page.getByText("You've seen all 2 films in this batch"),
  ).toBeVisible();
  await expect(page.getByText("02 films", { exact: true })).toBeVisible();
});
