import type { Deps } from '../app.ts';
import type { MessageRow, SessionRow } from './store.ts';

const TRANSCRIPT_MESSAGES = 30;
const TRANSCRIPT_MAX_CHARS = 6000;
const SPEAKER: Record<MessageRow['role'], string> = { user: 'Player', bot: 'Bot', agent: 'Team', system: 'Note' };

export function formatTranscript(messages: MessageRow[], extra: { summary: string; pageUrl: string | null; username?: string }) {
  let lines = messages.slice(-TRANSCRIPT_MESSAGES).map((m) => `${SPEAKER[m.role]}: ${m.content.replace(/\s+/g, ' ').trim()}`);
  while (lines.length > 1 && lines.join('\n').length > TRANSCRIPT_MAX_CHARS) lines = lines.slice(1);
  return [
    '— Chat with Pip (website bot) so far —',
    ...lines,
    '',
    `Summary: ${extra.summary}`,
    extra.username ? `Roblox username: ${extra.username}` : null,
    extra.pageUrl ? `Page: ${extra.pageUrl}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export async function contactToken(deps: Deps, userId: string): Promise<string> {
  const existing = await deps.store.getChatwootContact(userId);
  if (existing) return existing.auth_token;
  const { authToken, sourceId } = await deps.chatwoot.createContact();
  await deps.store.saveChatwootContact(userId, authToken, sourceId);
  return authToken;
}

/**
 * Opens the Chatwoot conversation for a chat session. Idempotent: the status change
 * bot → waiting_human acts as a lock, so concurrent calls create one conversation.
 */
export async function startHandoff(
  deps: Deps,
  sessionId: string,
  form: { robloxUsername?: string; email?: string; summary: string },
): Promise<SessionRow> {
  const locked = await deps.store.updateSession(
    sessionId,
    {
      status: 'waiting_human',
      bot_paused: true,
      handoff_at: new Date().toISOString(),
      roblox_username: form.robloxUsername || null,
      email: form.email || null,
    },
    'bot',
  );
  if (!locked) return (await deps.store.getSession(sessionId))!;

  try {
    const token = await contactToken(deps, locked.user_id);
    const content = formatTranscript(await deps.store.listMessages(sessionId), {
      summary: form.summary,
      pageUrl: locked.page_url,
      username: form.robloxUsername,
    });
    const conversation = await deps.chatwoot.createConversation(token, {
      name: form.robloxUsername || undefined,
      email: form.email || undefined,
      content,
      customAttributes: { session_id: sessionId, page_url: locked.page_url ?? '' },
    });
    const updated = await deps.store.updateSession(sessionId, { chatwoot_display_id: conversation.displayId });
    await deps.store.insertMessages([
      { session_id: sessionId, role: 'system', content: `Handed to a person · Ticket #${conversation.displayId}` },
    ]);
    return updated!;
  } catch (error) {
    await deps.store.updateSession(sessionId, { status: 'bot', bot_paused: false, handoff_at: null });
    throw error;
  }
}
