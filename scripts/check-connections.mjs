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

await check('Chatwoot', ['CHATWOOT_BASE_URL', 'CHATWOOT_API_TOKEN', 'CHATWOOT_ACCOUNT_ID'], async () => {
  const h = { api_access_token: env.CHATWOOT_API_TOKEN };
  const profile = await get(`${env.CHATWOOT_BASE_URL}/api/v1/profile`, h);
  const account = profile.accounts?.find((a) => String(a.id) === String(env.CHATWOOT_ACCOUNT_ID));
  if (!account) throw new Error('token works but CHATWOOT_ACCOUNT_ID is not one of its accounts');
  const inboxes = await get(`${env.CHATWOOT_BASE_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}/inboxes`, h);
  return `role ${account.role} · ${inboxes.payload?.length ?? 0} inboxes`;
});

await check('Admin emails', ['ADMIN_EMAILS'], async () => `${env.ADMIN_EMAILS.split(',').filter(Boolean).length} admin(s) listed`);

const width = Math.max(...results.map((r) => r[0].length));
for (const [name, mark, info] of results) console.log(`${mark} ${name.padEnd(width)}  ${info}`);
process.exitCode = results.every((r) => r[1] === '✓') ? 0 : 1;
