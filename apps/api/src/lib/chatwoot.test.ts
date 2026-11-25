import { describe, expect, it, vi } from 'vitest';
import { ChatwootClosedError, createChatwootClient } from './chatwoot.ts';

const BASE = 'https://app.chatwoot.com';
const cfg = { baseUrl: BASE, websiteToken: 'WT123' };
// Header.payload.signature with payload {"source_id":"src-1","inbox_id":160043}
const token = `x.${Buffer.from(JSON.stringify({ source_id: 'src-1', inbox_id: 160043 })).toString('base64url')}.y`;

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(body === undefined ? '' : JSON.stringify(body), { status }),
  );
}
const call = (f: ReturnType<typeof fakeFetch>) => {
  const [url, init] = f.mock.calls[0]!;
  return { url, init, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined };
};

describe('chatwoot widget client', () => {
  it('creates a contact and reads its source id from the token', async () => {
    const f = fakeFetch(200, { website_channel_config: { auth_token: token } });
    const result = await createChatwootClient(cfg, f).createContact();
    expect(result).toEqual({ authToken: token, sourceId: 'src-1' });
    expect(call(f).url).toBe(`${BASE}/api/v1/widget/config?website_token=WT123`);
    expect(call(f).init?.method).toBe('POST');
  });

  it('creates a conversation with the contact, first message and custom attributes', async () => {
    const f = fakeFetch(200, { id: 42, status: 'open', messages: [] });
    const conv = await createChatwootClient(cfg, f).createConversation(token, {
      name: 'sleepyrancher22',
      email: 'kid@example.com',
      content: 'Player: hi',
      customAttributes: { session_id: 's1' },
    });
    expect(conv).toEqual({ displayId: 42, status: 'open' });
    const c = call(f);
    expect(c.url).toBe(`${BASE}/api/v1/widget/conversations?website_token=WT123`);
    expect(c.headers.get('x-auth-token')).toBe(token);
    expect(c.body).toMatchObject({
      contact: { name: 'sleepyrancher22', email: 'kid@example.com' },
      message: { content: 'Player: hi' },
      custom_attributes: { session_id: 's1' },
    });
    expect(typeof c.body.message.timestamp).toBe('string');
  });

  it('sends a message to the latest conversation', async () => {
    const f = fakeFetch(200, { id: 900 });
    expect(await createChatwootClient(cfg, f).sendMessage(token, 'still missing')).toEqual({ id: 900 });
    expect(call(f).url).toBe(`${BASE}/api/v1/widget/messages?website_token=WT123`);
    expect(call(f).body).toMatchObject({ message: { content: 'still missing' } });
  });

  it('maps a 403 on send to ChatwootClosedError', async () => {
    await expect(createChatwootClient(cfg, fakeFetch(403, { error: 'resolved' })).sendMessage(token, 'x')).rejects.toBeInstanceOf(
      ChatwootClosedError,
    );
  });

  it('lists messages after an id and maps the payload', async () => {
    const f = fakeFetch(200, {
      payload: [
        { id: 901, content: 'Hi! Rejoin once.', message_type: 1, created_at: 1795570000, sender: { name: 'Maya', type: 'user' } },
        { id: 902, content: 'ok', message_type: 0, created_at: 1795570100 },
      ],
    });
    expect(await createChatwootClient(cfg, f).listMessages(token, 900)).toEqual([
      { id: 901, content: 'Hi! Rejoin once.', messageType: 1, senderName: 'Maya', createdAt: 1795570000 },
      { id: 902, content: 'ok', messageType: 0, senderName: null, createdAt: 1795570100 },
    ]);
    expect(call(f).url).toBe(`${BASE}/api/v1/widget/messages?website_token=WT123&after=900`);
    expect(call(f).init?.method ?? 'GET').toBe('GET');
  });

  it('reads the latest conversation status, or null when there is none', async () => {
    expect(await createChatwootClient(cfg, fakeFetch(200, { id: 42, status: 'resolved' })).getConversation(token)).toEqual({
      displayId: 42,
      status: 'resolved',
    });
    expect(await createChatwootClient(cfg, fakeFetch(200, {})).getConversation(token)).toBeNull();
  });
});
