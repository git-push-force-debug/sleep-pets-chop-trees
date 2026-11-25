// Ask the live bot pipeline (Dify + Gemini + Supabase cache) one or more questions, without the website.
// Run: npx tsx --env-file=.env.local scripts/ask.ts "how do I rebirth?" "another question"
import { answerQuestion } from '../apps/api/src/lib/answer.ts';
import { createDeps } from '../apps/api/src/deps.ts';

const deps = createDeps();
for (const [i, question] of process.argv.slice(2).entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, 7000)); // Dify Sandbox: 10 knowledge requests per minute
  const started = Date.now();
  const { reply, offerHuman, topScore, answerFound } = await answerQuestion(deps, { question, history: [] });
  console.log(
    `\n${question}\n  ${Date.now() - started}ms · top ${topScore.toFixed(2)} · found ${answerFound} · offer person ${offerHuman}` +
      `\n  blocks: ${reply.blocks.map((b) => b.type).join(', ')}` +
      `\n  sources: ${reply.sources.map((s) => s.url.replace(deps.env.SITE_URL, '')).join(', ') || '—'}` +
      `\n  images: ${reply.images.map((im) => im.id).join(', ') || '—'}` +
      `\n  first text: ${(reply.blocks.find((b) => b.type === 'text') as { markdown?: string } | undefined)?.markdown?.slice(0, 140) ?? '—'}`,
  );
}
