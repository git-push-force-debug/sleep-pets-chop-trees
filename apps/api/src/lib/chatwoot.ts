// Chatwoot Cloud's free plan has no API token, so the server drives a Website inbox through the widget API —
// the same endpoints Chatwoot's own chat bubble uses (verified against chatwoot/chatwoot source).
// Each contact's auth token is a secret: store it server-side only (table chatwoot_contacts).

export interface CwMessage {
  id: number;
  content: string;
  messageType: 0 | 1 | 2 | 3; // 0 incoming (player), 1 outgoing (agent), 2 activity, 3 template
  senderName: string | null;
  createdAt: number;
}

export interface CwConversation {
  displayId: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
}

export class ChatwootClosedError extends Error {
  constructor() {
    super('Chatwoot conversation is resolved');
  }
}

export type ChatwootClient = ReturnType<typeof createChatwootClient>;

export function createChatwootClient(cfg: { baseUrl: string; websiteToken: string }, fetchImpl: typeof fetch = fetch) {
  const url = (path: string, query = '') =>
    `${cfg.baseUrl}/api/v1/widget/${path}?website_token=${encodeURIComponent(cfg.websiteToken)}${query}`;

  async function call<T>(method: string, path: string, authToken: string | null, body?: unknown, query?: string): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (authToken) headers['X-Auth-Token'] = authToken;
    const res = await fetchImpl(url(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 403 && path === 'messages' && method === 'POST') throw new ChatwootClosedError();
    const text = await res.text();
    if (!res.ok) throw new Error(`Chatwoot ${method} ${path} → HTTP ${res.status} ${text.slice(0, 200)}`);
    return (text ? JSON.parse(text) : {}) as T;
  }

  const timestamp = () => new Date().toString();

  return {
    async createContact(): Promise<{ authToken: string; sourceId: string }> {
      const data = await call<{ website_channel_config: { auth_token: string } }>('POST', 'config', null);
      const authToken = data.website_channel_config.auth_token;
      const payload = JSON.parse(Buffer.from(authToken.split('.')[1] ?? '', 'base64url').toString('utf8')) as { source_id: string };
      return { authToken, sourceId: payload.source_id };
    },

    async createConversation(
      authToken: string,
      input: { name?: string; email?: string; content: string; customAttributes: Record<string, string> },
    ): Promise<CwConversation> {
      const data = await call<{ id: number; status: CwConversation['status'] }>('POST', 'conversations', authToken, {
        contact: { name: input.name, email: input.email },
        message: { content: input.content, timestamp: timestamp() },
        custom_attributes: input.customAttributes,
      });
      return { displayId: data.id, status: data.status };
    },

    async sendMessage(authToken: string, content: string): Promise<{ id: number }> {
      const data = await call<{ id: number }>('POST', 'messages', authToken, { message: { content, timestamp: timestamp() } });
      return { id: data.id };
    },

    async listMessages(authToken: string, after?: number): Promise<CwMessage[]> {
      const data = await call<{
        payload?: { id: number; content: string | null; message_type: CwMessage['messageType']; created_at: number; sender?: { name?: string } }[];
      }>('GET', 'messages', authToken, undefined, after === undefined ? '' : `&after=${after}`);
      return (data.payload ?? []).map((m) => ({
        id: m.id,
        content: m.content ?? '',
        messageType: m.message_type,
        senderName: m.sender?.name ?? null,
        createdAt: m.created_at,
      }));
    },

    async getConversation(authToken: string): Promise<CwConversation | null> {
      const data = await call<{ id?: number; status?: CwConversation['status'] }>('GET', 'conversations', authToken);
      return data.id === undefined || data.status === undefined ? null : { displayId: data.id, status: data.status };
    },
  };
}
