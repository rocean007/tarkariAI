# Model Server (Free, Open-Source)

This small FastAPI server exposes an **OpenAI-like** endpoint:

- `POST /v1/chat/completions`
- Supports both `stream: true` (SSE `text/event-stream`) and `stream: false` (JSON)

It is designed to work with your Next.js app’s `TARKARI_AI_BASE_URL` and the streaming format it expects:
- streamed chunks look like `{ "choices": [{ "delta": { "content": "..." } }] }`

## 1) Install

```bash
cd model-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Configure environment

```bash
export MODEL_DEVICE="auto"   # or "cuda" / "cuda:0" (depending on your setup)

# If you are using a full merged model:
export MODEL_NAME="your-fine-tuned-model-or-base-model"

# If you are using LoRA adapters (recommended output from your training):
# export BASE_MODEL_NAME="unsloth/Llama-3.2-3B-Instruct-bnb-4bit-or-your-base"
# export ADAPTER_PATH="/path/to/lora-adapters"
# export MERGE_ADAPTERS=false   # set true to merge for faster inference

# Optional (server-side auth only):
# export MODEL_API_KEY="your-model-server-key"
```

Recommended for your Next.js app:

Your Next app should use something like:

- `TARKARI_AI_BASE_URL=http://127.0.0.1:8000/v1`
- `TARKARI_AI_API_KEY=` (leave blank unless you set `MODEL_API_KEY`)

## 3) Run

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

## 4) Test (streaming)

```bash
curl -N -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tarkari-chat-v1",
    "messages": [{"role":"user","content":"Hello! Write a short haiku about code."}],
    "stream": true,
    "max_tokens": 128,
    "temperature": 0.7
  }'
```

## Notes

- This is a minimal server meant to be “plug-compatible” with your Next.js app.
- For heavy production workloads, you may want a more specialized inference server (vLLM), but that’s optional.
