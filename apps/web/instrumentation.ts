export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initTelemetry } = await import("@repo/telemetry-node");
    initTelemetry("chess-web");
  }
}
