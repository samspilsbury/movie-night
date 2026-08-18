import { expect, test } from "@playwright/test";

test("finds one film and changes the programme", async ({ page }) => {
  const intent = {
    includedGenres: ["thriller"],
    excludedGenres: [],
    moods: ["tense", "clever"],
    keywordTerms: [],
    referenceMovies: [],
    minimumYear: null,
    maximumYear: null,
    maximumRuntimeMinutes: 120,
    originalLanguage: null,
  };
  const candidates = [
    {
      id: 101,
      title: "Arrival",
      originalTitle: "Arrival",
      overview: "A linguist confronts a mystery that could change humanity.",
      releaseDate: "2016-11-10",
      posterPath: null,
      backdropPath: null,
      genreIds: [18, 878, 9648],
      voteAverage: 7.6,
      voteCount: 18420,
      popularity: 68,
      score: 91,
    },
    {
      id: 102,
      title: "Whiplash",
      originalTitle: "Whiplash",
      overview: "A drummer enters a brutal battle of wills with his teacher.",
      releaseDate: "2014-10-10",
      posterPath: null,
      backdropPath: null,
      genreIds: [18, 10402],
      voteAverage: 8.4,
      voteCount: 16000,
      popularity: 71,
      score: 88,
    },
  ];

  await page.route("**/api/recommendations", async (route) => {
    await route.fulfill({
      json: {
        candidates,
        intent,
        referenceExclusionIds: [],
        qualityStage: 0,
        qualityLabel: "Highly rated",
        demoMode: true,
      },
    });
  });

  await page.route("**/api/movies/*", async (route) => {
    const id = Number(route.request().url().split("/").at(-1));
    const candidate =
      candidates.find((movie) => movie.id === id) ?? candidates[0];
    await route.fulfill({
      json: {
        movie: {
          ...candidate,
          runtimeMinutes: candidate.id === 101 ? 116 : 107,
          certification: "15",
          genres:
            candidate.id === 101
              ? ["Drama", "Science Fiction"]
              : ["Drama", "Music"],
          director:
            candidate.id === 101 ? "Denis Villeneuve" : "Damien Chazelle",
          cast: [],
          matchReason:
            "A highly rated match for the tense, clever film you described.",
          availability: {
            stream: [{ id: 8, name: "Netflix", logoPath: null }],
            free: [],
            rent: [],
            buy: [],
            tmdbUrl: null,
          },
        },
      },
    });
  });

  await page.goto("/");

  const brief = page.getByLabel("What are you in the mood for?");
  await expect(brief).toBeVisible();
  await expect(page.getByText("Now showing")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What are you in the mood for?" }),
  ).toBeVisible();
  const marqueeSurface = await page
    .locator(".marquee__panel")
    .evaluate((element) => window.getComputedStyle(element).backgroundColor);
  expect(marqueeSurface).not.toBe("rgba(0, 0, 0, 0)");

  const findFilm = page.getByRole("button", { name: "Find tonight's film" });
  await brief.fill("A tense, clever thriller under two hours");
  await expect(findFilm).toBeEnabled();
  await findFilm.click();

  await expect(page.getByText("Please take your seats")).toBeVisible();
  await expect(page.getByText("Tonight's feature")).toBeVisible({
    timeout: 10_000,
  });

  const firstTitle = await page.locator("#feature-title").textContent();
  await expect(
    page.getByText(/UK (12|15|18|PG|U|rating unavailable)/),
  ).toBeVisible();

  const renderedType = await page.evaluate(() => {
    const size = (selector: string) =>
      Number.parseFloat(
        window.getComputedStyle(document.querySelector(selector)!).fontSize,
      );

    return {
      metadata: size(".feature-metadata"),
      overview: size(".feature-overview"),
      availabilitySource: size(".availability__source"),
      titleOutline: window.getComputedStyle(
        document.querySelector("#feature-title")!,
      ).outlineStyle,
    };
  });

  expect(renderedType.metadata).toBeGreaterThanOrEqual(16);
  expect(renderedType.overview).toBeGreaterThanOrEqual(20);
  expect(renderedType.availabilitySource).toBeGreaterThanOrEqual(14);
  expect(renderedType.titleOutline).toBe("none");

  await page.getByRole("button", { name: /Try another film/ }).click();
  await expect(page.locator("#feature-title")).not.toHaveText(
    firstTitle ?? "",
    {
      timeout: 10_000,
    },
  );
});
