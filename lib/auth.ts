// lib/auth.ts — API Key validation for the REST API

const VALID_API_KEYS = new Set(
  (process.env.VALID_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
);
const ALLOW_UNAUTHENTICATED =
  process.env.ALLOW_UNAUTHENTICATED === "true" &&
  process.env.NODE_ENV !== "production";

export function validateApiKey(authHeader: string | null): {
  valid: boolean;
  error?: string;
} {
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Authorization header must use Bearer scheme" };
  }

  const key = authHeader.slice(7).trim();

  if (!key) {
    return { valid: false, error: "API key is empty" };
  }

  if (VALID_API_KEYS.size === 0) {
    if (ALLOW_UNAUTHENTICATED) {
      console.warn("⚠️  No VALID_API_KEYS configured. Unauthenticated mode enabled.");
      return { valid: true };
    }
    return { valid: false, error: "No API keys configured on server" };
  }

  if (!VALID_API_KEYS.has(key)) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export function getOriginFromRequest(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowed.includes("*")) return true;
  return allowed.some((o) => origin.startsWith(o));
}

export function corsHeaders(origin: string) {
  const allowed = isOriginAllowed(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed || "null",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
