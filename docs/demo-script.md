# Demo script: GECO solution 09, Chatbots (about 10 minutes)

## The 1-minute story
- **Problem:** a small game studio's support team gets the same questions all day ("how do I rebirth?", "why did my pet wake up?"). Players wait, and staff burn hours copying answers from the guide.
- **Users:** players on the website, and the two-person support team behind them.
- **Solution:** Pip, a chatbot that answers **only** from the official guide, with tables, pictures and the sources it used. When it can't answer, it offers a person. The hand-off form captures the player's Roblox username and email (lead capture), then opens a ticket with the full chat attached.
- **Benefit:** most questions are answered instantly, 24/7. The team only handles the tricky ones, with full context. A dashboard shows leads, outcomes and which guide sections matter. All of it is built on free tools.

## Before you start
- Seed demo data once: `npx tsx --env-file=.env.local scripts/seed-demo.ts`.
- Open three tabs:
  - the live site, https://sleep-pets-chop-trees.vercel.app (also on a phone)
  - the admin panel, signed in
  - Chatwoot

## Run sheet
| # | Show | Say |
|---|---|---|
| 1 | Site home → open Pip → tap "How do I rebirth?" | Answers come only from the guide, with sources at the bottom. |
| 2 | Ask "Which dart gun is best for Snowland?" | Rich answers: tables, steps and pictures, still grounded and cited. |
| 3 | Ask "When is the next update?" | Out of scope: Pip says the guide doesn't cover it and offers a person. |
| 4 | Tap **Yes, talk to a person** → fill username + email → send | Lead capture. The ticket card shows the ticket number. |
| 5 | Admin → Inbox → open the ticket → reply | The reply reaches the player within seconds. The ticket also appears in Chatwoot. |
| 6 | Admin → **Ask if solved** → on the site tap **Yes, it's solved** | The ticket closes and the player is back with Pip. |
| 7 | Admin → **Leads** → search → **Open chat** → **Export leads (CSV)** | Leads dashboard with conversation history and export. |
| 8 | Admin → **Analytics** → change Date range, Outcome and Asked from | 4 charts and 6 tiles, all driven by 3 shared filters. |
| 9 | **Export conversations (CSV)** → open it in a spreadsheet | Business data export. |
| 10 | Admin → **Knowledge** → add an FAQ → ask Pip about it | Second knowledge source, live. |
| 11 | Ask Pip in Mandarin or Bahasa Melayu (e.g. 我怎么让宠物睡着？) | Stretch goal: replies in the player's language. |

## Requirement checklist
| GECO requirement | Where it shows |
|---|---|
| GPT-style large language model | Gemini behind every Pip answer |
| Upload company knowledge, escalation rules to a human | Guide in Dify. Admin → Knowledge (FAQs). Admin → Settings (confidence threshold, bot on/off, offline message) |
| Restrict answers to what the website covers | Off-topic question in step 3 |
| Ingest at least two sources | Guide file (structured HTML → Markdown) and team FAQs from the database (step 10) |
| Deploy on one channel | The website, live on Vercel |
| Front end: two of lead capture, sales assistant, post-sales support | Lead capture (step 4) and post-sales game support (steps 1–2) |
| Dashboard of leads and conversation history | Admin → Leads and Inbox (step 7) |
| Dashboard: ≥4 charts plus an interactive filter | Admin → Analytics (step 8) |
| Web and mobile access | Responsive site and chat. Show it on a phone. |
| Data export (CSV) | Leads and conversations exports (steps 7, 9) |
| Synthetic data, 30–50 records | `scripts/seed-demo.ts`: 40 chats |
| Free tools, repeatable setup | Free stack and steps in the README |
| Stretch: citations and Mandarin/Malay | Sources under every answer (step 1). Step 11 |
