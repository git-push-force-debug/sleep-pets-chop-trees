// Pings every external service with the keys in .env.local. Prints ✓/✗ only, never key values.
// Run: npm run check:connections
const env = process.env;
const results = [];

async function check(name, needed, fn) {
  const missing = needed.filter((k) => !env[k]);
  if (missing.length) return results.push([name, '…', `not filled yet: ${missing.join(', ')}`]);
  try {
    results.push([name, '✓', await fn()]);
  } catch (e) {
    results.push([name, '✗', String(e.message || e).slice(0, 160)]);
  }
}

async function get(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${body.message || body.error?.message || body.error || ''}`.trim());
  return body;
}

await check('Supabase (secret key)', ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'], async () => {
  await get(`${env.SUPABASE_URL}/rest/v1/`, { apikey: env.SUPABASE_SECRET_KEY });
  return 'database API reachable';
});

await check('Supabase (anonymous sign-ins)', ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'], async () => {
  const s = await get(`${env.SUPABASE_URL}/auth/v1/settings`, { apikey: env.SUPABASE_PUBLISHABLE_KEY });
  const on = s.external?.anonymous_users ?? s.anonymous_users;
  if (on === false) throw new Error('turned off — Authentication → Sign In / Providers → Allow anonymous sign-ins');
  return on ? 'enabled' : 'setting not reported (will test on first chat)';
});

await check('Gemini', ['GEMINI_API_KEY'], async () => {
  const { models = [] } = await get('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
    'x-goog-api-key': env.GEMINI_API_KEY,
  });
  const flash = models
    .filter((m) => /flash/.test(m.name) && m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace('models/', ''));
  return `key works · ${models.length} models · flash: ${flash.slice(0, 6).join(', ')}`;
});

await check('Dify knowledge', ['DIFY_API_BASE', 'DIFY_DATASET_API_KEY'], async () => {
  const d = await get(`${env.DIFY_API_BASE}/datasets?page=1&limit=20`, { Authorization: `Bearer ${env.DIFY_DATASET_API_KEY}` });
  return `key works · ${d.total ?? d.data?.length ?? 0} knowledge bases`;
});

// Free plan has no API token, so the server uses the Website-inbox widget API.
// inbox_members skips contact creation, so this check leaves no stray visitor in Chatwoot.
await check('Chatwoot website inbox', ['CHATWOOT_BASE_URL', 'CHATWOOT_WEBSITE_TOKEN'], async () => {
  const url = `${env.CHATWOOT_BASE_URL}/api/v1/widget/inbox_members?website_token=${encodeURIComponent(env.CHATWOOT_WEBSITE_TOKEN)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (res.status === 404) throw new Error('website token not found — copy websiteToken from the inbox Configuration tab');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { payload = [] } = await res.json();
  if (!payload.length) throw new Error('token works, but no agent is added to this inbox (Inbox → Collaborators)');
  return `token works · ${payload.length} agent(s) on the inbox`;
});

await check('Admin emails', ['ADMIN_EMAILS'], async () => `${env.ADMIN_EMAILS.split(',').filter(Boolean).length} admin(s) listed`);

const width = Math.max(...results.map((r) => r[0].length));
for (const [name, mark, info] of results) console.log(`${mark} ${name.padEnd(width)}  ${info}`);
process.exitCode = results.every((r) => r[1] === '✓') ? 0 : 1;
