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

## 🔐 Authentication Architecture (Module 2)

RepoRadar uses a decoupled authentication architecture between the Next.js frontend and Express backend:

```
┌─────────────────────────┐                   ┌──────────────────────────┐
│  Next.js 14+ (Client)   │                   │  Express + Node (Server) │
│                         │                   │                          │
│  NextAuth Credentials   │── POST /login ───▶│  Verify email + bcrypt   │
│  Strategy: "jwt"        │◀─ User + JWT ─────│  Sign JWT (Shared Secret)│
│                         │                   │                          │
│  apiClient helper       │── Bearer Token ──▶│  authMiddleware verifies │
│  (Attaches Bearer JWT)  │◀─ Protected Data ─│  req.user attached       │
└─────────────────────────┘                   └──────────────────────────┘
```

### Shared Secret Setup
Both client and server must share the exact same `NEXTAUTH_SECRET` / `JWT_SECRET` key to sign and verify tokens seamlessly.

Generate a secure 256-bit key:
```bash
openssl rand -base64 32
```
Add to `client/.env.local`:
```env
NEXTAUTH_SECRET="your-generated-secret-key"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:5000"
```
Add to `server/.env`:
```env
JWT_SECRET="your-generated-secret-key"
NEXTAUTH_SECRET="your-generated-secret-key"
```

---

## 🔌 API Endpoints (Module 2)

### Response Formats

All API endpoints return standardized JSON responses:

#### ✅ Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65d75cf9e1d84f23b890abcd",
      "name": "Kunal Saini",
      "email": "kunal@reporadar.io"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### ❌ Error Response (`400 Bad Request` / `401 Unauthorized` / `404 Not Found`)
```json
{
  "success": false,
  "error": {
    "message": "Authentication required: Bearer token missing",
    "code": "UNAUTHORIZED"
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
| `GET` | `/api/auth/me` | **Yes (Bearer)** | Get current authenticated user | None |
| `GET` | `/api/projects` | **Yes (Bearer)** | List all projects | None |
| `POST` | `/api/projects` | **Yes (Bearer)** | Create a new project | `{ "name": string, "description"?: string }` |
| `GET` | `/api/projects/:id` | **Yes (Bearer)** | Get project by ID | None |
| `PATCH` | `/api/projects/:id` | **Yes (Bearer)** | Update project by ID | `{ "name"?: string, "description"?: string }` |
| `DELETE` | `/api/projects/:id` | **Yes (Bearer)** | Delete project by ID | None |

---

### 🧪 Testing the API

A complete REST test suite is included in [`server/requests.http`](file:///c:/Users/ASUS/OneDrive/Desktop/BEE/server/requests.http). You can execute authentication, token generation, protected calls, and error edge cases using the VS Code **REST Client** extension, Postman, or `curl`.

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
- [ ] **Module 3:** GitHub OAuth Integration & AI-Powered Static AST Analysis Engine.
- [ ] **Module 4:** Vulnerability Radar Scorecard, Interactive Telemetry & Webhooks.

---

## 📄 License
MIT License.
