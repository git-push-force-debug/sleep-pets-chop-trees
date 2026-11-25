// Seeds 40 synthetic chats (no real player data) so the admin dashboard, leads and exports have something to show.
// Every row belongs to one demo auth user, so --clear removes all of it by deleting that user (rows cascade).
// Run: npx tsx --env-file=.env.local scripts/seed-demo.ts            (clear, then seed)
//      npx tsx --env-file=.env.local scripts/seed-demo.ts --clear    (remove demo data only)
//      npx tsx scripts/seed-demo.ts --dry-run                        (build the rows and print counts; no database)
import { readFileSync } from 'node:fs';
import { BotReplySchema, type BotReply } from '../packages/shared/src/blocks.ts';
import { ticketLabel } from '../packages/shared/src/api.ts';
import { createServiceClient } from '../apps/api/src/lib/store.ts';

const DEMO_EMAIL = 'demo-seed@spct.invalid';
const SESSIONS = 40;
const HANDED = { resolved: 8, human: 3, waiting_human: 3 } as const;
const args = new Set(process.argv.slice(2));
const SITE = process.env.SITE_URL ?? 'https://sleep-pets-chop-trees.vercel.app';

// Deterministic randomness: the same demo every run.
let seed = 27;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;

const guide = JSON.parse(readFileSync('content/guide.public.json', 'utf8')) as { chapters: { slug: string; sections: { id: string; title: string }[] }[] };
const section = (chapter: string, id: string) => {
  const s = guide.chapters.find((c) => c.slug === chapter)?.sections.find((x) => x.id === id);
  if (!s) throw new Error(`guide section ${chapter}#${id} not found`);
  return { title: s.title, url: `${SITE}/guide/${chapter}#${id}` };
};

// Questions players really ask, each with a short answer grounded in a real guide section.
const QA: [question: string, answer: string, chapter: string, sectionId: string][] = [
  ['How do I put a pet to sleep?', 'Aim your dart gun at a wild animal and keep hitting it until its sleep bar fills to 100%.', 'player-guide', 'capture'],
  ['How do I carry a pet home?', 'Pick the sleeping pet up and walk it across the brick edge of your ranch before it wakes.', 'player-guide', 'carry'],
  ['What should I do first?', 'Start with the tutorial: catch a grassland animal, carry it home and place it in your pen.', 'player-guide', 'tutorial'],
  ['How do pets earn Cash?', 'Placed pets earn Cash over time. Feed them and buy stats to raise what they earn.', 'player-guide', 'ranch'],
  ['Which dart gun is best?', 'Each biome has an entry gun; stronger guns need fewer hits. The economy chapter lists all 15.', 'economy', 'guns'],
  ['How do I upgrade my gun?', 'Spend Cash on gun upgrades to raise damage and speed up to the max stats shown in the guide.', 'economy', 'gun-upgrades'],
  ['How do I get Wood?', 'Swing a melee tool at trees for Wood. Golden trees pay five times as much.', 'economy', 'melee'],
  ['What animals live in Snowland?', 'Snowland has its own wildlife table with the hits and sleep HP for each animal.', 'biomes', 'snowland'],
  ['When do rare animals spawn?', 'Rarity and weather change spawns; storms and parties bring rarer animals.', 'biomes', 'weather'],
  ['Where are the free rewards?', 'Free rewards come from daily missions, the index, invites and codes.', 'rewards', 'rewards'],
  ['What are the crate odds?', 'Every crate and its exact odds are listed in the Rewards chapter.', 'rewards', 'crates'],
  ['How do I rebirth?', 'Spend Cash, Wood and the right pet to rebirth and open the next biome.', 'faq', 'troubleshooting'],
  ['Why did my pet wake up?', 'Pets wake if you take too long; carry them home quickly and avoid getting hit.', 'faq', 'faq'],
];
const UNANSWERED = ['Can I trade pets with friends?', 'When is the next update?', 'Is there a PvP mode?', 'Can I play on Xbox?'];
const NEEDS_PERSON = [
  'I bought a game pass but did not get it',
  'My pets disappeared after a crash',
  'I was charged Robux twice',
  'My account got banned by mistake',
  'Golden tree reward did not arrive',
];
const USERNAMES = ['sleepyrancher22', 'foxfan_09', 'mochi_tamer', 'TreeChopperX', 'glimmerdeer77', 'NightRanchKid', 'pandaPal', 'sandyFennec', 'rexRider', 'cozyCat_31', 'arcticHunter', 'blueberryRanch', 'logLegend', 'dartQueen'];
const PAGES = ['/', '/', '/guide/player-guide', '/guide/biomes', '/guide/economy', '/support'];
const AGENTS = ['Lance', 'Maya'];

const reply = (markdown: string, sources: { title: string; url: string }[], suggestions: string[] = []): BotReply =>
  BotReplySchema.parse({ blocks: [{ type: 'text', markdown }], suggestions, sources, images: [] });
const handoffReply = (markdown: string): BotReply =>
  BotReplySchema.parse({ blocks: [{ type: 'text', markdown }, { type: 'handoff', reason: 'A person from the team can check this for you.' }], suggestions: [], sources: [], images: [] });

type Row = Record<string, unknown>;
const at = (base: number, plusMin: number) => new Date(base + plusMin * 60_000).toISOString();

export function buildDemo(userId: string) {
  const sessions: Row[] = [];
  const messages: Row[] = [];
  const gaps: Row[] = [];
  const statuses = [
    ...Array(SESSIONS - HANDED.resolved - HANDED.human - HANDED.waiting_human).fill('bot'),
    ...Array(HANDED.resolved).fill('resolved'),
    ...Array(HANDED.human).fill('human'),
    ...Array(HANDED.waiting_human).fill('waiting_human'),
  ] as ('bot' | 'resolved' | 'human' | 'waiting_human')[];

  statuses.forEach((status, i) => {
    const id = crypto.randomUUID();
    // Spread over the last 30 days; waiting chats are recent.
    const daysAgo = status === 'waiting_human' ? rand() * 0.5 : rand() * 29.5;
    const start = Date.now() - daysAgo * 86_400_000;
    let t = 0;
    const msg = (role: string, content: string, extra: Row = {}) => messages.push({ session_id: id, role, content, created_at: at(start, (t += 1 + rand() * 2)), ...extra });

    // 1–3 guide questions answered by Pip, with sources and some thumbs.
    for (let q = 0, n = 1 + Math.floor(rand() * 3); q < n; q++) {
      const [question, answer, chapter, sectionId] = pick(QA);
      msg('user', question);
      const r = reply(answer, [section(chapter, sectionId)], [pick(QA)[0]]);
      const vote = rand();
      msg('bot', answer, { reply: r, feedback: vote < 0.45 ? 1 : vote < 0.55 ? -1 : null });
    }
    if (status === 'bot' && rand() < 0.25) {
      const question = pick(UNANSWERED);
      msg('user', question);
      msg('bot', "The guide doesn't cover that yet.", { reply: handoffReply("The guide doesn't cover that yet.") });
      gaps.push({ session_id: id, question, top_score: Math.round(rand() * 25) / 100, created_at: at(start, t) });
    }

    const row: Row = { id, user_id: userId, status, page_url: pick(PAGES), user_agent: 'seed-demo', created_at: at(start, 0) };
    if (status !== 'bot') {
      const ticket = 900 + i;
      const problem = pick(NEEDS_PERSON);
      msg('user', problem);
      msg('bot', 'A person from the team can help with that.', { reply: handoffReply('A person from the team can help with that.') });
      const handoff = at(start, (t += 2));
      msg('system', `Connected to the team · Ticket ${ticketLabel(ticket)}`);
      const username = USERNAMES[i % USERNAMES.length]!;
      Object.assign(row, {
        bot_paused: status !== 'resolved',
        handoff_at: handoff,
        chatwoot_display_id: ticket,
        roblox_username: username,
        email: rand() < 0.7 ? `${username.toLowerCase()}@example.com` : null,
      });
      if (status !== 'waiting_human') {
        const agent = pick(AGENTS);
        t += 4 + rand() * 40; // first reply 4–44 min after hand-off
        msg('agent', `Hi ${username}, thanks for the details — I'm checking your account now.`, { agent_name: agent });
        if (status === 'resolved') {
          msg('user', 'Thank you!');
          t += 10 + rand() * 300;
          msg('agent', 'All sorted — it should show in your game now. Enjoy!', { agent_name: agent });
          msg('system', 'Player confirmed it’s solved');
          row.resolved_at = at(start, t);
        }
      }
    }
    row.updated_at = at(start, t);
    sessions.push(row);
  });
  return { sessions, messages, gaps };
}

async function main() {
  if (args.has('--dry-run')) {
    const { sessions, messages, gaps } = buildDemo('00000000-0000-0000-0000-000000000000');
    const count = (s: string) => sessions.filter((r) => r.status === s).length;
    console.log(`dry run: ${sessions.length} chats (${count('bot')} Pip only, ${count('resolved')} resolved, ${count('human')} with the team, ${count('waiting_human')} waiting), ${messages.length} messages, ${gaps.length} unanswered questions`);
    return;
  }
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required (use --env-file=.env.local)');
  const db = createServiceClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(listError.message);
  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    const { error } = await db.auth.admin.deleteUser(existing.id); // cascades to the demo chats, messages and gaps
    if (error) throw new Error(error.message);
    console.log('✓ removed previous demo data');
  }
  if (args.has('--clear')) return;

  const { data: created, error: createError } = await db.auth.admin.createUser({ email: DEMO_EMAIL, email_confirm: true });
  if (createError || !created.user) throw new Error(createError?.message ?? 'could not create the demo user');
  const { sessions, messages, gaps } = buildDemo(created.user.id);
  for (const [table, rows] of [['chat_sessions', sessions], ['messages', messages], ['bot_gaps', gaps]] as const) {
    const { error } = await db.from(table).insert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`✓ seeded ${sessions.length} chats, ${messages.length} messages, ${gaps.length} unanswered questions (demo user ${DEMO_EMAIL})`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
