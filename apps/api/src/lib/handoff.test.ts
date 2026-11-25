import { describe, expect, it } from 'vitest';
import { buildApp, type Deps } from '../app.ts';
import { createFakeChatwoot } from '../test/fake-chatwoot.ts';
import { createFakeDeps } from '../test/fakes.ts';
import { startHandoff } from './handoff.ts';
import { syncSession } from './sync.ts';

const auth = { authorization: 'Bearer user:u1' };

async function setup() {
  const cw = createFakeChatwoot();
  const fake = createFakeDeps({ chatwoot: cw.client as unknown as Deps['chatwoot'] });
  const app = buildApp(fake.deps);
  const sessionId = (await app.inject({ method: 'POST', url: '/chat/sessions', headers: auth, payload: {} })).json().session.id;
  await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/messages`, headers: auth, payload: { text: 'how do I rebirth?' } });
  const token = () => fake.contacts.get('u1')!;
  return { ...fake, cw, app, sessionId, token };
}
const form = { robloxUsername: 'sleepyrancher22', summary: 'Gamepass missing' };

describe('startHandoff', () => {
  it('creates exactly one Chatwoot conversation when called twice at once', async () => {
    const { deps, cw, sessionId, sessions } = await setup();
    await Promise.all([startHandoff(deps, sessionId, form), startHandoff(deps, sessionId, form)]);
    expect(cw.client.createConversation).toHaveBeenCalledTimes(1);
    expect(sessions[0]).toMatchObject({ status: 'waiting_human', bot_paused: true, chatwoot_display_id: 42, roblox_username: 'sleepyrancher22' });
  });

  it('sends the bot transcript and summary as the first Chatwoot message', async () => {
    const { deps, cw, sessionId } = await setup();
    await startHandoff(deps, sessionId, form);
    const content = cw.client.createConversation.mock.calls[0]![1].content as string;
    expect(content).toContain('Player: how do I rebirth?');
    expect(content).toContain('Bot:');
    expect(content).toContain('Summary: Gamepass missing');
    expect(cw.client.createConversation.mock.calls[0]![1]).toMatchObject({ name: 'sleepyrancher22', customAttributes: { session_id: sessionId } });
  });

  it('puts the session back with the bot when Chatwoot fails, so the player can retry', async () => {
    const { deps, cw, sessionId, sessions } = await setup();
    cw.client.createConversation.mockRejectedValueOnce(new Error('down'));
    await expect(startHandoff(deps, sessionId, form)).rejects.toThrow();
    expect(sessions[0]).toMatchObject({ status: 'bot', bot_paused: false, chatwoot_display_id: null });
  });
});

describe('hand-off routes', () => {
  it('forwards player messages to Chatwoot while a person is handling the chat', async () => {
    const { app, cw, sessionId, token, deps } = await setup();
    await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/handoff`, headers: auth, payload: form });
    const res = await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/messages`, headers: auth, payload: { text: 'still missing' } });
    expect(res.json().messages).toHaveLength(1);
    expect(cw.client.sendMessage).toHaveBeenCalledWith(token(), 'still missing');
    expect(deps.gemini.generate).toHaveBeenCalledTimes(1); // only the first, pre-hand-off question
  });

  it('closes the chat with 409 when Chatwoot says the conversation is resolved', async () => {
    const { app, cw, sessionId, token, sessions } = await setup();
    await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/handoff`, headers: auth, payload: form });
    cw.resolve(token());
    const res = await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/messages`, headers: auth, payload: { text: 'hello?' } });
    expect(res.statusCode).toBe(409);
    expect(sessions[0]!.status).toBe('resolved');
  });

  it('limits hand-offs to 3 an hour', async () => {
    const { app, sessionId } = await setup();
    for (let i = 0; i < 3; i++) await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/handoff`, headers: auth, payload: form });
    const res = await app.inject({ method: 'POST', url: `/chat/sessions/${sessionId}/handoff`, headers: auth, payload: form });
    expect(res.statusCode).toBe(429);
  });
});

describe('syncSession', () => {
  it('imports only agent replies, once, and moves the chat to a person', async () => {
    const { deps, cw, sessionId, token, messages, sessions } = await setup();
    await startHandoff(deps, sessionId, form);
    cw.activity(token(), 'Conversation was assigned to Maya');
    cw.agentReply(token(), 'Hi! Please rejoin once.');
    expect(await syncSession(deps, sessionId)).toEqual({ added: 1, status: 'human' });
    expect(messages.filter((m) => m.role === 'agent')).toEqual([
      expect.objectContaining({ content: 'Hi! Please rejoin once.', agent_name: 'Maya' }),
    ]);
    expect(await syncSession(deps, sessionId)).toEqual({ added: 0, status: 'human' });
    expect(sessions[0]!.last_chatwoot_message_id).toBeGreaterThan(0);
  });

  it('marks the session resolved when Chatwoot resolves it, and reopens it only on a new team reply', async () => {
    const { deps, cw, sessionId, token, sessions } = await setup();
    await startHandoff(deps, sessionId, form);
    cw.resolve(token());
    expect((await syncSession(deps, sessionId)).status).toBe('resolved');
    expect(sessions[0]!.resolved_at).not.toBeNull();
    cw.conversations.get(token())!.status = 'open'; // also how a chat resolved in our admin panel looks to Chatwoot
    expect((await syncSession(deps, sessionId)).status).toBe('resolved');
    cw.agentReply(token(), 'One more thing…');
    expect((await syncSession(deps, sessionId)).status).toBe('human');
  });

  it('shows a returning player the reply and the resolved state on reload', async () => {
    const { app, deps, cw, sessionId, token } = await setup();
    await startHandoff(deps, sessionId, form);
    cw.agentReply(token(), 'Fixed it — enjoy!');
    cw.resolve(token());
    const res = (await app.inject({ url: `/chat/sessions/${sessionId}`, headers: auth })).json();
    expect(res.session.status).toBe('resolved');
    expect(res.messages.map((m: { role: string; content: string }) => [m.role, m.content])).toContainEqual(['agent', 'Fixed it — enjoy!']);
  });

  it('still loads a chat from the database when Chatwoot is down', async () => {
    const { app, deps, cw, sessionId } = await setup();
    await startHandoff(deps, sessionId, form);
    cw.client.getConversation.mockRejectedValue(new Error('Chatwoot down'));
    const res = await app.inject({ url: `/chat/sessions/${sessionId}`, headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().session.status).toBe('waiting_human');
  });
});

