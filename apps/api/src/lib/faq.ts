import { formatSegmentHeader } from '../../../../packages/shared/src/guide.ts';

/** Name of the team-FAQ document in the public Dify dataset. */
export const FAQ_DOC_NAME = 'admin-faq';

const INTRO = `${formatSegmentHeader('admin-faq-intro', 'faq-admin', [])}\n### Team answers › About this list\n\nAnswers added by the support team.`;

export const faqSegment = (id: string, question: string, answer: string) =>
  `${formatSegmentHeader(`faq-${id.slice(0, 8)}`, 'faq-admin', [])}\n### Team answers › ${question}\n\n${answer}`;

/** The whole team-FAQ document: an intro plus one segment per answer, split on the dataset's ===== separator. */
export const faqDocument = (rows: { id: string; question: string; answer: string }[]) =>
  [INTRO, ...rows.map((r) => faqSegment(r.id, r.question, r.answer))].join('\n\n=====\n\n');
