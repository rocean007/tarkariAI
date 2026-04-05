# 🤖 Tarkari AI Assistant — Production-Grade Tarkari AI Chat Platform

A full-stack, production-ready Tarkari AI assistant platform built with **Next.js 14 App Router**, featuring a beautiful ChatGPT-style UI, RESTful API with API key authentication, streaming responses, and complete fine-tuning pipeline for custom 3B parameter models.

---

## ✨ Features

- **🎨 Premium UI** — Warm off-white design system, not a blue tone in sight. Responsive, accessible, polished.
- **🔑 API Key Auth** — Issue API keys to authorize external apps/websites to access your Tarkari AI via REST.
- **⚡ Streaming** — Token-by-token streaming responses using ReadableStream.
- **📚 API Docs** — Built-in `/docs` page with interactive API documentation.
- **🧠 Bring Your Own Model** — Drop in any OpenAI-compatible endpoint (HuggingFace Inference, vLLM, Ollama, etc.) for Tarkari AI.
- **💾 Chat History** — In-memory session history with full conversation context.
- **🚀 Vercel-Ready** — One-click deploy with environment variables.
- **🔒 CORS + Origin Whitelist** — Restrict which external domains can call your Tarkari AI REST API.

---

## 📁 Project Structure

```
tarkari-ai-assistant/
├── app/
│   ├── page.tsx                  # Main chat UI
│   ├── layout.tsx                # Root layout + fonts
│   ├── globals.css               # Design system variables
│   ├── docs/
│   │   └── page.tsx              # API documentation page
│   └── api/
│       ├── chat/
│       │   └── route.ts          # Internal chat endpoint (streaming)
│       └── v1/
│           ├── completions/
│           │   └── route.ts      # External REST API (OpenAI-compatible)
│           ├── models/
│           │   └── route.ts      # List available models
│           └── health/
│               └── route.ts      # Health check
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx        # Main chat container
│   │   ├── MessageBubble.tsx     # Individual message display
│   │   ├── InputBar.tsx          # Message input + send
│   │   └── Sidebar.tsx           # Conversation history sidebar
│   └── ui/
│       ├── ApiKeyBadge.tsx       # API key status badge
│       └── DocsPanel.tsx         # API docs component
├── lib/
│   ├── auth.ts                   # API key validation logic
│   ├── tarkari-ai.ts             # Tarkari AI model client wrapper
│   └── cors.ts                   # CORS + origin whitelist
├── middleware.ts                  # Edge middleware for auth
├── .env.example                  # Environment variable template
├── package.json
├── next.config.ts
├── tsconfig.json
├── README.md                     ← you are here
└── TRAIN_README.md               # Fine-tuning documentation
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/my-ai-assistant.git
cd my-ai-assistant
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Tarkari AI Model Backend (OpenAI-compatible endpoint)
TARKARI_AI_BASE_URL=https://api.openai.com/v1
TARKARI_AI_API_KEY=sk-...
TARKARI_AI_MODEL=gpt-4o-mini

# Your REST API authentication secret (used to validate API keys you issue)
API_SECRET_SALT=your-random-secret-salt-here

# Comma-separated list of authorized external origins for the REST API
ALLOWED_ORIGINS=https://yourapp.com,https://another-site.com

# Optional: Your own pre-issued API keys (comma-separated)
VALID_API_KEYS=tarkari-ai-key-abc123,tarkari-ai-key-def456
```

> **Using your fine-tuned model?** Point `TARKARI_AI_BASE_URL` at your HuggingFace Inference Endpoint, a local vLLM server, or Ollama.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — your Tarkari AI assistant is running.

---

## 🔑 API Key Management

API keys are validated via the `Authorization: Bearer <key>` header. To issue keys:

1. Set `VALID_API_KEYS=tarkari-ai-key-abc123,tarkari-ai-key-xyz789` in `.env.local`
2. Share the key with your external app/client
3. External apps call `/api/v1/completions` with the key in the header

Keys never expire unless you remove them from the environment variable (or implement a database — see below).

---

## 🌐 REST API

The REST API is OpenAI-compatible. See `/docs` in the running app for full interactive documentation for Tarkari AI.

**Base URL:** `https://your-domain.com/api/v1` (Tarkari AI)

### Chat Completions

```bash
curl -X POST https://your-domain.com/api/v1/completions \
  -H "Authorization: Bearer tarkari-ai-key-abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-assistant",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

### List Models

```bash
curl https://your-domain.com/api/v1/models \
  -H "Authorization: Bearer tarkari-ai-key-abc123"
```

### Health Check

```bash
curl https://your-domain.com/api/v1/health
```

---

## 🚀 Deploy to Vercel

```bash
npx vercel
```

Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## 🔧 Using Your Fine-Tuned Model

After training (see `TRAIN_README.md`), deploy your Tarkari AI model to:

- **HuggingFace Inference Endpoints** — Set `TARKARI_AI_BASE_URL` to your endpoint URL
- **vLLM** (self-hosted) — `TARKARI_AI_BASE_URL=http://localhost:8000/v1`
- **Ollama** (local) — `TARKARI_AI_BASE_URL=http://localhost:11434/v1`, `TARKARI_AI_API_KEY=ollama`

---

## 📄 License

MIT — do whatever you want with it.
