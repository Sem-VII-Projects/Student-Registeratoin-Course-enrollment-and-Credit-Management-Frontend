const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

const isLoopbackApiUrl = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(rawApiBaseUrl);

// In local Vite dev, prefer the same-origin proxy so credentialed requests avoid CORS issues.
export const API_BASE_URL =
  rawApiBaseUrl && !(import.meta.env.DEV && isLoopbackApiUrl)
    ? rawApiBaseUrl.replace(/\/$/, "")
    : "";

// Spring Boot API Base URL (same pattern)
const rawSpringApiBaseUrl = (import.meta.env.VITE_SPRING_API_BASE_URL || "http://127.0.0.1:8090").trim();
const isSpringLoopback = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(rawSpringApiBaseUrl);

export const SPRING_API_BASE_URL =
  rawSpringApiBaseUrl && !(import.meta.env.DEV && isSpringLoopback)
    ? rawSpringApiBaseUrl.replace(/\/$/, "")
    : "";
