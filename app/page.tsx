"use client";
import { useState } from "react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";

export default function HomePage() {
  const {
    conversations,
    activeConversation,
    activeId,
    isLoading,
    setActiveId,
    newConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
  } = useChat();

  const [showDocs, setShowDocs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Mobile menu toggle */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 100,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1px solid var(--border-default)",
          background: "var(--bg-input)",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-sm)",
        }}
        className="mobile-menu-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); }}
          onNew={newConversation}
          onDelete={deleteConversation}
          onDocsOpen={() => setShowDocs(true)}
        />
      )}

      {/* Main chat */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {showDocs ? (
          <DocsPage onClose={() => setShowDocs(false)} />
        ) : (
          <ChatWindow
            conversation={activeConversation}
            isLoading={isLoading}
            onSend={sendMessage}
            onStop={stopGeneration}
            onNew={newConversation}
          />
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 640px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Inline Docs Page ─────────────────────────────────────────────────────── */
function DocsPage({ onClose }: { onClose: () => void }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const endpoints = [
    {
      method: "POST",
      path: "/api/v1/completions",
      auth: true,
      description: "Send messages and receive Tarkari AI completions. Supports streaming (SSE) and non-streaming.",
      body: JSON.stringify({
        model: "my-assistant",
        messages: [{ role: "user", content: "Hello!" }],
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
      }, null, 2),
      example: `curl -X POST ${baseUrl}/api/v1/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"my-assistant","messages":[{"role":"user","content":"Hello!"}]}'`,
    },
    {
      method: "GET",
      path: "/api/v1/models",
      auth: true,
      description: "List all available models.",
      example: `curl ${baseUrl}/api/v1/models \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    },
    {
      method: "GET",
      path: "/api/v1/health",
      auth: false,
      description: "Health check endpoint. No authentication required.",
      example: `curl ${baseUrl}/api/v1/health`,
    },
  ];

  return (
    <div style={{ height: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 32px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 400, color: "var(--text-primary)" }}>
            API Documentation
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: 2 }}>
            Integrate your Tarkari AI assistant into any application
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "7px 16px",
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Chat
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Auth section */}
          <section style={{ marginBottom: 40 }}>
            <h2 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>
              Authentication
            </h2>
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "20px 24px",
              }}
            >
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 12 }}>
                Include your API key in the <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", background: "var(--bg-tertiary)", padding: "1px 6px", borderRadius: 4 }}>Authorization</code> header as a Bearer token:
              </p>
              <div
                style={{
                  background: "#1C1917",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "#E8E3D9" }}>
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <button
                  onClick={() => copy("Authorization: Bearer YOUR_API_KEY", "auth")}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#A8A29E", fontSize: "0.6875rem", padding: "2px 8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  {copiedKey === "auth" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: 10 }}>
                API keys are configured via the <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>VALID_API_KEYS</code> environment variable. Contact your administrator to obtain a key.
              </p>
            </div>
          </section>

          {/* Base URL */}
          <section style={{ marginBottom: 40 }}>
            <h2 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>
              Base URL
            </h2>
            <div
              style={{
                background: "#1C1917",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "#B5976A" }}>
                {baseUrl}/api/v1
              </code>
              <button
                onClick={() => copy(`${baseUrl}/api/v1`, "base")}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#A8A29E", fontSize: "0.6875rem", padding: "2px 8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
              >
                {copiedKey === "base" ? "Copied!" : "Copy"}
              </button>
            </div>
          </section>

          {/* Endpoints */}
          <section style={{ marginBottom: 40 }}>
            <h2 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 400, color: "var(--text-primary)", marginBottom: 16 }}>
              Endpoints
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {endpoints.map((ep, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    background: "var(--bg-input)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Endpoint header */}
                  <div
                    style={{
                      padding: "14px 20px",
                      background: "var(--bg-secondary)",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        background: ep.method === "POST" ? "#9A7D52" : "#4B8B6B",
                        color: "white",
                        fontSize: "0.6875rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {ep.method}
                    </span>
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {ep.path}
                    </code>
                    {ep.auth && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--accent-dark)",
                          background: "var(--accent-subtle)",
                          border: "1px solid rgba(181,151,106,0.25)",
                          padding: "1px 7px",
                          borderRadius: 4,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        🔑 Auth required
                      </span>
                    )}
                  </div>

                  <div style={{ padding: "16px 20px" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: ep.body ? 14 : 0 }}>
                      {ep.description}
                    </p>

                    {ep.body && (
                      <>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          Request Body
                        </p>
                        <pre
                          style={{
                            background: "#1C1917",
                            borderRadius: "var(--radius-md)",
                            padding: "12px 14px",
                            overflowX: "auto",
                            marginBottom: 14,
                            fontSize: "0.8rem",
                            color: "#E8E3D9",
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1.6,
                          }}
                        >
                          {ep.body}
                        </pre>
                      </>
                    )}

                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Example
                    </p>
                    <div
                      style={{
                        background: "#1C1917",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 14px",
                        position: "relative",
                      }}
                    >
                      <pre
                        style={{
                          overflowX: "auto",
                          fontSize: "0.8rem",
                          color: "#E8E3D9",
                          fontFamily: "var(--font-mono)",
                          lineHeight: 1.6,
                          paddingRight: 64,
                        }}
                      >
                        {ep.example}
                      </pre>
                      <button
                        onClick={() => copy(ep.example, `ep-${i}`)}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          color: "#A8A29E",
                          fontSize: "0.6875rem",
                          padding: "2px 8px",
                          cursor: "pointer",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {copiedKey === `ep-${i}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SDK examples */}
          <section style={{ marginBottom: 40 }}>
            <h2 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 400, color: "var(--text-primary)", marginBottom: 16 }}>
              SDK Examples
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  lang: "JavaScript / TypeScript",
                  code: `const response = await fetch("${baseUrl}/api/v1/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "my-assistant",
    messages: [{ role: "user", content: "Hello!" }],
    stream: false,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);`,
                },
                {
                  lang: "Python",
                  code: `import requests

response = requests.post(
    "${baseUrl}/api/v1/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "model": "my-assistant",
        "messages": [{"role": "user", "content": "Hello!"}],
        "stream": False,
    }
)

data = response.json()
print(data["choices"][0]["message"]["content"])`,
                },
                {
                  lang: "OpenAI Python SDK (compatible)",
                  code: `from openai import OpenAI  # Tarkari AI-compatible

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="${baseUrl}/api/v1",
)

response = client.chat.completions.create(
    model="my-assistant",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`,
                },
              ].map((ex, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      padding: "8px 16px",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {ex.lang}
                    </span>
                    <button
                      onClick={() => copy(ex.code, `sdk-${i}`)}
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)", borderRadius: 4, color: "var(--text-tertiary)", fontSize: "0.6875rem", padding: "2px 8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                    >
                      {copiedKey === `sdk-${i}` ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre
                    style={{
                      background: "#1C1917",
                      padding: "16px",
                      overflowX: "auto",
                      fontSize: "0.8125rem",
                      color: "#E8E3D9",
                      fontFamily: "var(--font-mono)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {ex.code}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* Rate limits */}
          <section>
            <h2 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>
              Rate Limits &amp; Notes
            </h2>
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "20px 24px",
              }}
            >
              {[
                "Rate limits are determined by your Tarkari AI backend provider (OpenAI, HuggingFace, etc.)",
                "The API is OpenAI-compatible — you can use the official OpenAI SDK by pointing it at this server for Tarkari AI.",
                "Streaming is supported via Server-Sent Events (SSE). Set stream: true in your request.",
                "CORS is configured via the ALLOWED_ORIGINS environment variable.",
                "All requests are logged server-side for monitoring purposes.",
              ].map((note, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 4 ? 10 : 0 }}>
                  <span style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }}>→</span>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>{note}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
