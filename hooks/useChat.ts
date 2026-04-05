"use client";
import { useState, useCallback, useRef } from "react";
import type { Message, Conversation } from "@/types";
import { generateId } from "@/lib/utils";

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const newConversation = useCallback(() => {
    const conv: Conversation = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Ensure we have an active conversation
      let convId = activeId;
      if (!convId) {
        const conv: Conversation = {
          id: generateId(),
          title: content.slice(0, 40) || "New Chat",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        convId = conv.id;
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      // Add user message + empty assistant message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                title:
                  c.messages.length === 0
                    ? content.slice(0, 40) || "New Chat"
                    : c.title,
                messages: [...c.messages, userMsg, assistantMsg],
                updatedAt: new Date(),
              }
            : c
        )
      );

      setIsLoading(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        // Get current messages for context
        const currentConv = conversations.find((c) => c.id === convId);
        const historyMessages = (currentConv?.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...historyMessages, { role: "user", content: content.trim() }],
          }),
          signal: ctrl.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });

          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: fullText, isStreaming: true }
                        : m
                    ),
                  }
                : c
            )
          );
        }

        // Mark streaming done
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullText, isStreaming: false }
                      : m
                  ),
                }
              : c
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errMsg = err instanceof Error ? err.message : "Something went wrong";
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          content: `⚠️ Error: ${errMsg}`,
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : c
          )
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeId, isLoading, conversations]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    // Remove isStreaming flag
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ ...m, isStreaming: false })),
      }))
    );
  }, []);

  return {
    conversations,
    activeConversation,
    activeId,
    isLoading,
    setActiveId,
    newConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
  };
}
