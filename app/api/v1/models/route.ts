// app/api/v1/models/route.ts — List available models
import { NextRequest } from "next/server";
import { validateApiKey, corsHeaders, getOriginFromRequest } from "@/lib/auth";
import { DEFAULT_MODEL } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function OPTIONS(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  const headers = corsHeaders(origin);

  const auth = request.headers.get("Authorization");
  const { valid, error } = validateApiKey(auth);
  if (!valid) {
    return new Response(JSON.stringify({ error: { message: error } }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  const authToken = auth?.slice(7).trim() || "anonymous";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = enforceRateLimit(`v1:models:${authToken}:${ip}`, Number.parseInt(process.env.RATE_LIMIT_MODELS_PER_MINUTE || "120", 10));
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
      status: 429,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Retry-After": String(rate.retryAfterSeconds),
      },
    });
  }

  const models = {
    object: "list",
    data: [
      {
        id: DEFAULT_MODEL,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "my-ai-assistant",
        permission: [],
        root: DEFAULT_MODEL,
        parent: null,
      },
    ],
  };

  return new Response(JSON.stringify(models), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
