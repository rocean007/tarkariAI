import json
import os
import threading
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

app = FastAPI()

MODEL_NAME = os.environ.get("MODEL_NAME", "unsloth/Llama-3.2-3B-Instruct-bnb-4bit")
BASE_MODEL_NAME = os.environ.get("BASE_MODEL_NAME", MODEL_NAME)
ADAPTER_PATH = os.environ.get("ADAPTER_PATH", "")  # optional: LoRA adapter directory
MERGE_ADAPTERS = os.environ.get("MERGE_ADAPTERS", "false").lower() in ("1", "true", "yes")
MODEL_DEVICE = os.environ.get("MODEL_DEVICE", "auto")  # "auto" or explicit like "cuda"
MODEL_API_KEY = os.environ.get("MODEL_API_KEY", "")  # optional auth for your model server

DEFAULT_MAX_NEW_TOKENS = int(os.environ.get("DEFAULT_MAX_NEW_TOKENS", "512"))


def _check_model_server_key(authorization: Optional[str]) -> None:
    if not MODEL_API_KEY:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if token != MODEL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid model server API key")


def _get_role(messages: List[Dict[str, Any]], role: str) -> str:
    for m in reversed(messages):
        if m.get("role") == role and isinstance(m.get("content"), str):
            return m["content"]
    return ""


def _build_chat_prompt(messages: List[Dict[str, Any]], system: Optional[str]) -> str:
    """
    Prefer tokenizer.apply_chat_template when available (Llama 3-style models).
    Falls back to a simple prompt format.
    """
    system_content = system or _get_role(messages, "system")
    normalized: List[Dict[str, str]] = []
    if system_content:
        normalized.append({"role": "system", "content": system_content})

    for m in messages:
        if m.get("role") in ("user", "assistant", "system") and isinstance(m.get("content"), str):
            if m["role"] == "system":
                continue
            normalized.append({"role": m["role"], "content": m["content"]})

    if hasattr(tokenizer, "apply_chat_template"):
        # Many open chat models accept OpenAI-style messages with roles.
        return tokenizer.apply_chat_template(
            normalized,
            tokenize=False,
            add_generation_prompt=True,
        )

    # Fallback.
    parts: List[str] = []
    if system_content:
        parts.append(f"System: {system_content}")
    for m in normalized:
        parts.append(f"{m['role'].capitalize()}: {m['content']}")
    parts.append("Assistant:")
    return "\n".join(parts)


print(f"[model-server] Loading base model: {BASE_MODEL_NAME}")
tokenizer_source = ADAPTER_PATH if ADAPTER_PATH else BASE_MODEL_NAME
tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, use_fast=True)

device_map: Optional[str] = None
if MODEL_DEVICE == "auto":
    device_map = "auto"

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_NAME,
    torch_dtype="auto",
    device_map=device_map,
)

if ADAPTER_PATH:
    print(f"[model-server] Loading LoRA adapter from: {ADAPTER_PATH}")
    from peft import PeftModel

    model = PeftModel.from_pretrained(model, ADAPTER_PATH)
    if MERGE_ADAPTERS:
        print("[model-server] Merging adapters into base model...")
        model = model.merge_and_unload()

model.eval()
print("[model-server] Model loaded.")


@app.get("/v1/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.post("/v1/chat/completions")
async def chat_completions(request: Request, authorization: Optional[str] = Header(default=None)):
    _check_model_server_key(authorization)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        raise HTTPException(status_code=400, detail="messages must be a non-empty array")

    stream = bool(body.get("stream", False))
    max_tokens = body.get("max_tokens")
    temperature = body.get("temperature", 0.7)
    system = body.get("system")  # optional convenience field

    try:
        max_new_tokens = int(max_tokens) if max_tokens is not None else DEFAULT_MAX_NEW_TOKENS
    except Exception:
        max_new_tokens = DEFAULT_MAX_NEW_TOKENS

    prompt = _build_chat_prompt(messages, system)

    # Tokenize prompt.
    inputs = tokenizer(prompt, return_tensors="pt")
    # Only move tensors when we are not relying on device_map="auto".
    if MODEL_DEVICE != "auto":
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

    if not stream:
        output_ids = model.generate(
            **inputs,
            do_sample=True,
            temperature=float(temperature),
            max_new_tokens=max_new_tokens,
            pad_token_id=getattr(tokenizer, "eos_token_id", None),
        )
        # Decode only the generated continuation portion (tokens after prompt).
        input_len = int(inputs["input_ids"].shape[-1])
        completion_ids = output_ids[0][input_len:]
        completion = tokenizer.decode(completion_ids, skip_special_tokens=True).strip()

        result = {
            "id": "chatcmpl-local",
            "object": "chat.completion",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": completion},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None},
        }
        return JSONResponse(result)

    # Streaming: we use transformers TextIteratorStreamer and stream "delta.content".
    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )

    gen_kwargs = dict(
        **inputs,
        streamer=streamer,
        do_sample=True,
        temperature=float(temperature),
        max_new_tokens=max_new_tokens,
        pad_token_id=getattr(tokenizer, "eos_token_id", None),
    )

    thread = threading.Thread(target=model.generate, kwargs=gen_kwargs)
    thread.start()

    def event_stream():
        try:
            for piece in streamer:
                if not piece:
                    continue
                chunk = {"choices": [{"delta": {"content": piece}}]}
                yield f"data: {json.dumps(chunk)}\n\n"
        finally:
            # The Next.js adapter will ignore [DONE], but it is OpenAI-compatible.
            yield "data: [DONE]\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # helps some proxies disable buffering
    }
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)

