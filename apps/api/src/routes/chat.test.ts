import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.ts';
import { DifyRateLimitError } from '../lib/dify.ts';
import { GeminiUnavailableError } from '../lib/gemini.ts';
import { createFakeDeps } from '../test/fakes.ts';

const auth = (user = 'u1') => ({ authorization: `Bearer user:${user}` });

async function setup(over = {}) {
  const fake = createFakeDeps(over);
  const app = buildApp(fake.deps);
  const res = await app.inject({ method: 'POST', url: '/chat/sessions', headers: auth(), payload: {} });
  return { ...fake, app, sessionId: res.json().session.id as string };
}
const send = (app: Awaited<ReturnType<typeof setup>>['app'], sessionId: string, text: string, user = 'u1') =>
  app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/messages`, headers: auth(user), payload: { text } });

describe('chat routes', () => {
  it('serves health and public settings without a token', async () => {
    const { app } = await setup();
    expect((await app.inject({ url: '/health' })).json()).toEqual({ ok: true });
    expect((await app.inject({ url: '/chat/settings' })).json()).toEqual({
      greeting: 'Hi!', starterQuestions: ['How do I rebirth?'], offlineMessage: 'The team will reply soon.', botEnabled: true,
    });
  });

  it('rejects requests without a valid token', async () => {
    const { app } = await setup();
    expect((await app.inject({ method: 'POST', url: '/chat/sessions', payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/chat/sessions', headers: { authorization: 'Bearer nope' }, payload: {} })).statusCode).toBe(401);
  });

  it('returns the same open session on a second call', async () => {
    const { app, sessionId } = await setup();
    const again = await app.inject({ method: 'POST', url: '/chat/sessions', headers: auth(), payload: {} });
    expect(again.json().session).toMatchObject({ id: sessionId, status: 'bot', ticket: null });
  });

  it('hides another user’s session as not found', async () => {
    const { app, sessionId } = await setup();
    expect((await app.inject({ url: `/chat/sessions/${sessionId}`, headers: auth('u2') })).statusCode).toBe(404);
    expect((await send(app, sessionId, 'hi', 'u2')).statusCode).toBe(404);
  });

  it('rejects an empty or over-long message', async () => {
    const { app, sessionId } = await setup();
    expect((await send(app, sessionId, '   ')).statusCode).toBe(400);
    expect((await send(app, sessionId, 'x'.repeat(1001))).statusCode).toBe(400);
  });

  it('refuses messages to a resolved session', async () => {
    const { app, sessionId, sessions } = await setup();
    sessions[0]!.status = 'resolved';
    expect((await send(app, sessionId, 'hello?')).statusCode).toBe(409);
  });

  it('answers with blocks and a guide source, and stores both messages', async () => {
    const { app, sessionId, messages } = await setup();
    const res = await send(app, sessionId, 'how do I rebirth?');
    expect(res.statusCode).toBe(200);
    const [user, bot] = res.json().messages;
    expect(user).toMatchObject({ role: 'user', content: 'how do I rebirth?' });
    expect(bot.reply.blocks[0]).toMatchObject({ type: 'table' });
    expect(bot.reply.sources).toEqual([{ title: 'Unlock the six ranch tiers', url: 'https://site.test/guide/player-guide#rebirth' }]);
    expect(messages).toHaveLength(2);
  });

  it('limits a player to 8 messages a minute', async () => {
    const { app, sessionId } = await setup();
    for (let i = 0; i < 8; i++) expect((await send(app, sessionId, `q${i}`)).statusCode).toBe(200);
    const res = await send(app, sessionId, 'q9');
    expect(res.statusCode).toBe(429);
    expect(res.json().retryAfterSeconds).toBe(60);
  });

  it('answers a Dify rate limit with the busy copy and a hand-off', async () => {
    const { app, sessionId } = await setup({
      dify: { retrieve: vi.fn(async () => { throw new DifyRateLimitError(); }) },
    });
    const bot = (await send(app, sessionId, 'how do I rebirth?')).json().messages[1];
    expect(bot.content).toBe('Lots of players are asking right now — try again in a minute, or talk to a person.');
    expect(bot.reply.blocks.at(-1).type).toBe('handoff');
  });

  it('answers a Gemini outage with an apology and a hand-off', async () => {
    const { app, sessionId } = await setup({
      gemini: { generate: vi.fn(async () => { throw new GeminiUnavailableError(); }) },
    });
    const res = await send(app, sessionId, 'how do I rebirth?');
    expect(res.statusCode).toBe(200);
    const bot = res.json().messages[1];
    expect(bot.content).toBe("I'm having trouble answering right now. A person from the team can help.");
    expect(bot.reply.blocks.at(-1).type).toBe('handoff');
  });

  it('answers a repeated question from cache without calling Dify again', async () => {
    const fake = await setup();
    await send(fake.app, fake.sessionId, 'How do I  rebirth?');
    await send(fake.app, fake.sessionId, 'how do i rebirth?');
    expect(fake.deps.dify.retrieve).toHaveBeenCalledTimes(1);
  });

  it('logs a knowledge gap when the bot cannot answer', async () => {
    const { app, sessionId, gaps } = await setup({ dify: { retrieve: vi.fn(async () => []) } });
    await send(app, sessionId, 'what is the meaning of life');
    expect(gaps).toEqual([{ session_id: sessionId, question: 'what is the meaning of life', top_score: 0 }]);
  });

  it('skips the bot and offers a person when the bot is switched off', async () => {
    const { app, sessionId, settings, deps } = await setup();
    settings.botEnabled = false;
    const bot = (await send(app, sessionId, 'hi')).json().messages[1];
    expect(bot.content).toBe('The team will reply soon.');
    expect(bot.reply.blocks.at(-1).type).toBe('handoff');
    expect(deps.gemini.generate).not.toHaveBeenCalled();
  });

  it('records feedback only on the caller’s own bot messages', async () => {
    const { app, sessionId, messages } = await setup();
    const botId = (await send(app, sessionId, 'how do I rebirth?')).json().messages[1].id;
    expect((await app.inject({ method: 'POST', url: `/chat/messages/${botId}/feedback`, headers: auth('u2'), payload: { value: 1 } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/chat/messages/${botId}/feedback`, headers: auth(), payload: { value: -1 } })).statusCode).toBe(204);
    expect(messages.find((m) => m.id === botId)?.feedback).toBe(-1);
  });
});
