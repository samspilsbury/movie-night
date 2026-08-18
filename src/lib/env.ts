import { z } from "zod";

const envSchema = z.object({
  MOVIE_NIGHT_DEMO_MODE: z.enum(["true", "false"]).default("true"),
  MOVIE_NIGHT_REGION: z.string().length(2).default("GB"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  TMDB_API_TOKEN: z.string().min(1).optional(),
});

export function getServerEnv() {
  const env = envSchema.parse(process.env);

  if (env.MOVIE_NIGHT_DEMO_MODE === "false") {
    if (!env.OPENAI_API_KEY || !env.TMDB_API_TOKEN) {
      throw new Error(
        "Live mode requires OPENAI_API_KEY and TMDB_API_TOKEN on the server.",
      );
    }
  }

  return {
    ...env,
    demoMode: env.MOVIE_NIGHT_DEMO_MODE === "true",
    region: env.MOVIE_NIGHT_REGION.toUpperCase(),
  };
}
