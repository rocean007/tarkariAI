// app/api/chat/route.ts — Internal streaming chat endpoint (for the web UI)
import { NextRequest } from "next/server";
import { createChatStream } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = enforceRateLimit(`ui:chat:${ip}`, Number.parseInt(process.env.UI_RATE_LIMIT_PER_MINUTE || "90", 10));
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please retry later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      });
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Basic payload hardening for production cost control.
    const MAX_MESSAGES = 50;
    const MAX_TOTAL_CHARS = 20000;
    const normalized = messages
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant" || m.role === "system") &&
          typeof m.content === "string"
      )
      .slice(-MAX_MESSAGES);

    const totalChars = normalized.reduce((sum: number, m: any) => sum + m.content.length, 0);
    if (normalized.length === 0 || totalChars > MAX_TOTAL_CHARS) {
      return new Response(JSON.stringify({ error: "Invalid or too-large messages payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = await createChatStream(normalized, { signal: request.signal });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
