import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { BlockSchema, GeminiAnswerSchema, type Block, type BotReply, type GeminiAnswer } from '../../../../packages/shared/src/blocks.ts';
import { CHAPTER_SLUGS, type GuideImage } from '../../../../packages/shared/src/guide.ts';
import type { Deps } from '../app.ts';
import type { Evidence } from './dify.ts';
import { buildContents, replyLang, SYSTEM_PROMPT, type Lang } from './prompt.ts';

const HUMAN_INTENTS = new Set(['wants_human', 'account_or_purchase', 'bug_report']);
// Chapters with a public page; creator is admin-only and the gallery page was removed (its pictures are still used).
const GUIDE_CHAPTERS = new Set<string>(CHAPTER_SLUGS.filter((c) => c !== 'creator' && c !== 'gallery'));
const MAX_SOURCES = 3;
const TOP_K = 8; // 5 missed table-only answers (e.g. darts per animal live in the biome roster)

export function decideHandoff(a: GeminiAnswer, topScore: number, threshold: number): boolean {
  return !a.answer_found || topScore < threshold || HUMAN_INTENTS.has(a.intent);
}

const REASONS = {
  en: {
    account_or_purchase: 'Purchases and account problems need a person from the team.',
    bug_report: 'Bugs and lost items need a person from the team.',
    wants_human: 'Sure — a person from the team can help.',
    not_found: "I couldn't find that in the game guide.",
  },
  zh: {
    account_or_purchase: '购买和账号问题需要团队成员来处理。',
    bug_report: '游戏漏洞和丢失的物品需要团队成员来处理。',
    wants_human: '好的，团队成员可以帮你。',
    not_found: '游戏指南里没有找到这个内容。',
  },
};

export function handoffReason(a: Pick<GeminiAnswer, 'intent' | 'answer_found'>, lang: Lang = 'en'): string {
  const copy = REASONS[lang];
  return a.intent === 'account_or_purchase' || a.intent === 'bug_report' || a.intent === 'wants_human' ? copy[a.intent] : copy.not_found;
}

// --- Repairing Gemini output: Gemini gets a limit-free schema, so over-long fields are truncated here.
type Path = (string | number)[];
function truncateAt(root: unknown, path: Path, max: number) {
  const parent = path.slice(0, -1).reduce<unknown>((node, key) => (node as Record<string | number, unknown>)?.[key], root);
  const key = path.at(-1)!;
  const target = (parent as Record<string | number, unknown>)?.[key];
  if (typeof target === 'string') (parent as Record<string | number, unknown>)[key] = `${target.slice(0, Math.max(0, max - 1))}…`;
  else if (Array.isArray(target)) target.length = max;
}

function repair<T>(schema: z.ZodType<T>, value: unknown): T | null {
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    const fixable = result.error.issues.filter((i) => i.code === 'too_big' && typeof i.maximum === 'number');
    if (!fixable.length) return null;
    for (const issue of fixable) truncateAt(value, issue.path as Path, Number((issue as { maximum: number }).maximum));
  }
  return null;
}

const BLOCK_BY_TYPE = new Map(BlockSchema.options.map((o) => [o.shape.type.value as string, o]));

export function coerceAnswer(raw: unknown): GeminiAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = structuredClone(raw) as Record<string, unknown>;
  const blocks = (Array.isArray(input.blocks) ? input.blocks : [])
    .slice(0, 8)
    .map((b) => {
      const option = BLOCK_BY_TYPE.get((b as { type?: string })?.type ?? '');
      return option ? repair(option as z.ZodType<Block>, b) : null;
    })
    .filter((b): b is Block => b !== null);
  if (!blocks.length) return null;
  return repair(GeminiAnswerSchema, { ...input, blocks, suggestions: Array.isArray(input.suggestions) ? input.suggestions.slice(0, 3) : [] });
}

export function sanitize(
  a: GeminiAnswer,
  evidence: Evidence[],
  guideImages: Record<string, GuideImage>,
  siteUrl: string,
  offerHuman: boolean,
  lang: Lang = 'en',
  titles: Record<string, string> = {},
): BotReply {
  const allowedImages = new Set(evidence.flatMap((e) => e.imageIds).filter((id) => guideImages[id]));
  const usedImages = new Set<string>();
  const blocks: Block[] = [];
  for (const block of a.blocks) {
    if (block.type === 'images') {
      const imageIds = block.imageIds.filter((id) => allowedImages.has(id));
      imageIds.forEach((id) => usedImages.add(id));
      if (imageIds.length) blocks.push({ ...block, imageIds });
    } else if (block.type === 'card' && block.imageId !== undefined) {
      const { imageId, ...rest } = block;
      if (allowedImages.has(imageId)) {
        usedImages.add(imageId);
        blocks.push(block);
      } else blocks.push(rest);
    } else if (block.type !== 'handoff') {
      blocks.push(block);
    }
  }
  // Pictures make answers friendlier: borrow one from the first used section that has one.
  if (a.answer_found && usedImages.size === 0) {
    const used = new Set(a.used_section_ids);
    const picture = evidence.filter((e) => used.has(e.sectionId)).flatMap((e) => e.imageIds).find((id) => allowedImages.has(id));
    if (picture) {
      usedImages.add(picture);
      blocks.push({ type: 'images', imageIds: [picture] });
    }
  }
  if (offerHuman) blocks.push({ type: 'handoff', reason: handoffReason(a, lang) });

  const byId = new Map(evidence.map((e) => [e.sectionId, e]));
  const sources = [...new Set(a.used_section_ids)]
    .map((id) => byId.get(id))
    .filter((e): e is Evidence => !!e && GUIDE_CHAPTERS.has(e.chapter))
    .slice(0, MAX_SOURCES)
    .map((e) => ({ title: titles[e.sectionId] ?? e.title, url: `${siteUrl}/guide/${e.chapter}#${e.sectionId}` }));

  const images = [...usedImages].map((id) => ({ ...guideImages[id]!, url: `${siteUrl}${guideImages[id]!.url}` }));
  return { blocks, suggestions: a.suggestions, sources, images };
}

/** Plain-text version of a bot reply, for history, transcripts and search. */
export function replyToText(reply: BotReply): string {
  return reply.blocks
    .map((b) => {
      switch (b.type) {
        case 'text': return b.markdown;
        case 'steps': return [b.title, ...b.items.map((s, i) => `${i + 1}. ${s.title}${s.detail ? ` — ${s.detail}` : ''}`)].filter(Boolean).join('\n');
        case 'table': return [b.title, b.columns.join(' | '), ...b.rows.map((r) => r.join(' | '))].filter(Boolean).join('\n');
        case 'stats': return b.items.map((s) => `${s.label}: ${s.value}`).join(', ');
        case 'callout': return b.text;
        case 'card': return [b.title, ...b.facts.map((f) => `${f.label}: ${f.value}`)].join(', ');
        case 'handoff': return b.reason;
        case 'images': return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

export const cacheKey = (datasetId: string, question: string) =>
  createHash('sha256').update(`${datasetId}\n${question.trim().toLowerCase().replace(/\s+/g, ' ')}`).digest('hex');

async function retrieveEvidence(deps: Deps, question: string, datasetIds: string[]): Promise<Evidence[]> {
  const all: Evidence[] = [];
  for (const datasetId of datasetIds) {
    const key = cacheKey(datasetId, question);
    let found = await deps.store.cacheGet(key);
    if (!found) {
      found = await deps.dify.retrieve(datasetId, question, TOP_K);
      await deps.store.cachePut(key, datasetId, found);
    }
    all.push(...found);
  }
  // Hybrid search pads results with zero-score keyword hits; they are noise.
  return all.filter((e) => e.score > 0).sort((x, y) => y.score - x.score).slice(0, TOP_K);
}

export async function answerQuestion(
  deps: Deps,
  input: { question: string; history: { role: 'user' | 'bot'; text: string }[]; datasetIds?: string[]; lang?: Lang },
): Promise<{ reply: BotReply; offerHuman: boolean; topScore: number; answerFound: boolean }> {
  const settings = await deps.store.getSettings();
  const evidence = await retrieveEvidence(deps, input.question, input.datasetIds ?? [deps.env.DIFY_PUBLIC_DATASET_ID]);
  const topScore = evidence[0]?.score ?? 0;
  const lang = replyLang(input.question, input.lang);
  const answer = await deps.gemini.generate(SYSTEM_PROMPT, buildContents(input.question, input.history, evidence, lang, deps.guideZh.glossary), coerceAnswer);
  const offerHuman = decideHandoff(answer, topScore, settings.evidenceThreshold);
  return {
    reply: lang === 'zh'
      ? sanitize(answer, evidence, deps.guideZh.images, deps.env.SITE_URL, offerHuman, 'zh', deps.guideZh.titles)
      : sanitize(answer, evidence, deps.guideImages, deps.env.SITE_URL, offerHuman),
    offerHuman,
    topScore,
    answerFound: answer.answer_found && topScore >= settings.evidenceThreshold,
  };
}
