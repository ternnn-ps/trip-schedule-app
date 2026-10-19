export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const configuredTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);

export const API_TIMEOUT_MS = Number.isFinite(configuredTimeout)
  ? Math.max(5_000, configuredTimeout)
  : 15_000;
