"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@/types";
import { formatDate } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 4,
        color: "#A8A29E",
        fontSize: "0.6875rem",
        padding: "2px 8px",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div
        className="animate-slide-up"
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}
      >
        <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div
            style={{
              background: "var(--user-bubble)",
              color: "var(--user-bubble-text)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 4px var(--radius-xl)",
              padding: "10px 16px",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              wordBreak: "break-word",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {message.content}
          </div>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-placeholder)", paddingRight: 4 }}>
            {formatDate(new Date(message.timestamp))}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-slide-up"
      style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-start" }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Typing indicator */}
        {message.isStreaming && message.content === "" ? (
          <div
            style={{
              background: "var(--assistant-bubble)",
              border: "1px solid var(--assistant-bubble-border)",
              borderRadius: "4px var(--radius-xl) var(--radius-xl) var(--radius-xl)",
              padding: "12px 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        ) : (
          <div
            style={{
              background: "var(--assistant-bubble)",
              border: "1px solid var(--assistant-bubble-border)",
              borderRadius: "4px var(--radius-xl) var(--radius-xl) var(--radius-xl)",
              padding: "12px 16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");
                    if (!inline && match) {
                      return (
                        <div style={{ margin: "0.75em 0" }}>
                          <div className="code-block-header">
                            <span style={{ color: "#78716C", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                              {match[1]}
                            </span>
                            <CopyButton text={codeStr} />
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                              fontSize: "0.8125rem",
                              background: "#1C1917",
                            }}
                            {...props}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {message.isStreaming && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1em",
                  background: "var(--accent)",
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                  animation: "pulse 1s infinite",
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        )}
        <span style={{ fontSize: "0.6875rem", color: "var(--text-placeholder)", paddingLeft: 4, marginTop: 4, display: "block" }}>
          {formatDate(new Date(message.timestamp))}
        </span>
      </div>
    </div>
  );
}
