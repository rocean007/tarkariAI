// app/api/v1/completions/route.ts — External REST API (OpenAI-compatible)
// Protected by API key authentication + CORS origin validation
import { NextRequest } from "next/server";
import { validateApiKey, corsHeaders, getOriginFromRequest } from "@/lib/auth";
import { createChatCompletion, createChatStream, DEFAULT_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  const headers = corsHeaders(origin);

  // 1. Validate API key
  const auth = request.headers.get("Authorization");
  const { valid, error } = validateApiKey(auth);
  if (!valid) {
    return new Response(
      JSON.stringify({ error: { message: error, type: "invalid_request_error", code: "invalid_api_key" } }),
      { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
  const authToken = auth?.slice(7).trim() || "anonymous";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = enforceRateLimit(`v1:completions:${authToken}:${ip}`);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          message: "Rate limit exceeded. Please retry later.",
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      }),
      {
        status: 429,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Retry-After": String(rate.retryAfterSeconds),
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  }

  // 2. Parse request body
  let body: {
    messages?: Array<{ role: string; content: string }>;
    model?: string;
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    system?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid JSON", type: "invalid_request_error" } }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const { messages, model, stream = false, max_tokens = 2048, temperature = 0.7, system } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: { message: "messages array is required", type: "invalid_request_error" } }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // 3. Build validated messages array
  const normalizedMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  try {
    if (stream) {
      // Streaming response (SSE format, OpenAI-compatible)
      const aiStream = await createChatStream(normalizedMessages, {
        model: model || DEFAULT_MODEL,
        max_tokens,
        temperature,
        system: system || SYSTEM_PROMPT,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          for await (const chunk of aiStream) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          ...headers,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      const completion = await createChatCompletion(normalizedMessages, {
        model: model || DEFAULT_MODEL,
        max_tokens,
        temperature,
        system: system || SYSTEM_PROMPT,
      });

      return new Response(JSON.stringify(completion), {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      });
    }
  } catch (err: unknown) {
    console.error("Completions API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: { message, type: "api_error" } }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}
