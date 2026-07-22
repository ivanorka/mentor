import { schedule } from "@netlify/functions";
import { query } from "./lib/db.mjs";

// A light database heartbeat. It exercises the deployed function path and the
// Neon pooled connection, while producing a useful latency signal in Netlify
// function logs. Serverless runtimes may still be recycled by the platform.
export const handler = schedule("*/5 * * * *", async () => {
  const startedAt = performance.now();

  try {
    await query("SELECT 1 AS ok");
    console.log(JSON.stringify({
      event: "gaudeamus_heartbeat",
      status: "ok",
      database: "neon",
      latencyMs: Math.round(performance.now() - startedAt),
      at: new Date().toISOString(),
    }));

    return { statusCode: 204 };
  } catch (error) {
    console.error(JSON.stringify({
      event: "gaudeamus_heartbeat",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown database error",
      at: new Date().toISOString(),
    }));

    return { statusCode: 503 };
  }
});
