const requiredVariables = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"];
const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    `Missing required environment variable${missingVariables.length === 1 ? "" : "s"}: ${missingVariables.join(", ")}`,
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const secretKey = process.env.SUPABASE_SECRET_KEY.trim();

let endpoint;

try {
  const url = new URL(`${supabaseUrl}/rest/v1/project_keepalive`);

  if (url.protocol !== "https:") {
    throw new Error("SUPABASE_URL must use HTTPS.");
  }

  endpoint = url.toString();
} catch (error) {
  console.error(
    `Invalid SUPABASE_URL: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: secretKey,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({
    id: 1,
    last_seen_at: new Date().toISOString(),
  }),
  signal: AbortSignal.timeout(20_000),
});

if (!response.ok) {
  const responseBody = (await response.text()).slice(0, 500);
  console.error(
    `Supabase keep-alive failed (${response.status} ${response.statusText})${
      responseBody ? `: ${responseBody}` : ""
    }`,
  );
  process.exit(1);
}

console.log(`Supabase keep-alive succeeded at ${new Date().toISOString()}.`);
