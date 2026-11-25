// Live end-to-end check against production, as a real anonymous visitor.
// Run: npx tsx --env-file=.env.local scripts/e2e-live.ts [--handoff]
const API = 'https://sleep-pets-chop-trees-api.vercel.app';
const SITE = 'https://sleep-pets-chop-trees.vercel.app';
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;

const ok = (cond: unknown, label: string) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) process.exitCode = 1;
};

for (const path of ['/', '/guide/player-guide', '/support', '/art/hero.webp', '/guide/img/ranch-v7-night.jpg']) {
  ok((await fetch(`${SITE}${path}`)).status === 200, `site ${path} → 200`);
}
ok((await fetch('https://sleep-pets-chop-trees-admin.vercel.app/')).status === 200, 'admin → 200');

const signup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST', headers: { apikey: SUPABASE_PUBLISHABLE_KEY!, 'content-type': 'application/json' }, body: '{}',
});
const token = ((await signup.json()) as { access_token?: string }).access_token;
ok(token, 'anonymous visitor signed in');
const call = async (path: string, body?: unknown) => {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${token}`, origin: SITE, ...(body !== undefined && { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), json: (await res.json().catch(() => null)) as any };
};

const created = await call('/chat/sessions', { pageUrl: '/e2e-check' });
ok(created.status === 200 && created.cors === SITE, `session created, CORS allows the site (${created.status})`);
const sessionId = created.json?.session?.id;

const t = Date.now();
const asked = await call(`/chat/sessions/${sessionId}/messages`, { text: 'how do I rebirth?' });
const bot = asked.json?.messages?.find((m: any) => m.role === 'bot');
ok(asked.status === 200, `question answered in ${Date.now() - t} ms`);
ok(bot?.reply?.blocks?.some((b: any) => b.type === 'table'), `reply has a table (blocks: ${bot?.reply?.blocks?.map((b: any) => b.type).join(', ')})`);
ok(bot?.reply?.sources?.some((s: any) => s.url === `${SITE}/guide/player-guide#rebirth`), 'source links to /guide/player-guide#rebirth');

const off = await call(`/chat/sessions/${sessionId}/messages`, { text: 'what is the capital of France?' });
ok(off.json?.messages?.find((m: any) => m.role === 'bot')?.reply?.blocks?.at(-1)?.type === 'handoff', 'off-guide question offers a person');

if (process.argv.includes('--handoff')) {
  const handed = await call(`/chat/sessions/${sessionId}/handoff`, { robloxUsername: 'e2e-check', summary: '[test] live end-to-end check — reply, then resolve' });
  ok(handed.status === 200 && handed.json?.session?.ticket, `handed to a person · Ticket #${handed.json?.session?.ticket}`);
  console.log(`session ${sessionId}`);
}
