"use client";
import { useState } from "react";
import type { Conversation } from "@/types";
import { cn, formatDate } from "@/lib/utils";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDocsOpen: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onDocsOpen,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--user-bubble)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="var(--bg-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            className="font-display"
            style={{ fontSize: "1.0625rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            {process.env.NEXT_PUBLIC_APP_NAME || "Tarkari AI"}
          </span>
        </div>

        <button
          onClick={onNew}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-input)",
            color: "var(--text-secondary)",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-input)";
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New conversation
        </button>
      </div>

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {conversations.length === 0 ? (
          <p
            style={{
              color: "var(--text-placeholder)",
              fontSize: "0.8125rem",
              textAlign: "center",
              padding: "24px 16px",
              lineHeight: 1.5,
            }}
          >
            No conversations yet.
            <br />
            Start a new chat above.
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: "relative",
                borderRadius: "var(--radius-sm)",
                marginBottom: 2,
              }}
            >
              <button
                onClick={() => onSelect(conv.id)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: activeId === conv.id ? "var(--bg-sidebar-hover)" : "transparent",
                  color: activeId === conv.id ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.12s",
                  paddingRight: hoveredId === conv.id ? 32 : 10,
                }}
                onMouseEnter={(e) => {
                  if (activeId !== conv.id) e.currentTarget.style.background = "var(--bg-sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                  if (activeId !== conv.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: activeId === conv.id ? 500 : 400,
                  }}
                >
                  {conv.title || "New Chat"}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-placeholder)", marginTop: 1 }}>
                  {conv.messages.length} message{conv.messages.length !== 1 ? "s" : ""}
                </div>
              </button>

              {hoveredId === conv.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  title="Delete"
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-placeholder)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    transition: "color 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-placeholder)")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button
          onClick={onDocsOpen}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sidebar-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
          </svg>
          API Documentation
        </button>
      </div>
    </aside>
  );
}
