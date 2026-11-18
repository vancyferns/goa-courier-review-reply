# Goa Courier Services™ — Google Review Reply System

An enterprise Google Business Profile review response workstation built with **React, Vite, TypeScript, Tailwind CSS, and Express**. Designed around human-in-the-loop publishing: AI drafts grounded responses, a human verifies compliance, and the official Google Business Profile API publishes.

---

## Key Capabilities

### 1. Review Workstation
- **KPI Summary Strip**: Live counts for Total Reviews, Needs Reply, Replied, and Average Score.
- **Real-Time Filtering**: Filter by branch location (`Margao – Head Office`, `Agassaim`, `Porvorim`, `Canacona`, or synced GBP locations), status (`All`, `Unanswered`, `Replied`), and keyword/reviewer search.
- **Google Business Profile Sync**: Fetches accounts, verified branch locations, and customer reviews via the official Google Business Profile APIs once OAuth is connected.
- **Google AI Reply Studio**: Generates grounded replies (35–75 words target, 100 words hard max) using `Qwen/Qwen3-4B-Instruct-2507` (with automatic local simulation fallback when no inference API key is configured) and prompt-injection isolation (`<customer_review>`).
- **Policy & Output Validator**: Blocks prompt leakage, forbidden guarantees (e.g., unauthorized refunds/compensation), and restricted service claims (e.g., international fresh/frozen seafood shipping).
- **Safe Publication Gate**: Requires explicit human verification before enabling **Publish Reply to Google Maps / Search**, and prevents silent overwrites on already-replied reviews.

### 2. Manage Configuration
- **Google Cloud OAuth 2.0**: Configure Client ID, Client Secret, and Authorized Redirect URI, generate the consent URL, and exchange authorization codes for tokens directly in the dashboard.
- **AI Model & Inference Provider**: Supports Hugging Face, OpenRouter, Together AI, Ollama, or custom OpenAI-compatible endpoints (model identity locked to `Qwen/Qwen3-4B-Instruct-2507`).
- **Company Grounding & SEO Keywords**: Manage business name, inquiry email, website, and approved SEO phrases.

### 3. Activity & Audit Logs
- Chronological audit table recording review syncs, published owner replies, OAuth authorizations, and configuration updates.

---

## Project Structure

```text
├── api/index.ts        # Vercel serverless entrypoint exporting the Express API
├── server/
│   ├── app.ts          # Express API routes (/api/* and /oauth2callback)
│   ├── config.ts       # Model config, company facts, and SEO phrase selector
│   ├── db.ts           # In-memory store & environment variable fallback
│   └── services.ts     # PromptBuilder, OutputValidator, Inference, OAuth, GBP client
├── server.ts           # Unified local/dev server (Express + Vite on port 3000)
├── src/
│   ├── App.tsx         # Main React dashboard (Workstation, Configuration, Audit Logs)
│   ├── index.css       # Design tokens & Tailwind CSS
│   └── types.ts        # TypeScript interfaces
├── vercel.json         # Vercel build and rewrite rules
└── .env.example        # Environment variable template
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional for local simulation mode)
cp .env.example .env

# 3. Start development server (Express + Vite on port 3000)
npm run dev
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser.

### Available Scripts
- `npm run dev` — Starts Express + Vite dev server on `0.0.0.0:3000`
- `npm run build` — Builds the React frontend into `dist/`
- `npm start` — Runs the production Express server serving `dist/`
- `npm run lint` — Runs TypeScript typechecking (`tsc --noEmit`)

---

## Deploying to Vercel

This repository includes `vercel.json` and `api/index.ts` so both the Vite frontend and Express API routes (`/api/*`, `/oauth2callback`) deploy together on Vercel.

### 1. Push & Import to Vercel
1. Push your latest code to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/), click **Add New → Project** and import your GitHub repository.
3. Keep the default settings (auto-read from `vercel.json`):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2. Set Environment Variables in Vercel
In **Vercel Project → Settings → Environment Variables**, add:

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | For live GBP | OAuth 2.0 Web Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | For live GBP | OAuth 2.0 Web Client Secret from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | For live GBP | `https://<your-vercel-app>.vercel.app/oauth2callback` |
| `MODEL_PROVIDER` | Optional | e.g. `huggingface` or `openrouter` |
| `MODEL_API_BASE_URL` | Optional | Inference API endpoint URL |
| `MODEL_API_KEY` | Optional | Inference API key (falls back to local simulation if omitted) |

### 3. Update Google Cloud Console Redirect URI
In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client**:
1. Add your Vercel callback URL to **Authorized redirect URIs**:
   `https://<your-vercel-app>.vercel.app/oauth2callback`
2. Ensure the scope `https://www.googleapis.com/auth/business.manage` is configured on your OAuth consent screen and your business Google account is added under **Test Users** (if the app is in Testing mode).
3. Ensure **Google Business Profile API** access is approved for your Google Cloud project.

### 4. Important Production Note (Persistence on Serverless)
Currently, runtime state (`server/db.ts` and OAuth tokens in `server/services.ts`) is stored **in memory**. On Vercel Serverless Functions, cold starts or horizontal scaling reset in-memory state:
- Environment variables set in Vercel always persist.
- To persist OAuth tokens, synced Google reviews, and audit logs permanently across serverless invocations on Vercel, connect a hosted database (e.g., **Vercel Postgres / Neon / Supabase / Upstash Redis**) and swap the in-memory store in `server/db.ts` and token storage in `server/services.ts`.
