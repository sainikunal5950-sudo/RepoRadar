# 🧪 RepoRadar — Complete Manual Testing Guide

Follow this guide step by step to test the whole project yourself before your demo.

---

## 📌 Rules for Testing
- Follow the steps in order. Each step depends on the previous one.
- Use the checkboxes `- [ ]` to mark each step when you finish it.
- Each step tells you **DO**, **EXPECT**, and **IF IT FAILS**.

---

# 🚀 PART 1: Start the Project

Open **3 separate terminal windows**.

### Step 1.1: Start the Backend Server (Terminal 1)
- [ ] **DO:**
  ```bash
  cd server
  npm run dev
  ```
- **EXPECT:**
  You see:
  ```text
  ⚡ Server running on http://localhost:5000 in development mode
  ```
- **IF IT FAILS:**
  - Port 5000 is already used. Run: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force` in PowerShell.
  - MongoDB connection error: Check your internet connection. Make sure your IP is allowed in MongoDB Atlas.

---

### Step 1.2: Start the AI Service (Terminal 2)
- [ ] **DO:**
  ```bash
  cd ai-service
  .\venv\Scripts\activate
  uvicorn app.main:app --reload --port 8000
  ```
  *(On Mac/Linux use: `source venv/bin/activate`)*
- **EXPECT:**
  You see:
  ```text
  Application startup complete. Uvicorn running on http://127.0.0.1:8000
  ```
- **IF IT FAILS:**
  - `.\venv\Scripts\activate` fails: Run `python -m venv venv` and `pip install -r requirements.txt`.
  - Port 8000 is used: Kill the process on port 8000.

---

### Step 1.3: Start the Frontend Client (Terminal 3)
- [ ] **DO:**
  ```bash
  cd client
  npm run dev
  ```
- **EXPECT:**
  You see:
  ```text
  Ready in ...ms - http://localhost:3000
  ```
- **IF IT FAILS:**
  - Missing packages: Run `npm install` inside `client/`.

---

### Step 1.4: Health Checks in Browser
Open your browser and test these 4 URLs:

- [ ] **1. Server Health:**
  - **DO:** Open `http://localhost:5000/api/health`
  - **EXPECT:** `{"status":"ok"}`
  - **IF IT FAILS:** Terminal 1 is not running. Check Terminal 1 logs.

- [ ] **2. AI Service Health:**
  - **DO:** Open `http://localhost:8000/health`
  - **EXPECT:** `{"status":"ok","service":"reporadar-ai-service",...}`
  - **IF IT FAILS:** Terminal 2 is not running. Check Terminal 2 logs.

- [ ] **3. LLM API Key Check:**
  - **DO:** Open `http://localhost:8000/health/llm`
  - **EXPECT:** `{"status":"connected", "response":"PONG"}`
  - **IF IT FAILS:** If it says `"status":"disconnected"`, your `OPENAI_API_KEY` in `ai-service/.env` is missing or has no credits. *Note: Even if disconnected, the app has built-in offline fallbacks.*

- [ ] **4. Server-to-AI Gateway Health:**
  - **DO:** Open `http://localhost:5000/api/ai/health`
  - **EXPECT:** `{"success":true,"data":{"status":"ok",...}}`
  - **IF IT FAILS:** `server/.env` has the wrong `AI_SERVICE_URL` or `AI_SERVICE_API_KEY`.

---

# 📦 PART 2: Test Each Module in Order

Use your demo GitHub repository for these steps.

---

### 👤 Module 2: Email & Password Authentication

- [ ] **Step 2.1: Register a new account**
  - **DO:** Open `http://localhost:3000/register`. Type your Name, Email (`tester@reporadar.io`), and Password (`Password123!`). Click **Create Account**.
  - **EXPECT:** You see a green success message and get redirected to `http://localhost:3000/login`.
  - **IF IT FAILS:** Check if MongoDB is running and your email is not already used.

- [ ] **Step 2.2: Log in with the account**
  - **DO:** On `http://localhost:3000/login`, enter your email and password. Click **Sign in**.
  - **EXPECT:** You land on `http://localhost:3000/dashboard` and see your name on the screen.
  - **IF IT FAILS:** Check Terminal 1 logs. Ensure `JWT_SECRET` exists in `server/.env`.

- [ ] **Step 2.3: Test protected routes when logged out**
  - **DO:** Click **Sign out** (or logout). In the URL bar, try to open `http://localhost:3000/dashboard`.
  - **EXPECT:** The page immediately redirects you back to `http://localhost:3000/login`.
  - **IF IT FAILS:** Next.js middleware is not blocking the route. Clear your browser cookies.

---

### 🐙 Module 3: GitHub OAuth Sign-In

- [ ] **Step 3.1: Log in with GitHub**
  - **DO:** Go to `http://localhost:3000/login`. Click the black button: **Continue with GitHub**.
  - **EXPECT:** GitHub asks you to authorize. After you accept, you land on `http://localhost:3000/dashboard`. Your GitHub username shows in the top navigation.
  - **IF IT FAILS:**
    - "Redirect URI mismatch": In GitHub Developer Settings, set the callback to `http://localhost:3000/api/auth/callback/github`.
    - "Invalid Client Secret": Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in both `.env` files.

---

### 📂 Module 4: Repository Sync & Selection

- [ ] **Step 4.1: Sync repositories from GitHub**
  - **DO:** Go to `http://localhost:3000/dashboard/repositories`. Click the button **Sync Repositories**.
  - **EXPECT:** A list of your real GitHub repositories appears on the screen.
  - **IF IT FAILS:** Ensure your GitHub account has public or private repositories. Check Terminal 1 for Octokit errors.

- [ ] **Step 4.2: Select your demo repository**
  - **DO:** Find your test repository in the list. Click **Select for Radar**.
  - **EXPECT:** The button turns green and says **Selected**.
  - **IF IT FAILS:** Check Terminal 1. Make sure your database connection is active.

- [ ] **Step 4.3: Refresh page to test persistence**
  - **DO:** Press `F5` or reload the browser.
  - **EXPECT:** The repository is still marked as **Selected**.
  - **IF IT FAILS:** The `is_selected` boolean was not saved to MongoDB.

---

### 📊 Module 5: Repository Telemetry & Dashboard

- [ ] **Step 5.1: Open repository detail page**
  - **DO:** Click on the repository name link to open its detail page: `http://localhost:3000/dashboard/repositories/[your-repo-id]`.
  - **EXPECT:** You see the repository banner, quick action buttons, and empty KPI cards (Stars, Forks, Issues, Commits).
  - **IF IT FAILS:** Check if the repository ID in the URL is valid.

- [ ] **Step 5.2: Refresh telemetry data**
  - **DO:** Click the white button: **Refresh Telemetry**.
  - **EXPECT:** The KPI numbers update (Stars, Forks, Open PRs), the Language breakdown chart shows colors, and recent commits show in the timeline.
  - **IF IT FAILS:** Check if your GitHub access token is valid.

---

### 🌳 Module 6: Code Tree Explorer

- [ ] **Step 6.1: Ingest source code**
  - **DO:** Click the button **Explore Code Tree** (or open the tab `.../code`). Click **Fetch & Index Code**.
  - **EXPECT:** A file tree appears on the left side with folders and files matching your GitHub repository.
  - **IF IT FAILS:** The repo has no code or only binary files. Make sure there is code on the `main` branch.

- [ ] **Step 6.2: View file contents with syntax highlighting**
  - **DO:** Click any code file in the tree (e.g. `src/auth.ts`).
  - **EXPECT:** The file content opens in the right-side code viewer with line numbers and color syntax highlighting.
  - **IF IT FAILS:** Click another file. Make sure the file is not empty.

---

### 🛡️ Module 7: Static Rule-Based Code Analysis

- [ ] **Step 7.1: Run code analysis**
  - **DO:** Click the **Static Analysis** button (or open `.../analysis`). Click **Re-analyze**.
  - **EXPECT:** Analysis finishes in under 2 seconds. The summary cards show total issues found (Security, Bug, Performance, Code Smell).
  - **IF IT FAILS:** Make sure you completed Module 6 (Fetch Code) first.

- [ ] **Step 7.2: Verify planted issues were detected**
  - **DO:** Look at the issues table below the summary.
  - **EXPECT:** You see issues matching your demo repo:
    - **Critical / High:** Hardcoded secret / AWS Key in `src/auth.ts`
    - **Critical / High:** SQL Injection concatenation in `src/users.ts`
    - **Security:** DOM XSS `innerHTML` in `src/profile.ts`
    - **Code Smell:** Long function in `src/analytics.ts`
  - **IF IT FAILS:** Check that your planted files contain the exact issue code.

- [ ] **Step 7.3: Test severity and type filters**
  - **DO:** Click the **Critical** filter chip, then click the **Security** filter chip.
  - **EXPECT:** The table filters immediately to show only the selected issues.
  - **IF IT FAILS:** Click "All" to reset filters.

---

### 📈 Module 8: Health Radar Scorecard

- [ ] **Step 8.1: Calculate health score**
  - **DO:** Click **Health Scorecard** (or open `.../health`). Click **Recalculate Health**.
  - **EXPECT:** An overall score gauge (0 to 100) and letter grade (e.g. `C` or `D`) appear. Sub-scores for Security, Code Quality, Maintainability, and Performance are shown.
  - **IF IT FAILS:** Ensure Static Analysis (Module 7) was run first.

- [ ] **Step 8.2: Test score trend history**
  - **DO:** Click **Recalculate Health** one more time.
  - **EXPECT:** The Health Trend chart below now has 2 data points connected by a line.
  - **IF IT FAILS:** Refresh the page to reload the history chart.

---

### 👥 Module 9: Developer Analytics & Hotspots

- [ ] **Step 9.1: Sync commit history**
  - **DO:** Click **Dev Analytics** (or open `.../analytics`). Click **Sync Commit Data**.
  - **EXPECT:**
    - Contributor Leaderboard shows author names and avatar cards.
    - Commit Activity Timeline chart shows commit counts.
    - 7x24 Heatmap shows green squares for commit times.
    - File Hotspots table lists files ranked by **Technical Debt Score**.
  - **IF IT FAILS:** The repo has no commits. Make at least 1 commit on GitHub.

---

### 🤖 Module 10: AI Code Explanation & Fix Suggestions

- [ ] **Step 10.1: Explain code in Code Explorer**
  - **DO:** Go back to `.../code`. Click on `src/auth.ts`. Click **Explain this code** in the top right of the viewer.
  - **EXPECT:** A dark slide-over panel opens on the right. It shows Purpose, Detailed Explanation, and Architectural Key Points.
  - **IF IT FAILS:** Check if Terminal 2 (`ai-service`) is running on port 8000.

- [ ] **Step 10.2: Get AI fix suggestion**
  - **DO:** Go to `.../analysis`. Click the row for the SQL Injection issue to expand it. Click the purple button **Generate AI Fix**.
  - **EXPECT:** A green box appears showing the corrected code (e.g. parameterized query) and an explanation of why the fix works.
  - **IF IT FAILS:** Check Terminal 2 logs for any OpenAI API key issues.

- [ ] **Step 10.3: Test instant fix caching**
  - **DO:** Collapse the issue row and expand it again (or click **Generate AI Fix** again).
  - **EXPECT:** The fix appears **instantly** without loading, because it was saved in MongoDB.
  - **IF IT FAILS:** Refresh the page and expand the issue row.

---

### 🔍 Module 11: Vector Embeddings & Semantic Code Search

- [ ] **Step 11.1: Index repository for semantic search**
  - **DO:** Click **AI Code Search** (or open `.../search`). Click **Index Repository**.
  - **EXPECT:** Status changes from `processing` to `completed`. Total chunks indexed shows a number greater than 0 (e.g. `8 chunks`).
  - **IF IT FAILS:** Wait 5 seconds and click "Refresh Status". Make sure you fetched code in Module 6.

- [ ] **Step 11.2: Perform code search**
  - **DO:** In the search input box, type: `token generation` and press Enter.
  - **EXPECT:** Search results appear below. The top result shows `src/auth.ts` with a percentage match badge (e.g. `88% Match`).
  - **IF IT FAILS:** Try typing a function name that is in your demo files (e.g. `findUserByEmail`).

---

### 💬 Module 12: Conversational RAG Repository Chat

- [ ] **Step 12.1: Ask a question about the code**
  - **DO:** Click **AI Repo Chat** (or open `.../chat`). In the chat box, type:
    `What does the authentication code in src/auth.ts do?`
    Press Enter.
  - **EXPECT:** The AI responds with an accurate answer explaining the token generation. A cited file chip `[src/auth.ts:1-10]` appears below the message.
  - **IF IT FAILS:** Ensure you completed indexing in Module 11 first.

- [ ] **Step 12.2: Click citation chip**
  - **DO:** Click on the `[src/auth.ts:...]` chip below the AI response.
  - **EXPECT:** The app navigates to the Code Explorer and highlights that file.
  - **IF IT FAILS:** Go back to `/chat` using the browser back button.

- [ ] **Step 12.3: Ask a follow-up question**
  - **DO:** In the same chat, type: `Is there any security risk in that file?`
  - **EXPECT:** The AI remembers the context and warns you about the hardcoded JWT secret in `src/auth.ts`.
  - **IF IT FAILS:** Check Terminal 2 logs.

- [ ] **Step 12.4: Test no-hallucination rule (Out-of-Context Question)**
  - **DO:** Type this exact question: `How do I configure Stripe payments in this repo?`
  - **EXPECT:** The AI honestly says: *"I don't have enough context in the indexed codebase to answer that."* It does **not** make up fake code.
  - **IF IT FAILS:** The grounding prompt is active and tested.

---

### 🔔 Module 13: Automated PR Reviews & Webhooks

- [ ] **Step 13.1: Open PR Reviews tab**
  - **DO:** Click **PR Reviews** (or open `.../pull-requests`).
  - **EXPECT:** You see the PR Review dashboard with a toggle switch: **Automated Reviews**.
  - **IF IT FAILS:** Check if the repository is selected.

- [ ] **Step 13.2: Enable Automated Reviews**
  - **DO:** Click the toggle switch **Automated Reviews** to turn it ON.
  - **EXPECT:** Toggle turns purple. A green badge says **Webhook Active**.
  - **IF IT FAILS:** In development without ngrok, this registers the local URL.

- [ ] **Step 13.3: Test PR Review Detail & Manual Re-review**
  - **DO:** Click on any pull request card in the list (or open `.../pull-requests/[prId]`). Click the button **Re-evaluate PR Review**.
  - **EXPECT:** The button shows a spinner (*"Analyzing Diff..."*). After 2 seconds, the review card updates with an AI Summary, Risk Level badge (`CRITICAL` or `HIGH`), and detected diff issues.
  - **IF IT FAILS:** Check Terminal 1 logs to see if GitHub API rate limit was reached.

---

# ⚠️ PART 3: Error & Security Tests

Run these quick checks to prove your error handling works:

- [ ] **Error Test 1: Protected Server API (Expect 401)**
  - **DO:** Open a new browser tab and go to `http://localhost:5000/api/repositories`.
  - **EXPECT:** You see `{"success":false,"error":{"code":"UNAUTHORIZED",...}}`.
  - **IF IT FAILS:** Check `server/src/middleware/authMiddleware.ts`.

- [ ] **Error Test 2: AI Service Security (Expect 401)**
  - **DO:** Open `http://localhost:8000/api/explain/code` directly in browser.
  - **EXPECT:** `{"detail":"Invalid or missing X-API-Key header"}`.
  - **IF IT FAILS:** Check `ai-service/app/main.py`.

- [ ] **Error Test 3: Analysis before fetching code**
  - **DO:** If you select a brand new empty repo and click Re-analyze without fetching code.
  - **EXPECT:** A clean friendly error message tells you: *"No files found. Please fetch repository code first."* (The app does **not** crash).
  - **IF IT FAILS:** Handled safely in `server/src/services/code-analysis.service.ts`.

---

# 🗄️ PART 4: Database Check with Prisma Studio

- [ ] **DO:** In Terminal 4, run:
  ```bash
  cd server
  npx prisma studio
  ```
- **EXPECT:** Browser opens `http://localhost:5555`. You see all MongoDB collections.
- **Check these collections:**
  1. `User` ➡️ Your user account is here with encrypted `github_access_token`.
  2. `Repository` ➡️ Your selected repository is here with `is_selected: true`.
  3. `CodeIssue` ➡️ All detected planted issues are stored here.
  4. `RepositoryHealth` ➡️ Health score history records are stored here.
  5. `ChatMessage` ➡️ Your chat conversation history is stored here.
  6. `PullRequestReview` ➡️ PR review records are stored here.

---

# 🌅 PART 5: Demo Day Morning Checklist

Do these 10 things 15 minutes before your demo:

- [ ] **1.** Connect your laptop to Wi-Fi.
- [ ] **2.** Go to [MongoDB Atlas](https://cloud.mongodb.com) ➡️ **Network Access** ➡️ Click **Add IP Address** ➡️ Choose **Allow Access From Anywhere (`0.0.0.0/0`)**. *(Fixes Wi-Fi IP changes).*
- [ ] **3.** Start Terminal 1 (Server): `cd server && npm run dev`.
- [ ] **4.** Start Terminal 2 (AI): `cd ai-service && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000`.
- [ ] **5.** Start Terminal 3 (Client): `cd client && npm run dev`.
- [ ] **6.** Open `http://localhost:5000/api/health` ➡️ Confirm `{"status":"ok"}`.
- [ ] **7.** Open `http://localhost:8000/health` ➡️ Confirm `{"status":"ok"}`.
- [ ] **8.** Open `http://localhost:3000` in Chrome. Press `Ctrl + Shift + R` to do a hard refresh.
- [ ] **9.** Log in to RepoRadar. Open your demo repo page.
- [ ] **10.** Keep `DEMO.md` open on the side for your speaking notes.

---

## 🚨 Common Problems & Quick Fixes

| Problem | Why It Happened | Quick Fix (10 Seconds) |
| :--- | :--- | :--- |
| **MongoDB connection timeout** | Your Wi-Fi IP is not in the Atlas whitelist. | In MongoDB Atlas ➡️ Network Access ➡️ Add IP ➡️ Select `0.0.0.0/0` (Allow Anywhere). |
| **GitHub sign-in gives 404 or Error** | Callback URL is wrong in GitHub OAuth App. | In GitHub Developer Settings ➡️ OAuth Apps ➡️ Set callback to `http://localhost:3000/api/auth/callback/github`. |
| **AI Fix / Chat shows error message** | OpenAI key has no credit or is expired. | The app automatically uses heuristic fallbacks! You can also paste a new key into `ai-service/.env`. |
| **Port 3000 / 5000 / 8000 already in use** | A previous terminal didn't close properly. | Run in PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess \| Stop-Process -Force` |
| **PR Webhook does not fire locally** | ngrok is not running. | Click the **"Re-evaluate PR Review"** button on the PR page to manually trigger the review without a webhook! |

---

# 📝 MY RESULTS TABLE

Fill this table as you test each module:

| Module | Feature | Result (PASS / FAIL) | Notes |
| :--- | :--- | :--- | :--- |
| **Part 1** | Start 3 services & Health checks | [ ] | |
| **Module 2** | Email Register & Login | [ ] | |
| **Module 3** | GitHub OAuth Sign-In | [ ] | |
| **Module 4** | Sync Repositories & Select Repo | [ ] | |
| **Module 5** | Fetch Telemetry & KPI Cards | [ ] | |
| **Module 6** | Code Tree Explorer & File Viewer | [ ] | |
| **Module 7** | Static Code Analysis & Planted Issues | [ ] | |
| **Module 8** | Health Radar & Grade Scorecard | [ ] | |
| **Module 9** | Developer Analytics & Hotspots | [ ] | |
| **Module 10** | Explain Code & Instant AI Fix Cache | [ ] | |
| **Module 11** | Semantic Indexing & Vector Search | [ ] | |
| **Module 12** | RAG Chat with Citation Chips | [ ] | |
| **Module 13** | Automated PR Reviews & Risk Badges | [ ] | |
| **Part 3** | Error Handling & 401 Rejections | [ ] | |
| **Part 4** | Prisma Studio Database Verification | [ ] | |
