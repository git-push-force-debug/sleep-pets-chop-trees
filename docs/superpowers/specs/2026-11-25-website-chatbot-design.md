# Sleep Pets & Chop Trees — website + support chatbot

## Context
Lance wants a public website for his Roblox game **Sleep Pets & Chop Trees** (place 109510233820622). Its main feature is a support chatbot that knows the whole game from the existing guide. When the bot can't answer, the player is handed to a real person in the same chat through **Chatwoot Cloud**. A separate **admin panel** lets agents answer players and run support. Lance wants every account connected **up front**, so the build can then run without stopping for manual steps.

Source material: `~/Documents/Codex/2026-11-25/look-at-hte/outputs/sleep-pets-and-chop-trees-guide.html` (12 MB). It has 56 `<section class="chapter" id=…>` blocks in 7 chapters and 134 embedded images, each with alt text, a caption and a source filename. The PDF has the same content. **I'll use the HTML as the source** because its structure, anchors and image captions are machine-readable. The PDF isn't published, because it contains chapter 07.

**Decisions Lance made:** site, logo and repo use the name "Sleep Pets & Chop Trees". Chapter 07 (Creator reference) is **admin-only**. A Chatwoot conversation opens **at hand-off**, with the bot transcript copied in, and keeps that ID afterwards. Use the signed-in Vercel account (`localtradingscom-6532`) and a **new $0 Supabase project** in the `travyai.com@gmail.com` org.

**Update 2026-11-25 — Chatwoot free plan:** Chatwoot Cloud's free (Hacker) plan has **no API access token**, and Lance chose to stay on it. So the server talks to a **Website inbox through Chatwoot's widget API**, the same endpoints Chatwoot's own chat bubble uses. These were verified in `chatwoot/chatwoot` source:
- `POST /api/v1/widget/config` → contact `auth_token`
- `POST /api/v1/widget/conversations` → `{id: display_id, status}`
- `POST|GET /api/v1/widget/messages` → private notes are filtered out
- `GET /api/v1/widget/conversations` → status
- `GET /api/v1/widget/inbox_members` → token check

Auth is the `X-Auth-Token` header. Throttles are about 30 conversations and 60 messages per minute per IP and token.

**Agents reply, assign, label and resolve inside Chatwoot's dashboard or mobile app.** Our admin panel covers everything else and links to each Chatwoot conversation.

**My calls** (Lance can override):
- Dify is **retrieval only** (Knowledge API). Our Fastify server calls Gemini directly with structured JSON output, then validates it and adds sources and images. This matches Lance's flow and gives full control of the generative UI. A Dify chat app would hide that control.
- The admin panel is a **separate Vite app and a separate Vercel project**, so no admin code ships to players.
- Players get **Supabase anonymous auth**: the server verifies their JWT, and Realtime with row-level security delivers agent replies.
- Claude builds all the code. Codex only generates images from Claude's briefs, as Lance asked for this task.

## Architecture
```
Player browser (apps/web) ──HTTPS+JWT──► Fastify API (apps/api, Vercel fn)
   ▲  Supabase Realtime (own rows only)        │  ├─ Dify Knowledge API  (retrieve sections)
   │                                           │  ├─ Gemini API          (write JSON UI blocks)
Supabase (Postgres, Auth, Realtime) ◄──────────┤  └─ Chatwoot Cloud API  (hand-off, replies, status)
   ▲                                           ▲
Agent browser (apps/admin) ──HTTPS+JWT─────────┘◄── Chatwoot webhook (message_created, status_changed)
```
Repo `git-push-force-debug/sleep-pets-chop-trees` (public). npm workspaces:
`apps/web`, `apps/admin`, `apps/api`, `packages/shared` (zod block schemas, block renderer, tokens), `content/` (generated guide JSON + images), `scripts/`, `supabase/migrations/`, `docs/superpowers/specs|plans/`.
Stack: React + Vite + TypeScript, Tailwind v4 with CSS-variable tokens, `motion`, react-router, `@supabase/supabase-js`, `react-markdown` (no raw HTML), Fastify, `@google/genai`, zod, vitest.

## Chat flow
1. On the first visit the browser calls `signInAnonymously()`. `POST /chat/sessions` creates a `chat_sessions` row owned by that user. Reloads resume the same session.
2. `POST /chat/sessions/:id/messages` verifies the JWT and the row owner, rate-limits, then:
   - checks the retrieval cache, then Dify `retrieve` (hybrid, top 5) against the **public** dataset;
   - sends the evidence and recent turns to Gemini with a `responseSchema`. Gemini returns `{answer_found, intent, blocks[], suggestions[], used_section_ids[]}`;
   - the server validates with zod. It drops image IDs and section IDs that didn't come from the retrieved sections, and adds `sources` (`/guide/<chapter>#<section>`) plus image URLs.
3. **Offer a person** when: `!answer_found`, the top score is below the threshold, the intent is `wants_human`, or the intent is `account_or_purchase` / `bug_report` (Robux, refunds, bans, lost pets). The bot shows a hand-off card. A "Talk to a person" button is always in the chat header.
4. **Hand-off** (idempotent, one conversation per chat session):
   - An optional form collects Roblox username and email, with a summary the bot pre-fills.
   - The server gets a widget contact token (`POST widget/config`, one per player). The token is stored in the server-only table `chatwoot_contacts`, never in a table the player can read.
   - It calls `POST widget/conversations` with contact `{name: roblox username, email}` and `custom_attributes {session_id, page_url}`. The first message is the formatted bot transcript plus the summary (agents read the earlier chat there, and the admin panel shows it rich).
   - It sets `bot_paused=true, status=waiting_human` and shows **Ticket #<display_id>**.
5. While a person is handling the chat:
   - Player messages go out through `POST widget/messages` and are stored in Supabase.
   - **Agent replies** arrive through `syncSession()`, which runs `GET widget/messages?after=<last id>` with that session's token and keeps outgoing, non-private messages. It de-duplicates by `chatwoot_message_id`, inserts rows, and Realtime pushes them to the player and the admin panel.
   - `syncSession()` is triggered by the Chatwoot webhook, if the free plan allows webhooks: the URL is checked against its secret path, and the data is **re-fetched through the widget API**, never trusted from the payload. As a fallback, the player's open chat polls `POST /chat/sessions/:id/sync` every ~5 s while waiting for a person, and the admin panel syncs whenever a conversation is opened.
6. **Resolved:**
   - `syncSession()` reads the status (`GET widget/conversations`). When it's `resolved`, the session is marked resolved and the player sees a "Resolved" banner and a "Start new chat" button.
   - The inbox setting "Allow messages after conversation resolved" is **off**, so Chatwoot itself refuses replies (403). Our server also returns 409.
   - A new chat after resolution makes a new conversation for the same contact. If an agent reopens the ticket, the chat reopens. "Hand back to bot" (admin panel) sets `bot_paused=false`.

## Generative UI (shared renderer, used in web and admin)
Block types: `text` (markdown), `steps`, `table`, `stats`, `images` (gallery, lightbox), `callout` (tip/warning/info), `card` (animal, weapon or tier facts with an optional image), `suggestions` (reply chips), `handoff`. The server appends `sources` as link chips.
Motion follows Lance's reference (`lance-ui-ux-motion`):
- M10: typewriter at ≈55–60 chars/s that can be skipped, with chips appearing after the text.
- Blocks enter in layers, staggered.
- M1: the chat is a sheet over a scrim on phones and a side panel on desktop.
- M4: toasts such as "Connected to a person".
- M8: progress nodes for steps.
- M14: 2.5D raised pill buttons.

Under OS reduced motion everything appears instantly with the same information. Text meets WCAG AA, touch targets are ≥48 px and status is never shown by colour alone.

## Phase 0 — Connect everything (first, together)
| Service | Lance does once | I do / verify |
|---|---|---|
| GitHub | nothing (signed in) | create the public repo, clone to `~/Documents/sleep-pets-chop-trees`, move this session there |
| Vercel | nothing. Optional: allow the Vercel GitHub app on `git-push-force-debug` for auto-deploys | create 3 projects, deploy with the CLI, push env vars |
| Supabase | toggle **Allow anonymous sign-ins**, paste the **secret key** into `.env.local` | create the project (MCP, $0 confirmed), migrations, URL and publishable key |
| Gemini | create a key at aistudio.google.com → `.env.local` | list models, pick the newest Flash model → `GEMINI_MODEL` |
| Dify Cloud | sign up. Model Providers → Gemini (paste key) → set Gemini as the default embedding model. Create a **Knowledge API key** → `.env.local` | create the public and internal datasets, upload content |
| Chatwoot Cloud | sign up (free Hacker plan). Create a **Website inbox** and add yourself as an agent. Turn off "Allow messages after conversation resolved". Copy the **websiteToken** → `.env.local`. Add the webhook from `CHATWOOT_WEBHOOK_URL`, if the plan shows Integrations → Webhooks | check the token and agent with `check:connections`. Fall back to polling if there's no webhook |
| Codex | nothing | confirm image generation works |
| Admins | admin email(s) → `ADMIN_EMAILS` in `.env.local` | create accounts. A random password goes to a gitignored local file, never into chat |

I create a `.env.local` template with only these blanks. Then `npm run check:connections` pings each service and prints ✓/✗ without showing any secrets. After all show ✓, no more manual steps are needed.

## Phase 1 — Design (Claude Design + Codex art)
- Artifact Design type: design system tokens (one ranch palette plus 6 biome tints, a rounded heavy type face, Lance's radius and elevation tokens). Mockups: Home, Guide page, chat states (answer with blocks, hand-off, agent connected, resolved), admin Inbox and Conversation. **Lance approves before implementation.**
- Codex image briefs: wordmark logo, hero (ranch hub, sleeping pets, trees), 6 biome banners, an original bot mascot avatar, empty states, OG image. Claude reviews each output. Real game screenshots from the guide are used as-is.

## Phase 2 — Knowledge ingest (`scripts/ingest-guide.ts`, tested)
- Parse the HTML into `content/guide.json` (chapter → section → markdown, tables, image refs). Extract images to `apps/web/public/guide/img/<source-file>`.
- Dify Sandbox allows **50 documents**, so the upload is grouped by chapter (6 public docs), one segment per section. Each segment's header carries `section_id | title | chapter | image_ids`. Also uploaded: `site-faq.md` (how support, tickets and the site work) and an "Admin FAQ" doc that admins add segments to.
- Chapter 07 goes to the **internal** dataset, used only by the admin "Suggest reply" feature.

## Phase 3 — API (`apps/api`, Fastify)
Routes: `POST /chat/sessions`, `GET /chat/sessions/:id`, `POST /chat/sessions/:id/messages`, `POST /chat/sessions/:id/handoff`, `POST /chat/sessions/:id/sync`, `POST /chat/messages/:id/feedback`, `POST /webhooks/chatwoot/:secret`. Agent-only `/admin/*` routes: sync, hand-back, suggest, FAQ CRUD and re-sync, gaps, stats, team, settings.
Modules: `lib/dify.ts`, `lib/gemini.ts` (primary `gemini-3.5-flash-lite`, fallback `gemini-3.5-flash` on 503 or invalid output, thinking minimal), `lib/chatwoot.ts` (widget API), `lib/answer.ts` (the pipeline + hand-off decision), `lib/auth.ts` (JWT → player or agent).

**Supabase tables:**
- `chat_sessions` (user_id, status `bot|waiting_human|human|resolved`, bot_paused, chatwoot_contact_id / source_id / conversation_id / display_id, roblox_username, email, page_url)
- `messages` (session_id, role `user|bot|agent|system`, content, blocks jsonb, sources jsonb, chatwoot_message_id unique, agent_name, feedback)
- `agents` (user_id, role `admin|agent`, display_name)
- `chatwoot_contacts` (user_id, auth_token, source_id). RLS is on with **no** policies, so only the server can read it.
- `faq_entries`, `bot_gaps`, `retrieval_cache`, `settings`, `rate_limits`

RLS: a player can read only rows where `user_id = auth.uid()`. Agents can read all. All writes go through the server's secret key. Realtime is on for `chat_sessions` and `messages`.

## Phase 4 — Public site (`apps/web`)
Pages:
- Home: hero, the core loop (Sleep → Carry → Ranch → Chop → Rebirth), the 6 biomes, a "Play on Roblox" button.
- Guide, chapters 01–05: section anchors that bot sources link to, plus search.
- Biomes & wildlife (72 species), Gear (15 guns, 13 melee tools), Rewards & crates, FAQ, Gallery (chapter 06).
- Support: a full-page chat and the ticket status.

A floating chat launcher appears on every page.

## Phase 5 — Admin panel (`apps/admin`)
- Sign in with email and password. Only listed agents get in. Roles: admin and agent.
- **Inbox** updates live, with sound and browser notifications on hand-off. Tabs: Needs a person, Mine, Open, Bot chats, Resolved. Search by ticket, username or text, with a wait timer on each chat.
- **Conversation:** the rich transcript (bot and agent messages, synced live) and the player panel (username, email, page, device, ticket number). Actions:
  - **Open in Chatwoot**, a deep link to `app.chatwoot.com/app/accounts/<id>/conversations/<display_id>`, where agents reply, assign, label and resolve;
  - **Suggest reply** (AI, includes chapter 07), with a copy button;
  - hand back to bot, and sync now.
- **Knowledge:**
  - section sync status and a re-sync button;
  - FAQ entries, which are pushed to Dify;
  - **Unanswered questions**, each with a button that turns it into an FAQ;
  - the full guide, including chapter 07.
- **Analytics:**
  - chats per day;
  - how many chats the bot answered vs handed off;
  - first reply and resolution times;
  - 👍/👎 rate and top topics.
- **Team** (admin only): add, remove and change agent roles. **Settings:** bot on/off, greeting, starter questions, offline message, evidence threshold, support hours.

## Phase 6 — Deploy & wire
Deploy the 3 Vercel projects (web, admin, api). CORS allows only the web and admin origins. Register the Chatwoot webhook with the API URL and its secret path. Create the admin accounts. Then run the end-to-end check below on the live URLs.

## Workflow (superpowers)
After approval:
1. Save this as `docs/superpowers/specs/2026-11-25-website-chatbot-design.md`.
2. Run `superpowers:writing-plans` to write the task plan.
3. Build test-first for server logic, with `superpowers:verification-before-completion` before each "done" and a code review before the final deploy.

## Verification
- **vitest:**
  - ingest finds 56 sections, keeps chapter 07 out of the public set, and every image ref resolves;
  - the pipeline strips unknown images and sources, and a low score or a matching intent produces a hand-off card;
  - double-clicking hand-off creates one conversation, and the transcript stays in order;
  - the webhook rejects a bad secret; `syncSession` keeps only outgoing, non-private agent messages, de-duplicates, and marks the session resolved when Chatwoot says so;
  - a `chatwoot_contacts` token is never readable with a player's token;
  - a post to a resolved session returns 409;
  - a player's token can't read another session, and an anonymous user can't call `/admin`.
- **End-to-end in the built-in browser, on phone and desktop sizes:**
  1. Ask "how do I rebirth?" → a table block appears with the tier data, an image and a source link to the Guide.
  2. Ask something outside the guide → a hand-off card appears.
  3. Hand off → the chat shows up live in the admin panel and in Chatwoot.
  4. Reply from the Chatwoot dashboard → it appears in the player's chat and in the admin panel transcript.
  5. Resolve → the player sees the chat closed, it stays closed after a reload, and it can't be posted to.
  6. Reduced-motion run: all information and controls are still present.
  7. `check:connections` shows all ✓.

## Known limits / risks
- **Dify Sandbox:** 10 knowledge requests per minute, which means about 10 bot answers per minute across the whole site. Mitigation: a retrieval cache and a friendly "busy, or talk to a person" reply on 429. Dify Professional ($59/mo) raises it to 100 per minute.
- **Chatwoot Hacker plan:** 2 agents, about 500 conversations per month, 30-day history, no API token.
  - The widget API isn't officially documented, so a Chatwoot change could break it. All calls live in `lib/chatwoot.ts`, so a fix happens in one place.
  - If webhooks aren't on the free plan, agent replies show up through ~5 s polling while the player's chat is open. Replies sent while the player is away appear when they come back.
  - Upgrading later means switching `lib/chatwoot.ts` to the Account API (token) and moving reply, assign and resolve into our admin panel.
- Gemini's free tier has strict rate limits and may use data for training. Turn on billing before launch.
- Vercel Hobby is for non-commercial use only. If the site counts as commercial, it needs Pro.
- A player's chat history is tied to their browser. The ticket number still lets an agent find the chat.

**Not in v1:** email notifications to players, typing indicators, CAPTCHA, a custom domain, multiple languages, streaming replies.
