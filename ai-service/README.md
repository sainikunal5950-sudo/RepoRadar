# 🧠 RepoRadar AI Microservice

> **FastAPI-powered internal AI service for code explanation, whole-file summarization, and issue remediation.**

This service exposes internal REST endpoints called exclusively by the Express backend gateway to handle LLM operations (via OpenAI or Anthropic).

---

## 🛠️ Architecture

```
Express Backend (port 5000) ──[ X-API-Key ]──► FastAPI AI Service (port 8000) ──► LLM API (OpenAI/Anthropic)
```

- **Internal Only:** Not exposed directly to the browser.
- **Shared Secret:** Requires `X-API-Key` header matching `AI_SERVICE_API_KEY`.
- **Provider Agnostic:** Easily switch between OpenAI (`gpt-4o-mini`, `gpt-4o`) and Anthropic (`claude-sonnet-4-6`).

---

## 🚀 Getting Started

### 1. Create Virtual Environment & Install Dependencies

```bash
cd ai-service
python -m venv venv
.\venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)

```ini
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4o-mini
MAX_TOKENS=2000
TEMPERATURE=0.2
AI_SERVICE_API_KEY=reporadar-ai-service-secret-key-change-in-production
PORT=8000
```

### 3. Run the Service

```bash
uvicorn app.main:app --reload --port 8000
```

---

## 📡 Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Service liveness probe |
| `GET` | `/health/llm` | None | Tests live LLM provider connectivity |
| `POST` | `/api/explain/code` | `X-API-Key` | Explains code snippet in structured JSON |
| `POST` | `/api/explain/file` | `X-API-Key` | Summarizes full file architecture & exports |
| `POST` | `/api/suggest/fix` | `X-API-Key` | Generates targeted fix for a static code issue |
| `POST` | `/api/suggest/fixes/batch` | `X-API-Key` | Batch fix generation (max 10 issues) |

---

## 🧪 Testing

```bash
pytest
```
