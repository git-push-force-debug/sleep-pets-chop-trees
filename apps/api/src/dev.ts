// Local API: npx tsx watch --env-file=.env.local apps/api/src/dev.ts
import { buildApp } from './app.ts';
import { createDeps } from './deps.ts';

const port = Number(process.env.PORT ?? 8787);
await buildApp(createDeps()).listen({ port, host: '127.0.0.1' });
console.log(`API on http://localhost:${port}`);
