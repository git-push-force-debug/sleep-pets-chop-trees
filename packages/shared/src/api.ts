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
  /** 中文 versions; empty or missing means the built-in ZH_DEFAULTS. */
  greetingZh?: string;
  starterQuestionsZh?: string[];
  offlineMessageZh?: string;
}

export const ZH_DEFAULTS = {
  greeting: '你好，我是 Pip！关于 Sleep Pets & Chop Trees 的问题都可以问我。',
  starterQuestions: ['怎么转生？', '怎么抓到第一只宠物？', '怎么快速获得木材？'],
  offlineMessage: '团队会尽快回复，通常在一天之内。请保持此页面打开，或稍后在这台设备上回来查看。',
};

/** Players see full-looking ticket numbers: Chatwoot #3 → #10003. */
export const ticketLabel = (chatwootId: number | null | undefined) => (chatwootId == null ? '' : `#${10000 + chatwootId}`);
