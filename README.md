# 📡 RepoRadar

> **Your AI-powered radar for repository health, security, and code quality.**

RepoRadar is a modern developer-first platform designed to continuously scan, monitor, and assess repository health, detect vulnerabilities, evaluate code quality, and provide AI-synthesized architectural insights.

---

## 🏗️ Architecture & Project Structure

RepoRadar is structured as a clean full-stack project with two decoupled applications:

```
reporadar/
├── client/                          # FRONTEND (Next.js 14+ App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/              # Authentication pages (Module 2)
│   │   │   ├── dashboard/           # Main application dashboard (Module 2+)
│   │   │   ├── globals.css          # Dark design system & Tailwind tokens
│   │   │   ├── layout.tsx           # Root Next.js layout & metadata
│   │   │   └── page.tsx             # Dark SaaS landing page & hero radar
│   │   ├── components/
│   │   │   └── ui/                  # Reusable UI component library
│   │   ├── lib/                     # Frontend utilities & API helpers
│   │   ├── types/                   # Frontend TypeScript types
│   │   └── config/                  # Site & navigation configurations
│   ├── public/                      # Static assets
│   ├── .env.example                 # Frontend environment variables template
│   ├── .env.local                   # Local frontend environment variables
│   ├── .eslintrc.json               # ESLint configuration
│   ├── .prettierrc                  # Prettier code formatting rules
│   ├── tailwind.config.ts           # Custom monochrome dark theme tokens
│   ├── tsconfig.json                # TypeScript configuration
│   ├── next.config.mjs              # Next.js configuration
│   └── package.json
│
├── server/                          # BACKEND (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── routes/                  # API route definitions (Module 1+)
│   │   ├── controllers/             # Request handlers & controllers (Module 1+)
│   │   ├── services/                # Business logic & AI scanning (Module 1+)
│   │   ├── middleware/              # Auth, validation & error handling
│   │   ├── lib/
│   │   │   └── db.ts                # Prisma singleton instance
│   │   ├── types/                   # Backend TypeScript types
│   │   ├── config/                  # Typed environment configuration
│   │   └── index.ts                 # Express entrypoint & /api/health
│   ├── prisma/
│   │   └── schema.prisma            # Prisma schema (MongoDB provider)
│   ├── .env.example                 # Server environment variables template
│   ├── .env                         # Local server environment variables
│   ├── .eslintrc.json               # ESLint configuration
│   ├── .prettierrc                  # Prettier code formatting rules
│   ├── tsconfig.json                # TypeScript configuration
│   └── package.json
│
├── .gitignore                       # Root git ignore
└── README.md                        # Documentation & setup guide
```

---

## 🛠️ Tech Stack

### Client (Frontend)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Custom Dark Monochrome Design System)
- **Icons:** Lucide React
- **Auth (Planned for Module 2):** NextAuth.js (Auth.js)

### Server (Backend)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** MongoDB (MongoDB Atlas free tier / local)

---

## 🚀 Getting Started

Follow these steps to get RepoRadar running locally on your machine.

### Prerequisites
- **Node.js**: v18.17+ or v20+
- **npm** (or pnpm/yarn)
- **MongoDB**: A free MongoDB Atlas cluster URI or a local MongoDB instance

---

### 1. Backend Server Setup (`server/`)

1. Open a terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your MongoDB connection string:
   ```env
   DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/reporadar?retryWrites=true&w=majority"
   PORT=5000
   CLIENT_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key-change-in-production"
   GITHUB_CLIENT_ID="your_github_oauth_client_id"
   GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"
   ```

4. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   The backend API will run on **http://localhost:5000**.
   - Health check: `GET http://localhost:5000/api/health`

---

### 2. Frontend Client Setup (`client/`)

1. Open a separate terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Ensure `.env.local` points to the backend server:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend application will run on **http://localhost:3000**.

---

## 🔐 Authentication Architecture (Module 2 & 3)

RepoRadar supports dual authentication methods: **Credentials (Email/Password)** and **GitHub OAuth Single Sign-On (SSO)** with secure token encryption:

```
┌─────────────────────────┐                   ┌──────────────────────────┐
│  Next.js 14+ (Client)   │                   │  Express + Node (Server) │
│                         │                   │                          │
│  NextAuth Providers:    │                   │                          │
│  - Credentials (Email)  │── POST /login ───▶│  Verify email + bcrypt   │
│  - GitHub OAuth (SSO)   │── POST /sync ────▶│  AES-256 Encrypt Access  │
│  Strategy: "jwt"        │◀─ User + JWT ─────│  Sign JWT (Shared Secret)│
│                         │                   │                          │
│  apiClient helper       │── Bearer Token ──▶│  authMiddleware verifies │
│  (Attaches Bearer JWT)  │◀─ Protected Data ─│  req.user attached       │
└─────────────────────────┘                   └──────────────────────────┘
```

### GitHub OAuth App Setup
To enable GitHub login in local development:
1. Go to **GitHub Settings → Developer Settings → OAuth Apps → New OAuth App**.
2. Set **Application Name**: `RepoRadar`
3. Set **Homepage URL**: `http://localhost:3000`
4. Set **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
5. Copy the generated **Client ID** and generate a **Client Secret**.

Add to `client/.env.local` and `server/.env`:
```env
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

### Secrets & Encryption Keys Setup
1. **Shared NextAuth JWT Secret**:
   ```bash
   openssl rand -base64 32
   ```
2. **AES-256 Token Encryption Key** (Used on server to encrypt GitHub access tokens at rest):
   ```bash
   openssl rand -hex 16
   ```

Add to `client/.env.local`:
```env
NEXTAUTH_SECRET="your-generated-jwt-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:5000"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

Add to `server/.env`:
```env
JWT_SECRET="your-generated-jwt-secret"
NEXTAUTH_SECRET="your-generated-jwt-secret"
ENCRYPTION_KEY="your-32-character-hex-encryption-key"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

---

## 🔌 API Endpoints (Module 6)

### Response Formats

All API endpoints return standardized JSON responses:

#### ✅ Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": {
    "total_files": 128,
    "indexed_files": 120,
    "skipped_files": 8,
    "total_dirs": 14,
    "tree": [
      {
        "name": "src",
        "path": "src",
        "type": "folder",
        "children": [
          {
            "name": "app.ts",
            "path": "src/app.ts",
            "type": "file",
            "size": 2450,
            "language": "typescript",
            "file_id": "65d75cf9e1d84f23b890abcf"
          }
        ]
      }
    ]
  }
}
```

#### ❌ Error Response (`400 Bad Request` / `401 Unauthorized` / `404 Not Found`)
```json
{
  "success": false,
  "error": {
    "message": "GitHub account not connected. Please log in with GitHub to enable repository syncing.",
    "code": "GITHUB_NOT_LINKED"
  }
}
```

---

### Endpoints Table

| Method | Endpoint | Auth Required | Description | Request Body |
|---|---|---|---|---|
| `GET` | `/` | No | API server info | None |
| `GET` | `/api/health` | No | Service health status & uptime | None |
| `POST` | `/api/auth/register` | No | Register new developer account | `{ "name": string, "email": string, "password": string }` |
| `POST` | `/api/auth/login` | No | Verify credentials & issue JWT token | `{ "email": string, "password": string }` |
| `POST` | `/api/users/sync-github` | No (NextAuth Callback) | Sync GitHub profile & encrypt access token | `{ "email": string, "name"?: string, "github_id": number, "github_username"?: string, "github_access_token"?: string }` |
| `GET` | `/api/auth/me` | **Yes (Bearer)** | Get current authenticated user | None |
| `POST` | `/api/repositories/sync` | **Yes (Bearer)** | Ingest & sync all repositories from GitHub via Octokit | None |
| `GET` | `/api/repositories` | **Yes (Bearer)** | List all synced repositories for user (with nested metrics) | None |
| `PATCH` | `/api/repositories/:id/select` | **Yes (Bearer)** | Select repository for active radar analysis | None |
| `PATCH` | `/api/repositories/:id/deselect` | **Yes (Bearer)** | Deselect repository from radar analysis | None |
| `POST` | `/api/repositories/:id/fetch-data` | **Yes (Bearer)** | Fetch & store detailed telemetry from GitHub (metrics, languages, commits) | None |
| `GET` | `/api/repositories/:id/metrics` | **Yes (Bearer)** | Retrieve metrics, language breakdown, and latest commits | None |
| `GET` | `/api/repositories/:id/commits` | **Yes (Bearer)** | Retrieve paginated commit history (`?page=1&limit=20`) | None |
| `POST` | `/api/repositories/:id/fetch-code` | **Yes (Bearer)** | Ingest source code tree and file blobs | None |
| `GET` | `/api/repositories/:id/files/tree` | **Yes (Bearer)** | Retrieve stored hierarchical file tree | None |
| `GET` | `/api/repositories/:id/files` | **Yes (Bearer)** | Retrieve paginated file metadata (`?page=1&limit=50&language=typescript`) | None |
| `GET` | `/api/repositories/:id/files/:fileId` | **Yes (Bearer)** | Retrieve content of a single file | None |
| `POST` | `/api/repositories/:id/analyze-code` | **Yes (Bearer)** | Run static rule-based analysis on fetched code | None |
| `GET` | `/api/repositories/:id/analysis-summary` | **Yes (Bearer)** | Retrieve rolled-up analysis metrics for repository | None |
| `GET` | `/api/repositories/:id/analysis-results` | **Yes (Bearer)** | Retrieve paginated & filterable code issues (`?severity=critical&issueType=security`) | None |
| `GET` | `/api/repositories/:id/analysis-results/:fileId` | **Yes (Bearer)** | Retrieve issues for a specific file | None |
| `GET` | `/api/projects` | **Yes (Bearer)** | List all projects | None |
| `POST` | `/api/projects` | **Yes (Bearer)** | Create a new project | `{ "name": string, "description"?: string }` |
| `GET` | `/api/projects/:id` | **Yes (Bearer)** | Get project by ID | None |
| `PATCH` | `/api/projects/:id` | **Yes (Bearer)** | Update project by ID | `{ "name"?: string, "description"?: string }` |
| `DELETE` | `/api/projects/:id` | **Yes (Bearer)** | Delete project by ID | None |

---

### 🔍 Static Rule-Based Code Analysis Engine (Module 7)

RepoRadar includes a deterministic, rule-based static analysis engine that scans stored repository files for issues across 5 core categories:

1. **Security Vulnerabilities**
   - Hardcoded secrets, API tokens, AWS keys, and private keys
   - SQL Injection vulnerabilities (string concatenation & unescaped template literals into queries)
   - Cross-Site Scripting (XSS) patterns (`innerHTML`, `eval()`, `dangerouslySetInnerHTML`, `document.write`)
   - Insecure cryptographic algorithms (MD5, SHA-1, DES, RC4)

2. **Bugs & Logic Hazards**
   - Declared variables that are never read or referenced
   - Unreachable statements following unconditional `return`, `throw`, `break`, or `continue`
   - Unsafe property chaining without optional chaining or null checks (DOM queries, array `.find()`)

3. **Performance Anti-Patterns**
   - Synchronous blocking I/O calls (`readFileSync`, `writeFileSync`, `execSync`) in execution paths
   - Nested loops generating potential $O(n^2)$ complexity
   - Linear searches (`.find()`, `.includes()`, `.indexOf()`) or array spreads inside loops

4. **Code Smells & Maintainability**
   - Long functions exceeding 50 lines of code
   - Missing JSDoc documentation on exported functions and classes
   - High cyclomatic complexity (> 10 decision branches)
   - Deeply nested conditional structures (> 3 indentation levels)

#### Severity Levels
- 🔴 **Critical:** Immediate security risks (hardcoded credentials, SQLi, eval)
- 🟠 **High:** Serious logic risks (XSS, synchronous blocking I/O, unreachable code)
- 🟡 **Medium:** Performance hazards and potential runtime errors (nested loops, weak crypto, missing null checks)
- ⚪ **Low:** Maintainability suggestions and code smells (long functions, missing docs)

---

### 🧪 Testing the API

A complete REST test suite is included in [`server/requests.http`](file:///c:/Users/ASUS/OneDrive/Desktop/BEE/server/requests.http). You can execute authentication, GitHub OAuth user sync, repository syncing, detailed telemetry ingestion, source code indexing, static code analysis, selection toggling, and error edge cases using the VS Code **REST Client** extension, Postman, or `curl`.

---

## 🎨 Design System

The frontend implements a dark monochrome aesthetic inspired by Vercel, Linear, and GitHub's dark theme:
- **Background:** `#0A0A0A`
- **Foreground:** `#FAFAFA`
- **Borders:** `#1F1F1F` / `#2A2A2A`
- **Elevated Surfaces:** `#111111` / `#161616`
- **Accent CTAs:** Solid `#FFFFFF` button with `#000000` text & subtle glow hover effects.

---

## 📜 Roadmap

- [x] **Module 0:** Foundation Setup (Monorepo structure, Next.js client, Express + MongoDB + Prisma backend, Dark design system, Health checks).
- [x] **Module 1:** Scalable Backend REST API Architecture (Layered Routes → Controllers → Services → Prisma, Centralized Error Handling, Zod Validation, Request Logging, Project Template Resource).
- [x] **Module 2:** NextAuth.js Authentication & JWT Session Sharing (Credentials provider, Login/Register pages, Dashboard protection, Server bcrypt + JWT verification, Protected routes).
- [x] **Module 3:** GitHub OAuth Integration & AES-256 Token Encryption (GithubProvider, OAuth callback user sync, encrypted access token storage at rest, session GitHub telemetry).
- [x] **Module 4:** GitHub Repository Ingestion & Selection Management (Octokit REST SDK, Repository MongoDB model, encrypted token decryption, sync & selection API, `/dashboard/repositories` UI).
- [x] **Module 5:** Detailed GitHub Telemetry, Metrics & Interactive Dashboard (Metrics, Language percentage breakdown, Commits timeline, `/dashboard` Overview grid, `/dashboard/repositories/:id` detail view).
- [x] **Module 6:** Source Code Ingestion, Indexing, File Tree & VS Code-like Code Explorer (`/dashboard/repositories/:id/code`, Prism syntax highlighter, collapsible Tree).
- [x] **Module 7:** Static Rule-Based Code Analysis Engine & Dashboard (`/dashboard/repositories/:id/analysis`, Security/Bug/Performance/Code-Smell scanning, filterable Issue Table, Analysis Summary).
- [ ] **Module 8:** AI-Synthesized Health Radar Scorecard & Interactive Visualizer.

---

## 📄 License
MIT License.
