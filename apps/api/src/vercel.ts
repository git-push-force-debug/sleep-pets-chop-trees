// Vercel serverless entry: one Fastify app handles every path (vercel.json rewrites /(.*) → /api).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './app.ts';
import { createDeps } from './deps.ts';

const app = buildApp(createDeps());

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await app.ready();
  app.server.emit('request', req, res);
}
