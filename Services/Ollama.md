# Ollama — Local LLM Inference

> Provides local large language model inference on argus, powered by the RTX 3060. No API keys, no external calls, no usage costs.

---

## Configuration

| Setting | Value |
|---------|-------|
| Listening address | `127.0.0.1:11434` (localhost only) |
| Service type | systemd host service (not Docker) |
| Primary model | `qwen2.5:14b` |
| GPU | NVIDIA RTX 3060 (12GB VRAM) |

> **Why localhost only?** Ollama has no authentication. Binding to `127.0.0.1` prevents any other host or container from reaching it without explicit forwarding. This is the correct posture for a local inference server.

---

## Hardware Context

| Component | Spec | Role |
|-----------|------|------|
| GPU | RTX 3060 | 12GB VRAM — primary inference hardware |
| RAM | 15GB system | Overflow if VRAM exceeded |

A 14B parameter model quantised to 4-bit fits comfortably within 12GB VRAM. GPU inference is significantly faster than CPU-only.

---

## Primary Model: qwen2.5:14b

| Attribute | Value |
|-----------|-------|
| Developer | Alibaba / Qwen team |
| Parameters | 14 billion |
| Quantisation | 4-bit (Q4_K_M) |
| Use case | General purpose — code, analysis, reasoning |

---

## Key Concepts for Learning

### What is inference?
Running a trained AI model to generate outputs. Training is the expensive, one-time process — inference is what happens every time you ask it a question. Ollama handles inference locally.

### What is quantisation?
Reducing the numerical precision of model weights to save VRAM:
- FP32 (full): 32 bits per param — 14B model = ~56GB VRAM (impossible)
- FP16 (half): 16 bits — ~28GB (still too large)
- INT4 / Q4: 4 bits — ~7–8GB ✅ fits in 12GB with headroom

Quality degrades slightly at Q4 but is acceptable for most tasks.

### What is a context window?
The number of tokens (roughly words) the model can process at once. Larger context = can handle longer documents. Context is stored in VRAM alongside model weights.

### Base model vs instruction-tuned
- **Base model:** predicts the next token — completes text
- **Instruction-tuned (chat):** fine-tuned on instruction/response pairs — follows directions and converses

Most models used via Ollama are instruction-tuned variants.

---

## Usage

```bash
# List downloaded models
ollama list

# Pull a model
ollama pull qwen2.5:14b

# Interactive session
ollama run qwen2.5:14b

# API call from argus
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:14b",
  "prompt": "Explain what auditd does.",
  "stream": false
}'
```

Ollama's API is **OpenAI-compatible** — tools supporting OpenAI can be pointed at Ollama instead. This makes it compatible with n8n Ollama nodes and other automation tooling.

---

## TODO

- TODO: confirm exact systemd unit path for Ollama service

---

## Tags
#homelab #service #ollama #llm #ai #argus #gpu
