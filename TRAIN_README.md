# 🧠 Fine-Tuning Guide — 3B Parameter Model

Complete reference for fine-tuning Llama 3.2 3B (or Phi-3 Mini / Qwen 2.5 3B) on Google Colab using LoRA + Unsloth.

---

## 📐 Expected Dataset Formats

### Format 1: Alpaca (Instruction Tuning)

Simple `instruction → output` format. Best for single-turn Q&A and task completion.

```jsonl
{"instruction": "What is the capital of France?", "input": "", "output": "The capital of France is Paris."}
{"instruction": "Summarize the following text:", "input": "The Eiffel Tower was built in 1889...", "output": "The Eiffel Tower, constructed in 1889, is a famous landmark in Paris."}
{"instruction": "Write a Python function to add two numbers.", "input": "", "output": "def add(a, b):\n    return a + b"}
```

**When to use:** Simple instruction following, single-turn tasks, domain-specific Q&A.

---

### Format 2: ShareGPT (Conversation / Multi-turn)

Multi-turn conversation format. Each entry has a list of conversation turns.

```jsonl
{"conversations": [{"from": "human", "value": "Hi! What can you help me with?"}, {"from": "gpt", "value": "I can help with writing, coding, analysis, math, and much more! What do you need?"}]}
{"conversations": [{"from": "human", "value": "Explain LoRA in simple terms."}, {"from": "gpt", "value": "LoRA (Low-Rank Adaptation) is a technique that fine-tunes large models efficiently by only training small 'adapter' matrices instead of all model weights. Think of it like adding sticky notes to a textbook instead of rewriting the whole book."}, {"from": "human", "value": "How much memory does it save?"}, {"from": "gpt", "value": "Typically 60-90% less GPU memory compared to full fine-tuning. A 3B model that needs 12GB for full fine-tune might only need 2-4GB with LoRA in 4-bit quantization."}]}
```

**When to use:** Chatbot training, conversational AI, multi-turn dialogue systems.

---

### Format 3: OpenAI Chat (Direct API Format)

Standard OpenAI messages format — works directly with chat templates.

```jsonl
{"messages": [{"role": "system", "content": "You are a helpful Tarkari AI assistant."}, {"role": "user", "content": "What is machine learning?"}, {"role": "assistant", "content": "Machine learning is a subset of AI where models learn patterns from data to make predictions or decisions."}]}
{"messages": [{"role": "user", "content": "Write a haiku about coding."}, {"role": "assistant", "content": "Fingers on keyboard\nLogic flows through empty screen\nBugs hide in silence"}]}
```

**When to use:** If you already have data in OpenAI format, this is the easiest to use with `trl`'s `apply_chat_template`.

---

## 💾 Data Preparation Tips

```python
# Minimum recommended dataset sizes:
# - Quick test run:      50-200 samples
# - Basic fine-tune:     1,000-5,000 samples
# - Good fine-tune:      10,000-50,000 samples
# - Production quality:  100,000+ samples

# Quality > Quantity. 1,000 high-quality pairs beats 10,000 noisy ones.

# Recommended train/eval split: 90% train, 10% eval
# Use datasets from HuggingFace Hub:
# - mlabonne/FineTome-100k (ShareGPT format, high quality)
# - tatsu-lab/alpaca (Alpaca format, 52K samples)
# - Open-Orca/OpenOrca (GPT-4 quality, instruction format)
```

---

## ⚙️ Training Constraints

### Hardware Requirements

| GPU | VRAM | Batch Size | Seq Length | Notes |
|-----|------|-----------|------------|-------|
| T4 (Colab Free) | 15GB | 1-2 | 1024-2048 | Use 4-bit + gradient checkpointing |
| A100 40GB (Colab Pro+) | 40GB | 4-8 | 2048-4096 | Fastest option |
| RTX 3090/4090 (local) | 24GB | 2-4 | 2048 | Good for local training |

### LoRA vs Full Fine-Tune

| | LoRA | Full Fine-Tune |
|---|------|---------------|
| Memory | 2-4GB VRAM | 12-24GB VRAM |
| Speed | Fast | Slow |
| Quality | 90-95% of full | 100% |
| Colab viable | ✅ Yes | ❌ No (3B+) |
| Recommended | ✅ Yes | Only with A100 |

**Always use LoRA** on Colab. Full fine-tuning a 3B model requires 40GB+ VRAM.

---

## 🎛️ Recommended Hyperparameters (3B Model, Colab)

```python
# LoRA Configuration
lora_r = 16                    # Rank: 8 for fast, 16 for balanced, 32 for high quality
lora_alpha = 32                # Usually 2x rank
lora_dropout = 0.05            # Light dropout
target_modules = [             # Modules to adapt (all projection layers)
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj"
]

# Training Arguments
per_device_train_batch_size = 2        # For T4 (15GB). Use 4 for A100.
gradient_accumulation_steps = 4        # Effective batch = 2 * 4 = 8
num_train_epochs = 1                   # 1-3 epochs for instruction tuning
max_steps = -1                         # Set to 100-200 for quick test
learning_rate = 2e-4                   # Standard for LoRA
lr_scheduler_type = "cosine"           # Cosine decay
warmup_ratio = 0.05                    # 5% warmup steps
optim = "adamw_8bit"                   # 8-bit Adam saves ~2GB VRAM
weight_decay = 0.01
max_seq_length = 2048                  # 1024 for T4, 2048 for A100
fp16 = True                            # T4 doesn't support bf16
bf16 = False                           # Set True for A100/H100
gradient_checkpointing = True          # Essential for T4 memory
```

---

## 🏗️ Data Structure for Instruction Tuning

The key is applying the correct **chat template** for your model. Llama 3.2 uses:

```
<|begin_of_text|>
<|start_header_id|>system<|end_header_id|>
You are a helpful Tarkari AI assistant.<|eot_id|>
<|start_header_id|>user<|end_header_id|>
{user_message}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
{assistant_response}<|eot_id|>
```

Unsloth applies this automatically via `get_chat_template("llama-3")`.

**Training loss should only be computed on assistant turns** — use `train_on_responses_only()` from Unsloth.

---

## 🧪 Evaluating Your Fine-Tuned Model

```python
# Basic inference test after training
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./outputs/checkpoint-final",
    max_seq_length=2048,
    load_in_4bit=True,
)
FastLanguageModel.for_inference(model)

messages = [{"role": "user", "content": "Tell me about yourself."}]
inputs = tokenizer.apply_chat_template(messages, return_tensors="pt").to("cuda")
outputs = model.generate(inputs, max_new_tokens=256, temperature=0.7)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

---

## 🚀 Deployment After Training

1. **HuggingFace Hub** (easiest) — Push from Colab, use Inference Endpoints
2. **vLLM** (production) — `pip install vllm && vllm serve your-model/name`
3. **Ollama** (local) — Convert to GGUF, then `ollama create mymodel -f Modelfile`
4. **Google Cloud / AWS** — Deploy vLLM on GPU instance

Point this web app's `AI_BASE_URL` at any OpenAI-compatible server and it works instantly.

---

## 📚 Recommended Public Datasets

| Dataset | Format | Samples | Quality |
|---------|--------|---------|---------|
| `mlabonne/FineTome-100k` | ShareGPT | 100K | ⭐⭐⭐⭐⭐ |
| `tatsu-lab/alpaca` | Alpaca | 52K | ⭐⭐⭐⭐ |
| `Open-Orca/OpenOrca` | OpenAI Chat | 4M | ⭐⭐⭐⭐⭐ |
| `WizardLM/WizardLM_evol_instruct_V2_196k` | Alpaca | 196K | ⭐⭐⭐⭐⭐ |
| `teknium/OpenHermes-2.5` | ShareGPT | 1M | ⭐⭐⭐⭐⭐ |
