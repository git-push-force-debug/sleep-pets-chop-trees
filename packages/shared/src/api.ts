import type { BotReply } from './blocks.ts';

export type SessionStatus = 'bot' | 'waiting_human' | 'human' | 'resolved';

export interface ChatSession {
  id: string;
  status: SessionStatus;
  botPaused: boolean;
  ticket: number | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  reply: BotReply | null;
  agentName: string | null;
  createdAt: string;
  feedback: 1 | -1 | null;
}

export interface PublicSettings {
  greeting: string;
  starterQuestions: string[];
  offlineMessage: string;
  botEnabled: boolean;
}

/** Players see full-looking ticket numbers: Chatwoot #3 → #10003. */
export const ticketLabel = (chatwootId: number | null | undefined) => (chatwootId == null ? '' : `#${10000 + chatwootId}`);
