"use client";
import { useState, useRef, useCallback } from "react";

interface InputBarProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function InputBar({ onSend, onStop, isLoading, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  return (
    <div
      style={{
        padding: "16px 24px 20px",
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          position: "relative",
          background: "var(--bg-input)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-md)",
          transition: "border-color 0.2s, box-shadow 0.2s",
          display: "flex",
          alignItems: "flex-end",
          gap: 0,
        }}
        onFocusCapture={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-input)";
        }}
        onBlurCapture={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
          (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message your Tarkari AI assistant… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={disabled}
          style={{
            flex: 1,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "14px 16px",
            fontSize: "0.9375rem",
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
            lineHeight: 1.6,
            maxHeight: 200,
            overflowY: "auto",
            scrollbarWidth: "thin",
          }}
        />

        <div style={{ padding: "10px 12px 10px 0", flexShrink: 0 }}>
          {isLoading ? (
            <button
              onClick={onStop}
              title="Stop generating"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              title="Send message"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                background: value.trim() ? "var(--user-bubble)" : "var(--border-default)",
                color: "var(--bg-primary)",
                cursor: value.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, opacity 0.15s",
                opacity: value.trim() ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (value.trim()) e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = value.trim() ? "1" : "0.5";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.6875rem",
          color: "var(--text-placeholder)",
          marginTop: 8,
        }}
      >
        Tarkari AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
