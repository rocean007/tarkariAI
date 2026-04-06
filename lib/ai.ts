// lib/ai.ts — Unified client for your own model backend
export const MODEL_BASE_URL =
  process.env.TARKARI_AI_BASE_URL || "http://127.0.0.1:8000/v1";

export const MODEL_API_KEY = process.env.TARKARI_AI_API_KEY || "";

export const DEFAULT_MODEL = process.env.TARKARI_AI_MODEL || "tarkari-chat-v1";

export const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "You are a helpful, harmless, and honest Tarkari AI assistant. You are knowledgeable, concise, and always aim to provide accurate and useful responses.";

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatRequestOptions = {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  system?: string;
  signal?: AbortSignal;
};

export type ChatDeltaChunk = {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

function getModelHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (MODEL_API_KEY) {
    headers.Authorization = `Bearer ${MODEL_API_KEY}`;
  }
  return headers;
}

function buildMessages(messages: Message[], system?: string) {
  const systemPrompt = system || SYSTEM_PROMPT;
  return [{ role: "system" as const, content: systemPrompt }, ...messages];
}

function toChunk(content: string): ChatDeltaChunk {
  return { choices: [{ delta: { content } }] };
}

function parseLineToChunk(line: string): ChatDeltaChunk | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!data || data === "[DONE]") return null;

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (typeof parsed.content === "string") {
      return toChunk(parsed.content);
    }
    if (
      Array.isArray(parsed.choices) &&
      typeof parsed.choices[0] === "object" &&
      parsed.choices[0] !== null
    ) {
      return parsed as unknown as ChatDeltaChunk;
    }
    if (typeof parsed.token === "string") {
      return toChunk(parsed.token);
    }
  } catch {
    return toChunk(data);
  }

  return null;
}

export async function createChatStream(
  messages: Message[],
  options: ChatRequestOptions = {}
) {
  const res = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: getModelHeaders(),
    signal: options.signal,
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: buildMessages(messages, options.system),
      stream: true,
      max_tokens: options.max_tokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Model backend stream request failed: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return {
    async *[Symbol.asyncIterator](): AsyncGenerator<ChatDeltaChunk> {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          const chunk = parseLineToChunk(line);
          if (chunk) {
            yield chunk;
          }
        }
      }

      if (buffer.trim()) {
        const finalChunk = parseLineToChunk(buffer);
        if (finalChunk) {
          yield finalChunk;
        }
      }
    },
  };
}

export async function createChatCompletion(
  messages: Message[],
  options: ChatRequestOptions = {}
) {
  const res = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: getModelHeaders(),
    signal: options.signal,
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: buildMessages(messages, options.system),
      stream: false,
      max_tokens: options.max_tokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Model backend completion failed: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`
    );
  }

  return res.json();
}
