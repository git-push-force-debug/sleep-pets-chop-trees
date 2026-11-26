// Adds a few synthetic support-team FAQs (the second knowledge source), then rebuilds Pip's FAQ document in
// Dify the same way Admin → Knowledge does. Skips questions that already exist, so it is safe to re-run.
// Run: npx tsx --env-file=.env.local scripts/seed-faq.ts
import { createDeps } from '../apps/api/src/deps.ts';
import { FAQ_DOC_NAME, faqDocument } from '../apps/api/src/lib/faq.ts';

const FAQS: [question: string, answer: string][] = [
  [
    'When does the support team reply?',
    'A person from the team replies as soon as they can, usually within a day. Messages sent overnight are answered the next morning (Philippine time). Keep the chat open or come back to this page on the same device to see the reply.',
  ],
  [
    'What should I include when I report a bug?',
    'Tell us your Roblox username, what you were doing when it happened, roughly what time it happened, and whether you play on PC, phone, tablet or console. A screenshot helps a lot. Then tap "Talk to a person" so the team gets your report.',
  ],
  [
    'How do I report a player who is cheating or being rude?',
    "Use Roblox's own Report button on that player in the game menu first. Then talk to a person here with the player's username and the time it happened, so the team can look into it.",
  ],
];

const deps = createDeps();
const existing = new Set((await deps.store.listFaq()).map((f) => f.question.trim().toLowerCase()));
for (const [question, answer] of FAQS) {
  if (existing.has(question.toLowerCase())) console.log(`- already there: ${question}`);
  else {
    await deps.store.createFaq({ question, answer, created_by: null });
    console.log(`✓ added: ${question}`);
  }
}
const rows = await deps.store.listFaq();
await deps.dify.updateDocumentByText(deps.env.DIFY_PUBLIC_DATASET_ID, deps.env.DIFY_ADMIN_FAQ_DOCUMENT_ID, FAQ_DOC_NAME, faqDocument(rows));
console.log(`✓ Pip's FAQ document rebuilt with ${rows.length} answers (Dify indexes it within a minute)`);
