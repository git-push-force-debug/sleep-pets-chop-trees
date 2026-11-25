import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BotReply } from '../../../../packages/shared/src/blocks.ts';
import { formatSegmentHeader } from '../../../../packages/shared/src/guide.ts';
import type { Deps } from '../app.ts';
import { answerQuestion, replyToText } from '../lib/answer.ts';
import { requireAgent } from '../lib/auth.ts';
import { computeStats } from '../lib/stats.ts';
import { syncSession } from '../lib/sync.ts';

const BATCH_SYNC_LIMIT = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

const ReplyBody = z.object({ text: z.string().trim().min(1).max(2000) });
export const RESOLVE_QUESTION = 'Did this solve your problem?';
const resolveQuestion = (): BotReply => ({ blocks: [{ type: 'text', markdown: RESOLVE_QUESTION }], suggestions: [], sources: [], images: [], ask: 'resolve' });
const FaqBody = z.object({ question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(3000) });
const TeamBody = z.object({
  email: z.string().trim().email().max(200),
  displayName: z.string().trim().min(1).max(60),
  role: z.enum(['admin', 'agent']),
});
const TeamPatch = z.object({ displayName: z.string().trim().min(1).max(60).optional(), role: z.enum(['admin', 'agent']).optional() });
const SettingsBody = z.object({
  botEnabled: z.boolean(),
  greeting: z.string().trim().min(1).max(300),
  starterQuestions: z.array(z.string().trim().min(1).max(80)).max(3),
  offlineMessage: z.string().trim().min(1).max(500),
  evidenceThreshold: z.number().min(0).max(1),
  supportHours: z.string().trim().max(120),
});
const StatsQuery = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() });

const faqSegment = (id: string, question: string, answer: string) =>
  `${formatSegmentHeader(`faq-${id.slice(0, 8)}`, 'faq-admin', [])}\n### Team answers › ${question}\n\n${answer}`;

export function registerAdminRoutes(app: FastifyInstance, deps: Deps) {
  const agent = { preHandler: requireAgent(deps) };
  const admin = { preHandler: requireAgent(deps, 'admin') };
  const { DIFY_PUBLIC_DATASET_ID: dataset, DIFY_ADMIN_FAQ_DOCUMENT_ID: faqDoc } = deps.env;

  app.post('/admin/sync', agent, async (req) => {
    const sessions = await deps.store.listSessions(['waiting_human', 'human'], BATCH_SYNC_LIMIT);
    let synced = 0;
    for (const s of sessions) {
      try {
        await syncSession(deps, s.id);
        synced += 1;
      } catch (error) {
        req.log.error(error); // one broken session must not block the others
      }
    }
    return { synced };
  });

  app.post<{ Params: { id: string } }>('/admin/sessions/:id/hand-back', agent, async (req, reply) => {
    const updated = await deps.store.updateSession(req.params.id, { status: 'bot', bot_paused: false });
    if (!updated) return reply.code(404).send({ error: 'Chat not found' });
    await deps.store.insertMessages([{ session_id: updated.id, role: 'system', content: `Handed back to Pip by ${req.agent!.display_name}` }]);
    return { ok: true };
  });

  // Replies from the admin panel go straight to our database (the free Chatwoot plan can't post as an agent);
  // realtime delivers them to the player's chat.
  app.post<{ Params: { id: string } }>('/admin/sessions/:id/reply', agent, async (req, reply) => {
    const body = ReplyBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Replies must be 1 to 2,000 characters.' });
    const session = await deps.store.getSession(req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    if (session.status === 'resolved') return reply.code(409).send({ error: 'This chat is resolved.' });
    const [message] = await deps.store.insertMessages([
      { session_id: session.id, role: 'agent', content: body.data.text, agent_name: req.agent!.display_name },
    ]);
    await deps.store.updateSession(session.id, { status: 'human', bot_paused: true });
    return { message };
  });

  app.post<{ Params: { id: string } }>('/admin/sessions/:id/ask-resolved', agent, async (req, reply) => {
    const session = await deps.store.getSession(req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    if (session.status === 'resolved') return reply.code(409).send({ error: 'This chat is resolved.' });
    await deps.store.insertMessages([{ session_id: session.id, role: 'bot', content: RESOLVE_QUESTION, reply: resolveQuestion() }]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/admin/sessions/:id/resolve', agent, async (req, reply) => {
    const updated = await deps.store.updateSession(req.params.id, { status: 'resolved', resolved_at: new Date().toISOString() });
    if (!updated) return reply.code(404).send({ error: 'Chat not found' });
    await deps.store.insertMessages([{ session_id: updated.id, role: 'system', content: `Resolved by ${req.agent!.display_name}` }]);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/admin/sessions/:id/suggest', agent, async (req, reply) => {
    const messages = await deps.store.listMessages(req.params.id);
    const lastQuestion = messages.filter((m) => m.role === 'user').at(-1);
    if (!lastQuestion) return reply.code(400).send({ error: 'There is no player question to answer yet.' });
    const history = messages
      .filter((m) => m !== lastQuestion && (m.role === 'user' || m.role === 'bot' || m.role === 'agent'))
      .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('bot' as const), text: m.content }));
    const { reply: suggestion } = await answerQuestion(deps, {
      question: lastQuestion.content,
      history,
      datasetIds: [deps.env.DIFY_PUBLIC_DATASET_ID, deps.env.DIFY_INTERNAL_DATASET_ID],
    });
    return { text: replyToText({ ...suggestion, blocks: suggestion.blocks.filter((b) => b.type !== 'handoff') }) };
  });

  app.get('/admin/faq', agent, async () => ({ entries: await deps.store.listFaq() }));

  app.post('/admin/faq', agent, async (req, reply) => {
    const body = FaqBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Question and answer are required.' });
    const row = await deps.store.createFaq({ ...body.data, created_by: req.userId });
    const segmentId = await deps.dify.addSegment(dataset, faqDoc, faqSegment(row.id, row.question, row.answer));
    return { entry: await deps.store.updateFaq(row.id, { dify_segment_id: segmentId }) };
  });

  app.patch<{ Params: { id: string } }>('/admin/faq/:id', agent, async (req, reply) => {
    const body = FaqBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Question and answer are required.' });
    const row = await deps.store.updateFaq(req.params.id, body.data);
    if (!row) return reply.code(404).send({ error: 'FAQ entry not found' });
    if (row.dify_segment_id) await deps.dify.updateSegment(dataset, faqDoc, row.dify_segment_id, faqSegment(row.id, row.question, row.answer));
    return { entry: row };
  });

  app.delete<{ Params: { id: string } }>('/admin/faq/:id', agent, async (req, reply) => {
    const row = await deps.store.deleteFaq(req.params.id);
    if (!row) return reply.code(404).send({ error: 'FAQ entry not found' });
    if (row.dify_segment_id) await deps.dify.deleteSegment(dataset, faqDoc, row.dify_segment_id);
    return reply.code(204).send();
  });

  app.get('/admin/gaps', agent, async () => ({ gaps: await deps.store.listGaps() }));

  app.post<{ Params: { id: string } }>('/admin/gaps/:id/resolve', agent, async (req) => {
    await deps.store.resolveGap(req.params.id);
    return { ok: true };
  });

  app.get('/admin/stats', agent, async (req, reply) => {
    const query = StatsQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'from and to must be ISO dates' });
    const to = query.data.to ?? new Date().toISOString();
    const from = query.data.from ?? new Date(new Date(to).getTime() - 30 * DAY_MS).toISOString();
    const { sessions, messages } = await deps.store.statsData(from, to);
    return { from, to, ...computeStats(sessions, messages) };
  });

  app.get('/admin/team', agent, async () => ({ team: await deps.store.listAgents() }));

  app.post('/admin/team', admin, async (req, reply) => {
    const body = TeamBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Email, name and role are required.' });
    const password = randomBytes(15).toString('base64url'); // 20 characters, shown to the admin once
    let userId: string;
    try {
      userId = await deps.store.createAuthUser(body.data.email, password);
    } catch {
      return reply.code(409).send({ error: 'That email already has an account.' });
    }
    await deps.store.upsertAgent({ user_id: userId, role: body.data.role, display_name: body.data.displayName });
    return { userId, password };
  });

  app.patch<{ Params: { userId: string } }>('/admin/team/:userId', admin, async (req, reply) => {
    const body = TeamPatch.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid change' });
    if (req.params.userId === req.userId && body.data.role === 'agent') return reply.code(400).send({ error: "You can't remove your own admin role." });
    const row = await deps.store.updateAgent(req.params.userId, {
      ...(body.data.role && { role: body.data.role }),
      ...(body.data.displayName && { display_name: body.data.displayName }),
    });
    return row ? { member: row } : reply.code(404).send({ error: 'Team member not found' });
  });

  app.delete<{ Params: { userId: string } }>('/admin/team/:userId', admin, async (req, reply) => {
    if (req.params.userId === req.userId) return reply.code(400).send({ error: "You can't remove yourself." });
    await deps.store.deleteAgent(req.params.userId);
    await deps.store.deleteAuthUser(req.params.userId);
    return reply.code(204).send();
  });

  app.get('/admin/settings', agent, async () => ({ settings: await deps.store.getSettings() }));

  app.put('/admin/settings', admin, async (req, reply) => {
    const body = SettingsBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid settings', fields: body.error.issues.map((i) => i.path.join('.')) });
    await deps.store.saveSettings(body.data);
    return { settings: body.data };
  });
}
