// Live check of the Chatwoot widget API: creates one "[test] setup check" conversation, reads it back, then closes it.
// Run: npx tsx --env-file=.env.local scripts/chatwoot-smoke.ts
import { createChatwootClient } from '../apps/api/src/lib/chatwoot.ts';

const env = process.env;
if (!env.CHATWOOT_BASE_URL || !env.CHATWOOT_WEBSITE_TOKEN) throw new Error('CHATWOOT_BASE_URL and CHATWOOT_WEBSITE_TOKEN are required');
const cw = createChatwootClient({ baseUrl: env.CHATWOOT_BASE_URL, websiteToken: env.CHATWOOT_WEBSITE_TOKEN });

const { authToken } = await cw.createContact();
const conv = await cw.createConversation(authToken, {
  name: '[test] setup check',
  content: '[test] setup check from the website server — safe to delete.',
  customAttributes: { source: 'chatwoot-smoke' },
});
console.log(`created conversation #${conv.displayId} (status ${conv.status})`);
const messages = await cw.listMessages(authToken, 0);
console.log(`read back ${messages.length} message(s):`, messages.map((m) => `#${m.id} type=${m.messageType} sender=${m.senderName ?? "none"} "${m.content.slice(0, 50)}"`));
console.log(`status now: ${(await cw.getConversation(authToken))?.status}`);

// Close it from the visitor side if the inbox allows "end conversation"; otherwise resolve it in Chatwoot.
const res = await fetch(
  `${env.CHATWOOT_BASE_URL}/api/v1/widget/conversations/toggle_status?website_token=${encodeURIComponent(env.CHATWOOT_WEBSITE_TOKEN)}`,
  { headers: { 'X-Auth-Token': authToken } },
);
console.log(res.ok ? 'closed the test conversation' : `could not close it (HTTP ${res.status}) — resolve #${conv.displayId} in Chatwoot`);
console.log(`after close: ${(await cw.getConversation(authToken))?.status}`);
