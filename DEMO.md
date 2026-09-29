# 📡 RepoRadar — Live Demo Guide & Runbook

This guide covers everything needed to deliver an 8-minute live demo of **RepoRadar**.

---

## ⚡ 1. Service Startup Commands

Open 3 separate terminal tabs:

### Terminal 1: Backend Server (Port 5000)
```bash
cd server
npm run dev
```
*Expected log:* `⚡ Server running on http://localhost:5000 in development mode`

### Terminal 2: AI Microservice (Port 8000)
```bash
cd ai-service
# Activate virtual environment:
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # macOS / Linux
uvicorn app.main:app --reload --port 8000
```
*Expected log:* `Application startup complete. Uvicorn running on http://127.0.0.1:8000`

### Terminal 3: Frontend Client (Port 3000)
```bash
cd client
npm run dev
```
*Expected log:* `Ready in ...ms - http://localhost:3000`

---

## 🩺 2. Quick Health Check (Run before presenting)

You can verify all three services in your browser or with `curl`:
- **Server Health:** [http://localhost:5000/api/health](http://localhost:5000/api/health) `{"status":"ok"}`
- **AI Service Health:** [http://localhost:8000/health](http://localhost:8000/health) `{"status":"ok"}`
- **LLM Connection:** [http://localhost:8000/health/llm](http://localhost:8000/health/llm)
- **Server-to-AI Gateway:** [http://localhost:5000/api/ai/health](http://localhost:5000/api/ai/health)

---

## 📁 3. Planted Demo Repository Template

Create a new repository on GitHub (e.g. `reporadar-demo-app`) and push the following files:

### `package.json`
```json
{
  "name": "reporadar-demo-app",
  "version": "1.0.0",
  "description": "Demo application for RepoRadar code intelligence",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  }
}
```

### `src/config.ts`
```typescript
export const AppConfig = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || "development",
  appName: "DemoApp"
};
```

### `src/auth.ts` *(Planted: Hardcoded Secret)*
```typescript
import jwt from "jsonwebtoken";

// ⚠️ Planted Security Issue: Hardcoded API Key & JWT Secret
export const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
export const JWT_SECRET_KEY = "super_secret_master_key_12345";

export function generateUserToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET_KEY, { expiresIn: "1h" });
}
```

### `src/users.ts` *(Planted: SQL Injection & Unused Variable)*
```typescript
import db from "./db";

export async function findUserByEmail(userEmail: string) {
  // ⚠️ Planted Bug Issue: Unused Variable
  const unusedTempUserData = { queriedAt: new Date() };

  // ⚠️ Planted Security Issue: String-concatenated SQL Injection
  const query = "SELECT * FROM users WHERE email = '" + userEmail + "' AND is_active = 1";
  return await db.query(query);
}
```

### `src/profile.ts` *(Planted: XSS via innerHTML)*
```typescript
export function renderUserProfile(username: string, bio: string) {
  const userContainer = document.getElementById("user-profile");
  if (userContainer) {
    // ⚠️ Planted Security Issue: DOM XSS via innerHTML
    userContainer.innerHTML = "<div class='profile'><h3>" + username + "</h3><p>" + bio + "</p></div>";
  }
}
```

### `src/analytics.ts` *(Planted: Very Long Function > 50 Lines)*
```typescript
export function processRawEventStream(events: any[]) {
  // ⚠️ Planted Code Smell: Function exceeding 50 lines with complex branching
  const results: Record<string, any> = {};
  let totalProcessed = 0;
  let errorCount = 0;
  let retryCount = 0;

  for (let i = 0; i < events.length; i++) {
    const item = events[i];
    if (!item) continue;
    
    if (item.type === "CLICK") {
      results["clicks"] = (results["clicks"] || 0) + 1;
      totalProcessed++;
    } else if (item.type === "PAGE_VIEW") {
      results["page_views"] = (results["page_views"] || 0) + 1;
      totalProcessed++;
    } else if (item.type === "PURCHASE") {
      results["purchases"] = (results["purchases"] || 0) + 1;
      totalProcessed++;
      if (item.amount > 100) {
        results["high_value_purchases"] = (results["high_value_purchases"] || 0) + 1;
      }
    } else if (item.type === "SCROLL") {
      results["scrolls"] = (results["scrolls"] || 0) + 1;
      totalProcessed++;
    } else if (item.type === "HOVER") {
      results["hovers"] = (results["hovers"] || 0) + 1;
      totalProcessed++;
    } else if (item.type === "SUBMIT") {
      results["submits"] = (results["submits"] || 0) + 1;
      totalProcessed++;
    } else if (item.type === "ERROR") {
      errorCount++;
      results["errors"] = (results["errors"] || 0) + 1;
    } else if (item.type === "RETRY") {
      retryCount++;
      results["retries"] = (results["retries"] || 0) + 1;
    } else {
      results["unknown"] = (results["unknown"] || 0) + 1;
    }

    if (item.metadata) {
      for (const key of Object.keys(item.metadata)) {
        results[`meta_${key}`] = (results[`meta_${key}`] || 0) + 1;
      }
    }
  }

  results["summary"] = {
    total: totalProcessed,
    errors: errorCount,
    retries: retryCount,
    successRate: totalProcessed > 0 ? ((totalProcessed - errorCount) / totalProcessed) * 100 : 0
  };

  return results;
}
```

---

## ⏱️ 4. 8-Minute Demo Walkthrough Order

| Time | Step | Screen / Action | What to Explain |
| :--- | :--- | :--- | :--- |
| **0:00 - 1:00** | **Login & Dashboard** | `http://localhost:3000/login` ➡️ Sign in with GitHub | Highlight OAuth token encryption with AES-256 at rest. Show multi-repo health overview. |
| **1:00 - 2:00** | **Sync & Telemetry** | `/dashboard/repositories` ➡️ "Sync Repositories" ➡️ Select Demo Repo | Show repository discovery via Octokit, commit timeline, and language percentage chart. |
| **2:00 - 3:00** | **Code Tree & Static Analysis** | Repo Detail ➡️ "Explore Code Tree" ➡️ "Static Analysis" ➡️ "Re-analyze" | Show AST file explorer. Point out detected planted issues: SQL injection, hardcoded secret, innerHTML XSS, and long function. |
| **3:00 - 4:00** | **AI Fixes & Health Score** | Analysis Tab ➡️ Click **"Get AI Fix"** on SQL injection ➡️ "Health Scorecard" | Show instant remediation generation and caching. Show letter grade (e.g. C / D) and weighted score deductions. |
| **4:00 - 5:30** | **Developer Analytics & Hotspots** | Analytics Tab ➡️ "Sync Commit Data" | Show Contributor Leaderboard, 7x24 Punchcard Heatmap, and File Hotspot Debt Score rankings. |
| **5:30 - 7:00** | **Semantic Search & RAG Chat** | Search Tab ➡️ "Index Repository" ➡️ Chat Tab | Search for `"token generation"`. Ask chat grounded questions with cited file chips. |
| **7:00 - 8:00** | **PR Reviews / Webhooks** | Pull Requests Tab ➡️ Show PR review card | Show diff-only scanning (`+` lines), automated risk assessment, and one-click re-evaluation. |

---

## 💬 5. Curated Demo Chat Questions

Use these exact prompts during the **RAG Repo Chat** demonstration:

1. **Architecture Overview:**  
   *"What does this repository do, and what are its main source files?"*
2. **Security Inquiry:**  
   *"Are there any hardcoded credentials or secrets in our authentication flow?"*
3. **Database & Query Flow:**  
   *"How does the user lookup function query the database in `src/users.ts`?"*
4. **Data Processing:**  
   *"Explain the event processing logic in `src/analytics.ts`."*
5. **Code Fix Recommendation:**  
   *"How should we sanitize `renderUserProfile` to prevent DOM XSS?"*
6. **Out-of-Context Grounding Test (Demonstrates zero hallucination):**  
   *"How do I configure Stripe Webhook signatures in this repo?"*  
   *Expected AI answer:* Honestly states that the indexed codebase does not contain Stripe integration.

---

## 🛠️ 6. Troubleshooting Cheat Sheet ("If Something Fails")

| Failure Symptom | Likely Cause | Instant Quick Fix |
| :--- | :--- | :--- |
| **Database Connection Error (MongoDB Atlas)** | Current IP address not whitelisted in Atlas. | Go to **MongoDB Atlas ➡️ Network Access ➡️ Add IP Address ➡️ "Allow Access from Anywhere" (`0.0.0.0/0`)** (for demo). |
| **GitHub OAuth Fails ("redirect_uri mismatch")** | GitHub OAuth App has wrong callback URL. | In GitHub Developer Settings, set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`. |
| **AI Calls / Chat Fail (API Key Issue)** | Missing or out-of-credit OpenAI / Anthropic key. | Set `OPENAI_API_KEY` in `ai-service/.env`. Note: The system has built-in resilient offline fallbacks so it will never crash or hang even without an active key. |
| **Port Conflict (Port 3000 / 5000 / 8000 in use)** | Ghost process from earlier run. | Run in PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess \| Stop-Process -Force` |
| **Atlas Vector Search Unavailable** | MongoDB cluster tier does not have vector index deployed. | **Zero action needed** — RepoRadar automatically falls back to in-memory cosine similarity search seamlessly. |
| **Webhooks Not Receiving Events in Local Dev** | Public ngrok tunnel closed or changed. | Run `ngrok http 5000`, copy the URL to `server/.env` (`WEBHOOK_BASE_URL=...`), restart server, and toggle "Automated Reviews" ON. |
