"use client";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";
import type { Conversation } from "@/types";

interface ChatWindowProps {
  conversation: Conversation | null;
  isLoading: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onNew: () => void;
}

export function ChatWindow({ conversation, isLoading, onSend, onStop, onNew }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: 400 }}
          >
            {conversation?.title || "New Conversation"}
          </h1>
          {conversation && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-placeholder)", marginTop: 1 }}>
              {conversation.messages.length} message{conversation.messages.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onNew}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-tertiary)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {!conversation || conversation.messages.length === 0 ? (
            <EmptyState onSend={onSend} />
          ) : (
            conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* Input */}
      <InputBar onSend={onSend} onStop={onStop} isLoading={isLoading} />
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (m: string) => void }) {
  const suggestions = [
    "Explain quantum computing in simple terms",
    "Write a Python script to parse JSON files",
    "What are the best practices for REST API design?",
    "Help me debug this code snippet",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        gap: 24,
      }}
      className="animate-fade-in"
    >
      <div>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          className="font-display"
          style={{ fontSize: "1.5rem", color: "var(--text-primary)", marginBottom: 6, fontWeight: 400 }}
        >
          How can I help you?
        </h2>
        <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
          Ask anything — I&apos;m here to assist.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          width: "100%",
          maxWidth: 500,
        }}
      >
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-input)",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              textAlign: "left",
              lineHeight: 1.4,
              transition: "all 0.15s",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.background = "var(--bg-input)";
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
