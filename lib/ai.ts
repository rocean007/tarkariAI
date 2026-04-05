// lib/tarkari-ai.ts — Unified Tarkari AI client (OpenAI-compatible)
import OpenAI from "openai";

export const tarkariAIClient = new OpenAI({
  apiKey: process.env.TARKARI_AI_API_KEY || "no-key",
  baseURL: process.env.TARKARI_AI_BASE_URL || "https://api.openai.com/v1",
});

export const DEFAULT_MODEL = process.env.TARKARI_AI_MODEL || "gpt-4o-mini";

export const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "You are a helpful, harmless, and honest Tarkari AI assistant. You are knowledgeable, concise, and always aim to provide accurate and useful responses.";

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function createChatStream(messages: Message[]) {
  return tarkariAIClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    stream: true,
    max_tokens: 2048,
    temperature: 0.7,
  });
}

export async function createChatCompletion(messages: Message[]) {
  return tarkariAIClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    stream: false,
    max_tokens: 2048,
    temperature: 0.7,
  });
}
