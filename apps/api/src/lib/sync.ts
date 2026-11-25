import type { SessionStatus } from '../../../../packages/shared/src/api.ts';
import type { Deps } from '../app.ts';
import type { CwMessage } from './chatwoot.ts';
import type { SessionRow } from './store.ts';

const PAGE = 100; // Chatwoot returns at most 100 messages after an id

/**
 * Pulls agent replies and the ticket status from Chatwoot (free plan: no webhooks, so callers poll).
 * Data always comes from Chatwoot's widget API with this session's own token, never from a request body.
 */
export async function syncSession(deps: Deps, sessionId: string): Promise<{ added: number; status: SessionStatus }> {
  const session = await deps.store.getSession(sessionId);
  if (!session) throw new Error(`session ${sessionId} not found`);
  if (!session.chatwoot_display_id) return { added: 0, status: session.status };
  const contact = await deps.store.getChatwootContact(session.user_id);
  if (!contact) return { added: 0, status: session.status };

  // The widget API only sees the contact's latest conversation; an older session's ticket is no longer reachable.
  const conversation = await deps.chatwoot.getConversation(contact.auth_token);
  if (!conversation || conversation.displayId !== session.chatwoot_display_id) return { added: 0, status: session.status };

  const fresh: CwMessage[] = [];
  let after = session.last_chatwoot_message_id;
  for (;;) {
    const page = await deps.chatwoot.listMessages(contact.auth_token, after);
    fresh.push(...page);
    if (page.length < PAGE) break;
    after = Math.max(...page.map((m) => m.id));
  }

  const agentMessages = fresh.filter((m) => m.messageType === 1 && m.content.trim());
  const added = await deps.store.insertMessages(
    agentMessages.map((m) => ({
      session_id: session.id,
      role: 'agent' as const,
      content: m.content,
      agent_name: m.senderName ?? 'Support team',
      chatwoot_message_id: m.id,
    })),
  );

  let status: SessionStatus = session.status;
  // A chat resolved here (player said "solved" or the admin panel) leaves the Chatwoot conversation open,
  // so only a new team reply reopens it.
  if (conversation.status === 'resolved') status = 'resolved';
  else if (agentMessages.length) status = 'human';

  const patch: Partial<SessionRow> = {};
  const lastId = Math.max(session.last_chatwoot_message_id, ...fresh.map((m) => m.id));
  if (lastId !== session.last_chatwoot_message_id) patch.last_chatwoot_message_id = lastId;
  if (status !== session.status) {
    patch.status = status;
    patch.resolved_at = status === 'resolved' ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length) await deps.store.updateSession(session.id, patch);
  return { added: added.length, status };
}
