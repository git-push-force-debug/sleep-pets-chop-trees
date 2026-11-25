import { vi } from 'vitest';
import { ChatwootClosedError, type CwConversation, type CwMessage } from '../lib/chatwoot.ts';

/** A tiny in-memory Chatwoot: one contact token → its latest conversation. */
export function createFakeChatwoot() {
  let nextId = 1000;
  let display = 41;
  const conversations = new Map<string, { displayId: number; status: CwConversation['status']; messages: CwMessage[] }>();
  const msg = (content: string, messageType: CwMessage['messageType'], senderName: string | null = null): CwMessage => ({
    id: ++nextId, content, messageType, senderName, createdAt: 1795570000 + nextId,
  });

  const client = {
    createContact: vi.fn(async () => ({ authToken: `tok-${++nextId}`, sourceId: 'src' })),
    createConversation: vi.fn(async (token: string, input: { content: string }) => {
      await new Promise((r) => setTimeout(r, 5)); // lets a concurrent caller interleave
      const conv = {
        displayId: ++display,
        status: 'open' as const,
        messages: [msg(input.content, 0), msg('Give the team a way to reach you.', 3), msg('Get notified by email', 3)],
      };
      conversations.set(token, conv);
      return { displayId: conv.displayId, status: conv.status };
    }),
    sendMessage: vi.fn(async (token: string, content: string) => {
      const conv = conversations.get(token)!;
      if (conv.status === 'resolved') throw new ChatwootClosedError();
      const m = msg(content, 0);
      conv.messages.push(m);
      return { id: m.id };
    }),
    listMessages: vi.fn(async (token: string, after = 0) => conversations.get(token)?.messages.filter((m) => m.id > after) ?? []),
    getConversation: vi.fn(async (token: string) => {
      const conv = conversations.get(token);
      return conv ? { displayId: conv.displayId, status: conv.status } : null;
    }),
  };

  return {
    client,
    conversations,
    agentReply(token: string, content: string, agent = 'Maya') {
      conversations.get(token)!.messages.push(msg(content, 1, agent));
    },
    activity(token: string, content: string) {
      conversations.get(token)!.messages.push(msg(content, 2));
    },
    resolve(token: string) {
      conversations.get(token)!.status = 'resolved';
    },
  };
}
