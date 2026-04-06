# Tarkari AI Assistant

A production-focused chatbot frontend and API server for your own AI model backend.

## Features

- ChatGPT-style UI for your assistant
- Public REST API at `/api/v1/*` for external website access
- API key auth with Bearer token validation
- CORS allowlist for browser access control
- Streaming and non-streaming chat completions
- Built-in in-memory rate limiting

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

```env
TARKARI_AI_BASE_URL=http://127.0.0.1:8000/v1
TARKARI_AI_API_KEY=
TARKARI_AI_MODEL=tarkari-chat-v1

VALID_API_KEYS=myai-key-prod-abc123,myai-key-dev-xyz789
ALLOWED_ORIGINS=https://yourapp.com,https://another-site.com

RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_MODELS_PER_MINUTE=120
UI_RATE_LIMIT_PER_MINUTE=90
ALLOW_UNAUTHENTICATED=false
```

## External API

Base URL: `https://your-domain.com/api/v1`

### `POST /completions`

```bash
curl -X POST https://your-domain.com/api/v1/completions \
  -H "Authorization: Bearer myai-key-prod-abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tarkari-chat-v1",
    "messages": [{"role":"user","content":"Hello"}],
    "stream": false
  }'
```

### `GET /models`

```bash
curl https://your-domain.com/api/v1/models \
  -H "Authorization: Bearer myai-key-prod-abc123"
```

### `GET /health`

```bash
curl https://your-domain.com/api/v1/health
```

## Production Notes

- Keep `ALLOW_UNAUTHENTICATED=false` in production.
- Use strong keys in `VALID_API_KEYS` and rotate regularly.
- Restrict `ALLOWED_ORIGINS` to trusted domains only.
- Browser-exposed keys can leak; for best security use server-to-server calls.
