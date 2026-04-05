// lib/auth.ts — API Key validation for the REST API

const VALID_API_KEYS = new Set(
  (process.env.VALID_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
);

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
    // No keys configured — allow all (development mode)
    console.warn("⚠️  No VALID_API_KEYS configured. All requests allowed.");
    return { valid: true };
  }

  if (!VALID_API_KEYS.has(key)) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export function getOriginFromRequest(request: Request): string {
  return (
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "unknown"
  );
}

export function isOriginAllowed(origin: string): boolean {
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
