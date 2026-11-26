// Translates the public guide into Simplified Chinese for the website's 中文 setting.
// Run: npx tsx --env-file=.env.local scripts/translate-guide.ts   (writes content/guide.public.zh.json)
// Re-runs only translate sections whose English changed (cache in .tmp/guide-zh-cache.json).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Guide } from '../packages/shared/src/guide.ts';
import { CHAPTERS_ZH, SECTIONS_ZH } from './lib/guide-titles-zh.ts';
import { checkTranslation } from './lib/translate-check.ts';

const SRC = 'content/guide.public.json';
const OUT = 'content/guide.public.zh.json';
const CACHE = '.tmp/guide-zh-cache.json';
const MODEL = process.env.TRANSLATE_MODEL ?? process.env.GEMINI_MODEL; // checkTranslation guards the fast model's output
const KEY = process.env.GEMINI_API_KEY;
if (!KEY || !MODEL) throw new Error('GEMINI_API_KEY and GEMINI_MODEL are required (.env.local)');

const RULES = `You translate the official guide of the Roblox game "Sleep Pets & Chop Trees" from English into Simplified Chinese (简体中文) for kids and teens.
Rules:
- Keep the Markdown structure exactly: the same headings, lists, blockquotes, bold, links and tables (same rows and columns, same | separators).
- Keep every number, price, percentage, time and code exactly as written (for example $5,000, 12%, 3m 30s).
- Keep the names of the game, items, tools, guns, animals, biomes, places, currencies (Cash, Wood), menus and buttons in English, because players see them in English in Roblox. You may add a short Chinese gloss in brackets after a name the first time it appears in a section.
- Translate everything else naturally. Do not add or remove information.
Return JSON only.`;

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gemini<T>(prompt: string, schema: object): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY!, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RULES }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseJsonSchema: schema, thinkingConfig: { thinkingLevel: 'low' } },
      }),
      signal: AbortSignal.timeout(120_000),
    }).catch((e: Error) => (console.warn(`  request failed: ${e.message}`), null));
    if (res && !res.ok) console.warn(`  Gemini ${res.status}`);
    if (res?.ok) {
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      try {
        return JSON.parse(text) as T;
      } catch {
        // malformed JSON: retry
      }
    }
    await sleep(res?.status === 429 ? 30_000 : 5_000);
  }
  throw new Error('Gemini kept failing; re-run to resume from the cache');
}

const str = { type: 'string' };
const guide = JSON.parse(readFileSync(SRC, 'utf8')) as Guide;
mkdirSync('.tmp', { recursive: true });
const cache: Record<string, unknown> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const save = () => writeFileSync(CACHE, JSON.stringify(cache, null, 2));

async function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  if (cache[key] !== undefined) return cache[key] as T;
  const value = await make();
  cache[key] = value;
  save();
  await sleep(4000); // free-tier pacing
  return value;
}

const out: Guide = structuredClone(guide);
const CONCURRENCY = 3; // the fast model takes ~1-2 min per long section; one at a time took over an hour
const jobs: (() => Promise<void>)[] = [];
const failed: string[] = [];
for (const chapter of out.chapters) {
  jobs.push(async () => {
    const head = { title: guide.chapters.find((c) => c.slug === chapter.slug)!.title, summary: guide.chapters.find((c) => c.slug === chapter.slug)!.summary };
    Object.assign(chapter, await cached(`chapter:${chapter.slug}:${hash(head)}`, () =>
      gemini<typeof head>(`Translate these JSON fields:\n${JSON.stringify(head)}`, { type: 'object', properties: { title: str, summary: str }, required: ['title', 'summary'] }),
    ));
  });
  for (const section of chapter.sections) {
    jobs.push(async () => {
      const src = { title: section.title, markdown: section.markdown };
      const key = `section:${section.id}:${hash(src)}`;
      const old = cache[key] as typeof src | undefined;
      if (old && checkTranslation(src.markdown, old.markdown)) delete cache[key]; // cached before a stricter check: redo
      const zh = await cached(key, async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const t = await gemini<typeof src>(`Translate this guide section. Return {"title","markdown"}.\n${JSON.stringify(src)}`, {
            type: 'object', properties: { title: str, markdown: str }, required: ['title', 'markdown'],
          });
          const problem = checkTranslation(src.markdown, t.markdown);
          if (!problem) return t;
          console.warn(`  ${section.id}: ${problem}, retrying`);
        }
        throw new Error(`${section.id}: translation keeps changing the structure`);
      });
      Object.assign(section, zh);
      console.log(`✓ ${chapter.slug}/${section.id}`);
    });
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let job = jobs.shift(); job; job = jobs.shift()) await job().catch((e: Error) => (failed.push(e.message), console.error(`✗ ${e.message}`)));
}));
if (failed.length) throw new Error(`${failed.length} part(s) failed; re-run to retry only those:\n${failed.join('\n')}`);

// Image text, 10 per call (25 kept hitting 503s).
const ids = Object.keys(out.images);
for (let i = 0; i < ids.length; i += 10) {
  const batch = ids.slice(i, i + 10).map((id) => ({ id, alt: guide.images[id]!.alt, caption: guide.images[id]!.caption, label: guide.images[id]!.label }));
  const zh = await cached(`images:${hash(batch)}`, () =>
    gemini<{ items: typeof batch }>(`Translate alt, caption and label of each item; keep id unchanged. Empty strings stay empty.\n${JSON.stringify({ items: batch })}`, {
      type: 'object',
      properties: { items: { type: 'array', items: { type: 'object', properties: { id: str, alt: str, caption: str, label: str }, required: ['id', 'alt', 'caption', 'label'] } } },
      required: ['items'],
    }),
  );
  for (const item of zh.items) if (out.images[item.id]) Object.assign(out.images[item.id]!, { alt: item.alt, caption: item.caption, label: item.label });
}

for (const chapter of out.chapters) {
  Object.assign(chapter, CHAPTERS_ZH[chapter.slug] ?? {});
  for (const section of chapter.sections) section.title = SECTIONS_ZH[section.id] ?? section.title;
}
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}`);
