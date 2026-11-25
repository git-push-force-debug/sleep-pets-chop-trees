import { z } from 'zod';
import { GuideImageSchema } from './guide.ts';

export const IntentSchema = z.enum([
  'game_question',
  'site_question',
  'wants_human',
  'account_or_purchase',
  'bug_report',
  'smalltalk',
  'off_topic',
]);

const label = z.string().min(1).max(80);
const short = z.string().min(1).max(400);

// z.union (not discriminatedUnion) so the JSON schema uses anyOf, which Gemini structured output supports.
export const BlockSchema = z.union([
  z.object({ type: z.literal('text'), markdown: z.string().min(1).max(2000) }),
  z.object({
    type: z.literal('steps'),
    title: label.optional(),
    items: z.array(z.object({ title: short, detail: short.optional() })).min(1).max(12),
  }),
  z.object({
    type: z.literal('table'),
    title: label.optional(),
    columns: z.array(label).min(1).max(8),
    rows: z.array(z.array(z.string().max(200))).max(40),
  }),
  z.object({
    type: z.literal('stats'),
    items: z.array(z.object({ label, value: label, hint: short.optional() })).min(1).max(6),
  }),
  z.object({ type: z.literal('images'), imageIds: z.array(z.string()).min(1).max(6) }),
  z.object({ type: z.literal('callout'), tone: z.enum(['tip', 'warning', 'info']), text: short }),
  z.object({
    type: z.literal('card'),
    title: label,
    subtitle: label.optional(),
    imageId: z.string().optional(),
    facts: z.array(z.object({ label, value: label })).max(8),
  }),
  z.object({ type: z.literal('handoff'), reason: short }),
]);

export const GeminiAnswerSchema = z.object({
  answer_found: z.boolean(),
  intent: IntentSchema,
  blocks: z.array(BlockSchema).min(1).max(8),
  suggestions: z.array(label).max(3),
  used_section_ids: z.array(z.string()),
});

export const SourceSchema = z.object({ title: z.string(), url: z.string() });

export const BotReplySchema = z.object({
  blocks: z.array(BlockSchema),
  suggestions: z.array(z.string()),
  sources: z.array(SourceSchema),
  images: z.array(GuideImageSchema),
});

export type Intent = z.infer<typeof IntentSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type GeminiAnswer = z.infer<typeof GeminiAnswerSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type BotReply = z.infer<typeof BotReplySchema>;

const GEMINI_DROP = new Set(['$schema', 'minLength', 'maxLength', 'minItems', 'maxItems']);
const stripLimits = (node: unknown): unknown =>
  Array.isArray(node)
    ? node.map(stripLimits)
    : node && typeof node === 'object'
      ? Object.fromEntries(
          Object.entries(node)
            .filter(([k]) => !GEMINI_DROP.has(k))
            // Gemini ignores `const` but enforces `enum`.
            .map(([k, v]) => (k === 'const' ? ['enum', [v]] : [k, stripLimits(v)])),
        )
      : node;

// Gemini rejects schemas with many length limits ("too many states"); the server clamps and re-validates instead.
export const geminiResponseSchema = () => stripLimits(z.toJSONSchema(GeminiAnswerSchema)) as Record<string, unknown>;
