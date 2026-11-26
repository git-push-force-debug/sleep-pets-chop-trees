// Translates the public guide into Simplified Chinese for the website's 中文 setting.
// Run: npx tsx --env-file=.env.local scripts/translate-guide.ts   (writes content/guide.public.zh.json)
// Re-runs only translate sections whose English changed (cache in .tmp/guide-zh-cache.json).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { glossaryLines, type Glossary } from '../packages/shared/src/glossary.ts';
import type { Guide } from '../packages/shared/src/guide.ts';
import { CHAPTERS_ZH, SECTIONS_ZH } from './lib/guide-titles-zh.ts';
import { checkTranslation } from './lib/translate-check.ts';

const SRC = 'content/guide.public.json';
const OUT = 'content/guide.public.zh.json';
const CREATOR_OUT = 'content/guide.creator.zh.json'; // admin-only chapter: never in the public site's files
const GLOSSARY = 'content/glossary.zh.json';
const CACHE = '.tmp/guide-zh-cache.json';
const MODEL = process.env.TRANSLATE_MODEL ?? process.env.GEMINI_MODEL; // checkTranslation guards the fast model's output
const STRONG = process.env.GEMINI_FALLBACK_MODEL ?? MODEL; // last tries on a section the fast model keeps getting wrong
const V = 'v2'; // bump when the rules change, so every part is translated again
const KEY = process.env.GEMINI_API_KEY;
if (!KEY || !MODEL) throw new Error('GEMINI_API_KEY and GEMINI_MODEL are required (.env.local)');

const RULES = `You translate the official guide of the Roblox game "Sleep Pets & Chop Trees" from English into Simplified Chinese (简体中文) for kids and teens.
Rules:
- Keep the Markdown structure exactly: the same headings, lists, blockquotes, bold, links and tables (same rows and columns, same | separators).
- Keep every number, price, percentage, time and redeem code exactly as written (for example $5,000, 12%, 3m 30s).
- Everything is written in Chinese, including the names of items, tools, guns, animals, biomes, places, currencies, menus and buttons. Use the NAME TRANSLATIONS given with the text exactly. The first time a name appears in a section, add its English name in full-width brackets after it, e.g. 飞镖手枪（Dart Pistol）, because the game itself shows English names; afterwards use only the Chinese name. Only the game's title "Sleep Pets & Chop Trees" and "Roblox" stay in English.
- Translate every sentence, table header, table cell, table note and list item. Never return English text unchanged. Do not add or remove information.
Return JSON only.`;

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gemini<T>(prompt: string, schema: object, model = MODEL): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
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

// 1. One shared name list, so a name reads the same on every page and in Pip's answers.
const text = guide.chapters.flatMap((c) => c.sections.map((s) => `${s.title}\n${s.markdown}`)).join('\n');
const candidates = [...new Set(text.match(/\b[A-Z][a-zA-Z0-9'-]*(?: (?:of |the |and )?[A-Z][a-zA-Z0-9'-]*)*/g) ?? [])]
  .filter((t) => t.length > 2 && text.split(t).length > 2);
const glossary = await cached(`glossary:${V}:${hash(candidates)}`, async () => {
  const res = await gemini<{ items: { en: string; zh: string }[] }>(
    `From these capitalised words found in the guide, keep only the game's own names: items, tools, guns, animals, rarities, traits, biomes, places, shops, currencies, stats, menus and buttons (drop ordinary words that are only capitalised at the start of a sentence, and drop "Sleep Pets", "Chop Trees" and "Roblox"). Give each a short, natural Simplified Chinese name for kids, consistent across related names (e.g. every "... Sniper" ends in 狙击枪).\n${JSON.stringify(candidates)}`,
    { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { en: str, zh: str }, required: ['en', 'zh'] } } }, required: ['items'] },
  ); // the stronger model kept timing out on this one long list
  return Object.fromEntries(res.items.filter((i) => candidates.includes(i.en) && i.zh.trim()).map((i) => [i.en, i.zh.trim()])) as Glossary;
});
// Names the model left out of the list but players meet often.
Object.assign(glossary, { Rebirth: '转生', Uncommon: '罕见', 'Game Pass': '游戏通行证', 'Game Passes': '游戏通行证', Rewards: '奖励' }, glossary);
writeFileSync(GLOSSARY, JSON.stringify(glossary, null, 2));
console.log(`glossary: ${Object.keys(glossary).length} names`);
const names = (t: string) => {
  const lines = glossaryLines(glossary, t);
  return lines ? `\nNAME TRANSLATIONS:\n${lines}` : '';
};

const out: Guide = structuredClone(guide);
const creatorEn = (JSON.parse(readFileSync('content/guide.json', 'utf8')) as Guide).chapters.find((c) => c.slug === 'creator')!;
const creator = structuredClone(creatorEn);
const EN = new Map([...guide.chapters, creatorEn].map((c) => [c.slug, c]));
const CONCURRENCY = 3; // the fast model takes ~1-2 min per long section; one at a time took over an hour
const jobs: (() => Promise<void>)[] = [];
const failed: string[] = [];
for (const chapter of [...out.chapters, creator]) {
  jobs.push(async () => {
    const head = { title: EN.get(chapter.slug)!.title, summary: EN.get(chapter.slug)!.summary };
    Object.assign(chapter, await cached(`chapter:${V}:${chapter.slug}:${hash(head)}`, () =>
      gemini<typeof head>(`Translate these JSON fields:\n${JSON.stringify(head)}${names(head.summary)}`, { type: 'object', properties: { title: str, summary: str }, required: ['title', 'summary'] }),
    ));
  });
  for (const section of chapter.sections) {
    jobs.push(async () => {
      const src = { title: section.title, markdown: section.markdown };
      const key = `section:${V}:${section.id}:${hash(src)}`;
      const old = cache[key] as typeof src | undefined;
      if (old && checkTranslation(src.markdown, old.markdown)) delete cache[key]; // cached before a stricter check: redo
      const zh = await cached(key, async () => {
        for (let attempt = 0; attempt < 4; attempt++) {
          const t = await gemini<typeof src>(`Translate this guide section. Return {"title","markdown"}.\n${JSON.stringify(src)}${names(src.markdown)}`, {
            type: 'object', properties: { title: str, markdown: str }, required: ['title', 'markdown'],
          }, attempt < 2 ? MODEL : STRONG);
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
  const zh = await cached(`images:${V}:${hash(batch)}`, () =>
    gemini<{ items: typeof batch }>(`Translate alt, caption and label of each item into Chinese (names too, no English brackets needed here); keep id unchanged. Empty strings stay empty.\n${JSON.stringify({ items: batch })}${names(JSON.stringify(batch))}`, {
      type: 'object',
      properties: { items: { type: 'array', items: { type: 'object', properties: { id: str, alt: str, caption: str, label: str }, required: ['id', 'alt', 'caption', 'label'] } } },
      required: ['items'],
    }),
  );
  for (const item of zh.items) if (out.images[item.id]) Object.assign(out.images[item.id]!, { alt: item.alt, caption: item.caption, label: item.label });
}

for (const chapter of [...out.chapters, creator]) {
  Object.assign(chapter, CHAPTERS_ZH[chapter.slug] ?? {});
  for (const section of chapter.sections) {
    section.title = SECTIONS_ZH[section.id] ?? section.title;
    // The model sometimes repeats a name as 【名字（Name）】 right after it; the English guide has no 【】.
    section.markdown = section.markdown.replace(/【[^】]*】/g, '');
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 2));
writeFileSync(CREATOR_OUT, JSON.stringify(creator, null, 2));
console.log(`Wrote ${OUT}`);
