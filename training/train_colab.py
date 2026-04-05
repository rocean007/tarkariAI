# ============================================================
# Tarkari AI Assistant — Fine-Tuning Notebook (Google Colab)
# Llama 3.2 3B Instruct with LoRA + Unsloth + SFTTrainer
# Supports: Alpaca format, ShareGPT format, OpenAI Chat format
# Works on: T4 (Colab Free), A100 (Colab Pro+)
# ============================================================
# HOW TO USE:
# 1. Upload this file to Google Colab
# 2. Runtime > Change Runtime Type > GPU (T4 or A100)
# 3. Run cells top to bottom
# ============================================================

# ─────────────────────────────────────────────────────────────
# CELL 1: Mount Google Drive
# ─────────────────────────────────────────────────────────────
from google.colab import drive
drive.mount('/content/drive')

DRIVE_SAVE_PATH = "/content/drive/MyDrive/TarkariAI_Training"
import os
os.makedirs(DRIVE_SAVE_PATH, exist_ok=True)
print(f"✅ Drive mounted. Outputs will be saved to: {DRIVE_SAVE_PATH}")

# ─────────────────────────────────────────────────────────────
# CELL 2: Check GPU
# ─────────────────────────────────────────────────────────────
import subprocess
result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
print(result.stdout)

import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB" if torch.cuda.is_available() else "")

# ─────────────────────────────────────────────────────────────
# CELL 3: Install Dependencies
# Note: Unsloth is used for 2x faster training + 70% less VRAM
# ─────────────────────────────────────────────────────────────
print("Installing dependencies... (this takes ~3 minutes on first run)")

import subprocess, sys

def pip_install(pkg):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])

# Install Unsloth and dependencies
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q",
    "--no-deps", "bitsandbytes", "accelerate", "xformers==0.0.29.post3",
    "peft", "trl", "triton", "cut_cross_entropy", "unsloth_zoo"
])
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q",
    "sentencepiece", "protobuf", "datasets>=3.4.1", "huggingface_hub", "hf_transfer"
])
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q",
    "--no-deps", "unsloth"
])

print("✅ All dependencies installed!")

# ─────────────────────────────────────────────────────────────
# CELL 4: Configuration — Edit These Settings
# ─────────────────────────────────────────────────────────────

# ── Model Selection ──────────────────────────────────────────
MODEL_NAME = "unsloth/Llama-3.2-3B-Instruct-bnb-4bit"
# Alternatives (all 4-bit quantized, Colab-ready):
# "unsloth/Phi-3-mini-4k-instruct-bnb-4bit"       # Microsoft Phi-3 Mini
# "unsloth/Qwen2.5-3B-Instruct-bnb-4bit"          # Alibaba Qwen 2.5
# "unsloth/Llama-3.2-1B-Instruct-bnb-4bit"        # Smaller/faster

# ── Dataset Selection ────────────────────────────────────────
DATASET_SOURCE = "huggingface"  # "huggingface" | "local" | "upload"
DATASET_NAME = "mlabonne/FineTome-100k"  # HuggingFace dataset ID
DATASET_FORMAT = "sharegpt"  # "sharegpt" | "alpaca" | "openai"
MAX_SAMPLES = 5000  # Set to None for full dataset (very slow on T4)

# If DATASET_SOURCE = "local", set path:
LOCAL_DATASET_PATH = "/content/drive/MyDrive/my_dataset.jsonl"

# ── Training Hyperparameters ─────────────────────────────────
MAX_SEQ_LENGTH = 2048   # Reduce to 1024 if OOM on T4
LOAD_IN_4BIT = True     # Always True for Colab

# LoRA Config
LORA_R = 16             # Rank: 8=fast, 16=balanced, 32=high quality
LORA_ALPHA = 32         # Usually 2x rank
LORA_DROPOUT = 0.05

# Training Args
BATCH_SIZE = 2          # 1-2 for T4, 4-8 for A100
GRAD_ACCUM = 4          # Effective batch = BATCH_SIZE * GRAD_ACCUM
NUM_EPOCHS = 1          # 1-3 epochs recommended
MAX_STEPS = 200         # Set to -1 for full training (slow!)
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.05
WEIGHT_DECAY = 0.01
SEED = 3407

# ── Output & Hub ─────────────────────────────────────────────
OUTPUT_DIR = "/content/outputs"
HF_USERNAME = "your-username"        # Your HuggingFace username
HF_REPO_NAME = "my-llama-3.2-finetuned"  # Repository name
PUSH_TO_HUB = False     # Set True after adding HF token

print("✅ Configuration set!")
print(f"   Model: {MODEL_NAME}")
print(f"   Dataset: {DATASET_NAME} ({DATASET_FORMAT} format)")
print(f"   Max samples: {MAX_SAMPLES}")
print(f"   LoRA rank: {LORA_R}")
print(f"   Effective batch size: {BATCH_SIZE * GRAD_ACCUM}")
print(f"   Max steps: {MAX_STEPS}")

# ─────────────────────────────────────────────────────────────
# CELL 5: HuggingFace Login (required for gated models + Hub push)
# ─────────────────────────────────────────────────────────────
from huggingface_hub import login
from google.colab import userdata

# Recommended: Store token in Colab Secrets (left panel key icon)
try:
    hf_token = userdata.get('HF_TOKEN')
    login(token=hf_token)
    print("✅ Logged in to HuggingFace via Colab secret!")
except Exception:
    print("⚠️  No HF_TOKEN secret found.")
    print("   Add it via Colab's key icon (left sidebar) for Hub pushing.")
    print("   Or run: login(token='hf_your_token_here')")
    # Uncomment and add your token if needed:
    # login(token="hf_YOUR_TOKEN_HERE")

# ─────────────────────────────────────────────────────────────
# CELL 6: Load Model with Unsloth (4-bit quantized)
# ─────────────────────────────────────────────────────────────
from unsloth import FastLanguageModel
import torch

print(f"Loading model: {MODEL_NAME}")
print("This may take 2-5 minutes on first run (downloading ~2GB)...")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,             # Auto-detect: float16 for T4, bfloat16 for A100
    load_in_4bit=LOAD_IN_4BIT,
)

print(f"✅ Model loaded!")
print(f"   Parameters: {sum(p.numel() for p in model.parameters()) / 1e9:.2f}B")
print(f"   VRAM used: {torch.cuda.memory_allocated() / 1e9:.2f} GB")

# ─────────────────────────────────────────────────────────────
# CELL 7: Apply LoRA Adapters
# ─────────────────────────────────────────────────────────────
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    bias="none",
    use_gradient_checkpointing="unsloth",   # Saves ~30% VRAM
    random_state=SEED,
    use_rslora=False,
    loftq_config=None,
)

trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print(f"✅ LoRA adapters applied!")
print(f"   Trainable params: {trainable:,} ({100*trainable/total:.2f}% of total)")
print(f"   Frozen params:    {total - trainable:,}")

# ─────────────────────────────────────────────────────────────
# CELL 8: Load and Format Dataset
# ─────────────────────────────────────────────────────────────
from datasets import load_dataset, Dataset
from unsloth.chat_templates import get_chat_template, standardize_sharegpt
import json

# Apply the correct chat template for our model
tokenizer = get_chat_template(
    tokenizer,
    chat_template="llama-3",  # "llama-3" | "phi-3" | "qwen-2.5"
)

def format_alpaca(examples):
    """Convert Alpaca format to chat template format."""
    texts = []
    for instruction, inp, output in zip(
        examples["instruction"], examples.get("input", [""]*len(examples["instruction"])), examples["output"]
    ):
        messages = [{"role": "system", "content": "You are a helpful Tarkari AI assistant."}]
        user_content = instruction if not inp else f"{instruction}\n\n{inp}"
        messages.append({"role": "user", "content": user_content})
        messages.append({"role": "assistant", "content": output})
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        texts.append(text)
    return {"text": texts}

def format_openai_chat(examples):
    """Convert OpenAI chat format to text."""
    texts = []
    for messages in examples["messages"]:
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        texts.append(text)
    return {"text": texts}

# Load Dataset
print(f"Loading dataset: {DATASET_SOURCE}")

if DATASET_SOURCE == "huggingface":
    raw_dataset = load_dataset(DATASET_NAME, split="train")
    if MAX_SAMPLES:
        raw_dataset = raw_dataset.select(range(min(MAX_SAMPLES, len(raw_dataset))))
    print(f"   Loaded {len(raw_dataset)} samples from HuggingFace")

elif DATASET_SOURCE == "local":
    raw_dataset = load_dataset("json", data_files=LOCAL_DATASET_PATH, split="train")
    if MAX_SAMPLES:
        raw_dataset = raw_dataset.select(range(min(MAX_SAMPLES, len(raw_dataset))))
    print(f"   Loaded {len(raw_dataset)} samples from local file")

elif DATASET_SOURCE == "upload":
    from google.colab import files
    print("Please upload your JSONL file:")
    uploaded = files.upload()
    filename = list(uploaded.keys())[0]
    raw_dataset = load_dataset("json", data_files=filename, split="train")
    if MAX_SAMPLES:
        raw_dataset = raw_dataset.select(range(min(MAX_SAMPLES, len(raw_dataset))))
    print(f"   Loaded {len(raw_dataset)} samples from uploaded file")

# Format dataset based on its format
print(f"Formatting dataset as: {DATASET_FORMAT}")

if DATASET_FORMAT == "sharegpt":
    # Standardize ShareGPT format (handles "human"/"gpt" -> "user"/"assistant")
    dataset = standardize_sharegpt(raw_dataset)
    dataset = dataset.map(
        lambda examples: {
            "text": [
                tokenizer.apply_chat_template(conv, tokenize=False, add_generation_prompt=False)
                for conv in examples["conversations"]
            ]
        },
        batched=True,
        remove_columns=dataset.column_names,
    )

elif DATASET_FORMAT == "alpaca":
    dataset = raw_dataset.map(format_alpaca, batched=True, remove_columns=raw_dataset.column_names)

elif DATASET_FORMAT == "openai":
    dataset = raw_dataset.map(format_openai_chat, batched=True, remove_columns=raw_dataset.column_names)

print(f"✅ Dataset formatted! {len(dataset)} samples ready.")
print(f"\nSample formatted text (first 500 chars):")
print(dataset[0]["text"][:500])
print("...")

# ─────────────────────────────────────────────────────────────
# CELL 9: Configure and Run Training
# ─────────────────────────────────────────────────────────────
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM
from transformers import TrainingArguments, DataCollatorForSeq2Seq
from unsloth import is_bfloat16_supported
from unsloth.chat_templates import train_on_responses_only

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    data_collator=DataCollatorForSeq2Seq(tokenizer=tokenizer),
    dataset_num_proc=2,
    packing=False,
    args=TrainingArguments(
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        warmup_ratio=WARMUP_RATIO,
        num_train_epochs=NUM_EPOCHS,
        max_steps=MAX_STEPS,
        learning_rate=LEARNING_RATE,
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=10,
        optim="adamw_8bit",
        weight_decay=WEIGHT_DECAY,
        lr_scheduler_type="cosine",
        seed=SEED,
        output_dir=OUTPUT_DIR,
        save_strategy="steps",
        save_steps=50,
        report_to="none",       # Set "wandb" if you use Weights & Biases
    ),
)

# CRITICAL: Only compute loss on assistant responses, not user input
# This dramatically improves training quality
trainer = train_on_responses_only(
    trainer,
    instruction_part="<|start_header_id|>user<|end_header_id|>\n\n",
    response_part="<|start_header_id|>assistant<|end_header_id|>\n\n",
)

print("🚀 Starting training!")
print(f"   Effective batch size: {BATCH_SIZE * GRAD_ACCUM}")
print(f"   Max steps: {MAX_STEPS}")
print(f"   Learning rate: {LEARNING_RATE}")
print(f"   Training on responses only: YES (better quality)")

import time
start_time = time.time()
train_stats = trainer.train()
elapsed = time.time() - start_time

print(f"\n✅ Training complete!")
print(f"   Time: {elapsed/60:.1f} minutes")
print(f"   Final loss: {train_stats.training_loss:.4f}")
print(f"   Steps: {train_stats.global_step}")

# ─────────────────────────────────────────────────────────────
# CELL 10: Memory Stats After Training
# ─────────────────────────────────────────────────────────────
gpu_stats = torch.cuda.get_device_properties(0)
used_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
max_memory = round(gpu_stats.total_memory / 1024 / 1024 / 1024, 3)
print(f"Peak GPU memory used: {used_memory} / {max_memory} GB")
print(f"Memory efficiency: {100*used_memory/max_memory:.1f}%")

# ─────────────────────────────────────────────────────────────
# CELL 11: Save Model Locally + to Google Drive
# ─────────────────────────────────────────────────────────────
import shutil

# Save LoRA adapters only (small, ~50-200MB)
LOCAL_ADAPTER_PATH = f"{OUTPUT_DIR}/lora-adapters"
model.save_pretrained(LOCAL_ADAPTER_PATH)
tokenizer.save_pretrained(LOCAL_ADAPTER_PATH)
print(f"✅ LoRA adapters saved to: {LOCAL_ADAPTER_PATH}")

# Copy to Google Drive
DRIVE_ADAPTER_PATH = f"{DRIVE_SAVE_PATH}/lora-adapters"
shutil.copytree(LOCAL_ADAPTER_PATH, DRIVE_ADAPTER_PATH, dirs_exist_ok=True)
print(f"✅ Copied to Google Drive: {DRIVE_ADAPTER_PATH}")

# Optional: Save merged model (full weights, ~6-7GB) to Drive
SAVE_MERGED = False  # Set True if you want a standalone merged model
if SAVE_MERGED:
    print("Merging LoRA into base model (takes ~5 minutes)...")
    merged_path = f"{OUTPUT_DIR}/merged-model"
    model.save_pretrained_merged(merged_path, tokenizer, save_method="merged_16bit")
    drive_merged = f"{DRIVE_SAVE_PATH}/merged-model"
    shutil.copytree(merged_path, drive_merged, dirs_exist_ok=True)
    print(f"✅ Merged model saved to Drive: {drive_merged}")

# ─────────────────────────────────────────────────────────────
# CELL 12: Push to HuggingFace Hub
# ─────────────────────────────────────────────────────────────
if PUSH_TO_HUB:
    HF_REPO_ID = f"{HF_USERNAME}/{HF_REPO_NAME}"
    print(f"Pushing to HuggingFace Hub: {HF_REPO_ID}")

    # Push LoRA adapters (recommended — small and fast)
    model.push_to_hub(HF_REPO_ID, token=True)
    tokenizer.push_to_hub(HF_REPO_ID, token=True)
    print(f"✅ LoRA adapters pushed to: https://huggingface.co/{HF_REPO_ID}")

    # Optional: Push merged model (full weights)
    # model.push_to_hub_merged(HF_REPO_ID + "-merged", tokenizer, save_method="merged_16bit", token=True)
else:
    print("ℹ️  Set PUSH_TO_HUB = True to push model to HuggingFace Hub")

# ─────────────────────────────────────────────────────────────
# CELL 13: Inference — Test Your Fine-Tuned Model!
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("🧪 INFERENCE TEST — Chatting with your fine-tuned model")
print("=" * 60)

# Switch to inference mode (2x faster, uses less VRAM)
FastLanguageModel.for_inference(model)

def chat(user_message, system="You are a helpful Tarkari AI assistant.", max_new_tokens=512, temperature=0.7):
    """Simple chat function for testing your model."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_message},
    ]
    input_ids = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to("cuda")

    with torch.no_grad():
        outputs = model.generate(
            input_ids=input_ids,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=True if temperature > 0 else False,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode only the new tokens (not the input)
    new_tokens = outputs[0][input_ids.shape[-1]:]
    return tokenizer.decode(new_tokens, skip_special_tokens=True)


# Run some test prompts
test_prompts = [
    "Tell me about yourself.",
    "What is machine learning? Explain simply.",
    "Write a short Python function to reverse a string.",
]

for i, prompt in enumerate(test_prompts, 1):
    print(f"\n── Test {i} ──────────────────────────────────────────")
    print(f"👤 User: {prompt}")
    response = chat(prompt)
    print(f"🤖 Assistant: {response}")

print("\n" + "=" * 60)
print("✅ Inference tests complete!")
print("=" * 60)

# ─────────────────────────────────────────────────────────────
# CELL 14: Streaming Inference (like ChatGPT)
# ─────────────────────────────────────────────────────────────
from transformers import TextStreamer

def chat_streaming(user_message, system="You are a helpful Tarkari AI assistant.", max_new_tokens=512):
    """Stream tokens in real-time — looks like ChatGPT."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_message},
    ]
    input_ids = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to("cuda")

    streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    print(f"\n👤 User: {user_message}")
    print("🤖 Assistant: ", end="", flush=True)

    with torch.no_grad():
        model.generate(
            input_ids=input_ids,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
            streamer=streamer,
        )

# Try streaming
chat_streaming("Explain LoRA fine-tuning in 3 bullet points.")

# ─────────────────────────────────────────────────────────────
# CELL 15: Save Final GGUF (for Ollama / llama.cpp deployment)
# ─────────────────────────────────────────────────────────────
SAVE_GGUF = False  # Set True to create Ollama-compatible GGUF file
GGUF_QUANT = "q4_k_m"  # "q4_k_m" | "q8_0" | "f16"

if SAVE_GGUF:
    print(f"Converting to GGUF format ({GGUF_QUANT})...")
    gguf_path = f"{OUTPUT_DIR}/model-{GGUF_QUANT}.gguf"
    model.save_pretrained_gguf(
        f"{OUTPUT_DIR}/gguf",
        tokenizer,
        quantization_method=GGUF_QUANT
    )
    drive_gguf = f"{DRIVE_SAVE_PATH}/gguf"
    shutil.copytree(f"{OUTPUT_DIR}/gguf", drive_gguf, dirs_exist_ok=True)
    print(f"✅ GGUF saved to Drive: {drive_gguf}")
    print(f"   Import into Ollama: ollama create mymodel -f Modelfile")
else:
    print("ℹ️  Set SAVE_GGUF = True to export for Ollama/llama.cpp")

print("\n🎉 Training notebook complete!")
print(f"Your model is at: {DRIVE_ADAPTER_PATH}")
print("Next steps:")
print("  1. Deploy to HuggingFace Inference Endpoints")
print("  2. Run vLLM: pip install vllm && vllm serve your-model-id")
print("  3. Point this web app's AI_BASE_URL at your endpoint")
