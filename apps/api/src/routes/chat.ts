import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { BotReply } from '../../../../packages/shared/src/blocks.ts';
import { ticketLabel, type ChatMessage, type ChatSession } from '../../../../packages/shared/src/api.ts';
import type { Deps } from '../app.ts';
import { answerQuestion, replyToText } from '../lib/answer.ts';
import { requireUser } from '../lib/auth.ts';
import { ChatwootClosedError } from '../lib/chatwoot.ts';
import { contactToken, startHandoff } from '../lib/handoff.ts';
import { syncSession } from '../lib/sync.ts';
import { DifyRateLimitError } from '../lib/dify.ts';
import { GeminiUnavailableError } from '../lib/gemini.ts';
import type { MessageRow, SessionRow } from '../lib/store.ts';

export const BUSY_COPY = 'Lots of players are asking right now — try again in a minute, or talk to a person.';
export const OUTAGE_COPY = "I'm having trouble answering right now. A person from the team can help.";

export const toChatSession = (s: SessionRow): ChatSession => ({
  id: s.id,
  status: s.status,
  botPaused: s.bot_paused,
  ticket: s.chatwoot_display_id,
  createdAt: s.created_at,
});

export const toChatMessage = (m: MessageRow): ChatMessage => ({
  id: m.id,
  role: m.role,
  content: m.content,
  reply: m.reply,
  agentName: m.agent_name,
  createdAt: m.created_at,
  feedback: m.feedback,
});

const MessageBody = z.object({ text: z.string().trim().min(1).max(1000) });
const SessionBody = z.object({ pageUrl: z.string().max(500).optional(), fresh: z.boolean().optional() }).optional();
const ResolveBody = z.object({ solved: z.boolean() });
const FeedbackBody =z.object({ value: z.union([z.literal(1), z.literal(-1)]) });
const HandoffBody = z.object({
  robloxUsername: z.string().trim().max(50).optional(),
  email: z.union([z.literal(''), z.string().trim().email().max(200)]).optional(),
  summary: z.string().trim().min(1).max(1000),
});

const handoffOnly = (text: string, reason: string): BotReply => ({
  blocks: [{ type: 'text', markdown: text }, { type: 'handoff', reason }],
  suggestions: [],
  sources: [],
  images: [],
});

async function limited(deps: Deps, reply: FastifyReply, key: string, limit: number, windowSeconds: number) {
  if (!(await deps.store.hitRateLimit(key, limit, windowSeconds))) return false;
  reply.code(429).send({ error: 'Too many requests', retryAfterSeconds: windowSeconds });
  return true;
}

export function registerChatRoutes(app: FastifyInstance, deps: Deps) {
  const auth = { preHandler: requireUser(deps) };

  const ownSession = async (userId: string, id: string) => {
    const session = await deps.store.getSession(id);
    return session && session.user_id === userId ? session : null;
  };

  app.get('/chat/settings', async () => {
    const { greeting, starterQuestions, offlineMessage, botEnabled } = await deps.store.getSettings();
    return { greeting, starterQuestions, offlineMessage, botEnabled };
  });

  app.post('/chat/sessions', auth, async (req, reply) => {
    const body = SessionBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' });
    // Return the newest chat even if resolved, so a returning player sees how it ended; `fresh` starts a new one.
    const existing = await deps.store.latestSession(req.userId);
    if (existing && (!body.data?.fresh || existing.status !== 'resolved')) return { session: toChatSession(existing) };
    if (await limited(deps, reply, `session:ip:${req.ip}`, 10, 3600)) return;
    const created = await deps.store.createSession(req.userId, {
      page_url: body.data?.pageUrl ?? null,
      user_agent: req.headers['user-agent']?.slice(0, 300) ?? null,
    });
    if (existing?.status === 'resolved' && existing.chatwoot_display_id) {
      const text = `Ticket ${ticketLabel(existing.chatwoot_display_id)} is resolved. You're back with Pip — ask me anything!`;
      await deps.store.insertMessages([{ session_id: created.id, role: 'bot', content: text, reply: { blocks: [{ type: 'text', markdown: text }], suggestions: [], sources: [], images: [] } }]);
    }
    return { session: toChatSession(created) };
  });

  app.get<{ Params: { id: string } }>('/chat/sessions/:id', auth, async (req, reply) => {
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    if (session.status !== 'bot') {
      try {
        await syncSession(deps, session.id);
      } catch (error) {
        req.log.error(error); // Chatwoot down: still show what we have
      }
    }
    const [current, messages] = await Promise.all([deps.store.getSession(session.id), deps.store.listMessages(session.id)]);
    return { session: toChatSession(current!), messages: messages.map(toChatMessage) };
  });

  app.post<{ Params: { id: string } }>('/chat/sessions/:id/messages', auth, async (req, reply) => {
    const body = MessageBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Messages must be 1 to 1,000 characters.' });
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    if (session.status === 'resolved') return reply.code(409).send({ error: 'This chat is closed.' });
    if (await limited(deps, reply, `msg:user:${req.userId}`, 8, 60)) return;
    if (await limited(deps, reply, `msg:ip:${req.ip}`, 40, 60)) return;

    const question = body.data.text;
    if (session.bot_paused) {
      try {
        const sent = await deps.chatwoot.sendMessage(await contactToken(deps, req.userId), question);
        const rows = await deps.store.insertMessages([
          { session_id: session.id, role: 'user', content: question, chatwoot_message_id: sent.id },
        ]);
        return { messages: rows.map(toChatMessage) };
      } catch (error) {
        if (!(error instanceof ChatwootClosedError)) throw error;
        await deps.store.updateSession(session.id, { status: 'resolved', resolved_at: new Date().toISOString() });
        return reply.code(409).send({ error: 'This chat is closed.' });
      }
    }
    const history = (await deps.store.listMessages(session.id))
      .filter((m) => m.role === 'user' || m.role === 'bot')
      .map((m) => ({ role: m.role as 'user' | 'bot', text: m.content }));
    const settings = await deps.store.getSettings();

    // Fallback replies store their one-line copy as content; normal answers store a text version of the blocks.
    const fallback = (text: string) => ({ reply: handoffOnly(text, 'A person from the team can help.'), content: text });
    let bot: { reply: BotReply; content: string };
    if (!settings.botEnabled) {
      bot = fallback(settings.offlineMessage);
    } else {
      try {
        const result = await answerQuestion(deps, { question, history });
        bot = { reply: result.reply, content: replyToText(result.reply) };
        if (result.offerHuman && !result.answerFound) {
          await deps.store.addGap({ session_id: session.id, question, top_score: result.topScore });
        }
      } catch (error) {
        if (error instanceof DifyRateLimitError) bot = fallback(BUSY_COPY);
        else {
          if (!(error instanceof GeminiUnavailableError)) req.log.error(error);
          bot = fallback(OUTAGE_COPY); // any other failure still gets a polite reply and a person
        }
      }
    }

    const rows = await deps.store.insertMessages([
      { session_id: session.id, role: 'user', content: question },
      { session_id: session.id, role: 'bot', content: bot.content, reply: bot.reply },
    ]);
    return { messages: rows.map(toChatMessage) };
  });

  app.post<{ Params: { id: string } }>('/chat/sessions/:id/handoff', auth, async (req, reply) => {
    const body = HandoffBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Please tell us what you need help with.' });
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    if (session.status === 'resolved') return reply.code(409).send({ error: 'This chat is closed.' });
    if (await limited(deps, reply, `handoff:user:${req.userId}`, 3, 3600)) return;
    try {
      return { session: toChatSession(await startHandoff(deps, session.id, body.data)) };
    } catch (error) {
      req.log.error(error);
      return reply.code(502).send({ error: "We couldn't reach the team right now. Please try again in a minute." });
    }
  });

  // The player's answer to "Did this solve your problem?" — Yes closes the ticket, No tells the team.
  app.post<{ Params: { id: string } }>('/chat/sessions/:id/resolve', auth, async (req, reply) => {
    const body = ResolveBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' });
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    if (session.status === 'resolved') return reply.code(409).send({ error: 'This chat is closed.' });
    if (await limited(deps, reply, `resolve:user:${req.userId}`, 10, 3600)) return;
    if (body.data.solved) {
      await deps.store.updateSession(session.id, { status: 'resolved', resolved_at: new Date().toISOString() });
      await deps.store.insertMessages([{ session_id: session.id, role: 'system', content: 'Player confirmed it’s solved' }]);
    } else {
      const text = 'No, I still need help.';
      let chatwootId: number | null = null;
      if (session.bot_paused) {
        try {
          chatwootId = (await deps.chatwoot.sendMessage(await contactToken(deps, req.userId), text)).id;
        } catch (error) {
          req.log.error(error); // best effort: the admin panel still shows it
        }
      }
      await deps.store.insertMessages([{ session_id: session.id, role: 'user', content: text, chatwoot_message_id: chatwootId }]);
    }
    const [current, messages] = await Promise.all([deps.store.getSession(session.id), deps.store.listMessages(session.id)]);
    return { session: toChatSession(current!), messages: messages.map(toChatMessage) };
  });

  app.post<{ Params: { id: string } }>('/chat/sessions/:id/sync', auth, async (req, reply) => {
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return reply.code(404).send({ error: 'Chat not found' });
    const { added } = await syncSession(deps, session.id);
    return { session: toChatSession((await deps.store.getSession(session.id))!), added };
  });

  app.post<{ Params: { id: string } }>('/chat/messages/:id/feedback', auth, async (req, reply) => {
    const body = FeedbackBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid feedback' });
    const message = await deps.store.getMessage(req.params.id);
    const session = message && message.role === 'bot' ? await ownSession(req.userId, message.session_id) : null;
    if (!message || !session) return reply.code(404).send({ error: 'Message not found' });
    await deps.store.setFeedback(message.id, body.data.value);
    return reply.code(204).send();
  });
}
