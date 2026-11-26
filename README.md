# Sleep Pets & Chop Trees: guide site and Pip support chatbot

The official guide website for the Roblox game *Sleep Pets & Chop Trees*. It includes **Pip**, a chatbot that answers only from the game guide and cites its sources. When Pip can't answer, it hands the player to a person on the team, and a support panel shows leads, conversations and a dashboard.

**Live site:** https://sleep-pets-chop-trees.vercel.app · **Demo walkthrough:** [docs/demo-script.md](docs/demo-script.md)

## Free stack
| Part | Tool (free tier) |
|---|---|
| AI model | Google Gemini (AI Studio) |
| Knowledge base | Dify cloud (guide + team FAQs) |
| Database, auth, realtime | Supabase |
| Hand-off to a person | Chatwoot cloud, free plan (website inbox, polled) |
| Apps | React + Vite (site, admin), Fastify API, npm workspaces |
| Hosting | Vercel |

## Prerequisites
Node 20.6+, plus free accounts for Supabase, Dify, Google AI Studio, Chatwoot and Vercel (`npm i -g vercel`).

## Settings (`.env.local` in the repo root, never committed)
| Name | Where to get it |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase → Project settings → API |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Google AI Studio → API key; model names such as `gemini-3.5-flash-lite` and `gemini-3.5-flash` |
| `DIFY_API_BASE`, `DIFY_DATASET_API_KEY` | Dify → Knowledge → API (`https://api.dify.ai`) |
| `DIFY_PUBLIC_DATASET_ID`, `DIFY_INTERNAL_DATASET_ID`, `DIFY_ADMIN_FAQ_DOCUMENT_ID` | Written for you by `npm run dify:sync` |
| `CHATWOOT_BASE_URL`, `CHATWOOT_WEBSITE_TOKEN`, `CHATWOOT_ACCOUNT_ID` | Chatwoot → Settings → Inboxes → Website inbox |
| `SITE_URL`, `ADMIN_URL` | Your site and admin URLs (`http://localhost:5173` / `5174` locally) |
| `ADMIN_EMAILS` | Comma-separated emails that get admin-panel accounts |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`, `VITE_CHATWOOT_ACCOUNT_ID` | Browser-safe copies for the web and admin apps (`VITE_API_URL=http://localhost:8787` locally) |
| `GUIDE_HTML` *(optional)* | Path to the guide HTML export, only needed to re-ingest the guide |

Check every key with `npm run check:connections`. It prints ✓/✗ only and never shows values.

## Set up and run
1. `npm install`
2. In the Supabase SQL editor, run `supabase/migrations/0001` → `0004` in order.
3. *(Only if the guide changed)* `npm run ingest`. The parsed guide is already in `content/`.
4. `npm run dify:sync`: creates the Dify datasets, uploads the guide and writes the dataset ids into `.env.local`.
5. `npx tsx --env-file=.env.local scripts/create-admins.ts`: creates admin accounts. Passwords go to `.admin-credentials`, which is gitignored and never printed.
6. `npx tsx --env-file=.env.local scripts/seed-demo.ts`: loads 40 synthetic chats for the dashboard. Add `--clear` to remove them.
   Then `npx tsx --env-file=.env.local scripts/seed-faq.ts`: adds 3 synthetic team FAQs (the second knowledge source). Safe to re-run.
7. Start the three apps in separate terminals:
   - `npm run dev -w apps/web` → http://localhost:5173
   - `npm run dev -w apps/admin` → http://localhost:5174
   - `npx tsx watch --env-file=.env.local apps/api/src/dev.ts` → http://localhost:8787
8. Run the tests: `npx vitest run`
9. Deploy all three to Vercel: `bash scripts/deploy.sh`. Add `--env` to also upload the API settings.

## Useful scripts
- `npx tsx --env-file=.env.local scripts/ask.ts "how do I rebirth?"`: ask Pip from the terminal.
- `npx tsx --env-file=.env.local scripts/e2e-live.ts`: end-to-end check against the live site (it creates a real chat; add `--handoff` to also open a test ticket).

*Not affiliated with Roblox Corporation. Demo data is synthetic; no real player data is used.*
