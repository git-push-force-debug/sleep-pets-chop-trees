import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { GuideImage } from '../../../packages/shared/src/guide.ts';
import type { VerifyToken } from './lib/auth.ts';
import type { ChatwootClient } from './lib/chatwoot.ts';
import type { DifyClient } from './lib/dify.ts';
import type { Env } from './lib/env.ts';
import type { GeminiClient } from './lib/gemini.ts';
import type { Store } from './lib/store.ts';
import { registerChatRoutes } from './routes/chat.ts';

export interface Deps {
  store: Store;
  verifyToken: VerifyToken;
  dify: DifyClient;
  gemini: GeminiClient;
  chatwoot: ChatwootClient;
  env: Env;
  guideImages: Record<string, GuideImage>;
}

const LOCALHOST = /^http:\/\/localhost:\d+$/;

export function buildApp(deps: Deps) {
  const production = process.env.NODE_ENV === 'production';
  const app = Fastify({ bodyLimit: 8192, trustProxy: true, logger: production ? { level: 'warn' } : false });
  const allowed = new Set([deps.env.SITE_URL, deps.env.ADMIN_URL]);

  app.decorateRequest('userId', '');
  app.decorateRequest('agent', null);
  app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin) || (!production && LOCALHOST.test(origin))),
  });

  // Never leak internal error details to the browser.
  app.setErrorHandler((error, req, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) req.log.error(error);
    reply.code(status).send({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message });
  });

  app.get('/health', async () => ({ ok: true }));
  registerChatRoutes(app, deps);
  return app;
}
