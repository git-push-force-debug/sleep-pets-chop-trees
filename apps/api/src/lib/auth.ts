import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Deps } from '../app.ts';
import type { AgentRow } from './store.ts';

export type VerifyToken = (token: string) => Promise<{ userId: string } | null>;

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    agent: AgentRow | null;
  }
}

export const supabaseVerifier =
  (db: SupabaseClient): VerifyToken =>
  async (token) => {
    const { data, error } = await db.auth.getClaims(token);
    const sub = data?.claims?.sub;
    return error || typeof sub !== 'string' ? null : { userId: sub };
  };

const bearer = (req: FastifyRequest) => {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

export const requireUser = (deps: Deps) => async (req: FastifyRequest, reply: FastifyReply) => {
  const token = bearer(req);
  const user = token ? await deps.verifyToken(token) : null;
  if (!user) return reply.code(401).send({ error: 'Sign-in required' });
  req.userId = user.userId;
};

export const requireAgent = (deps: Deps, role?: 'admin') => async (req: FastifyRequest, reply: FastifyReply) => {
  await requireUser(deps)(req, reply);
  if (reply.sent) return;
  const agent = await deps.store.getAgent(req.userId);
  if (!agent || (role === 'admin' && agent.role !== 'admin')) return reply.code(403).send({ error: 'Support team only' });
  req.agent = agent;
};
