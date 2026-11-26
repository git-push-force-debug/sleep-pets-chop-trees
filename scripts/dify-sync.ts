// Loads the guide into Dify. Run: npm run dify:sync  (after npm run ingest)
// Public dataset: chapters 01–06, the site FAQ and the admin FAQ. Internal dataset: chapter 07 only.
import { readFileSync, writeFileSync } from 'node:fs';
import { createDifyClient } from '../apps/api/src/lib/dify.ts';
import { FAQ_DOC_NAME, faqDocument } from '../apps/api/src/lib/faq.ts';

const PUBLIC_DOCS = ['player-guide', 'biomes', 'economy', 'rewards', 'faq', 'gallery', 'site-faq'];
const INTERNAL_DOCS = ['creator'];
const ADMIN_FAQ = FAQ_DOC_NAME;
const ADMIN_FAQ_SEED = faqDocument([]);
const EMBEDDING = { model: 'gemini-embedding-001', provider: 'langgenius/gemini/google' };
const SPACING_MS = 7000; // Dify Sandbox allows 10 knowledge requests per minute

const env = process.env;
if (!env.DIFY_API_BASE || !env.DIFY_DATASET_API_KEY) throw new Error('DIFY_API_BASE and DIFY_DATASET_API_KEY are required');
const dify = createDifyClient({ apiBase: env.DIFY_API_BASE, apiKey: env.DIFY_DATASET_API_KEY });

const pause = () => new Promise((r) => setTimeout(r, SPACING_MS));
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  console.log(`✓ ${label}`);
  await pause();
  return result;
}

function setEnv(key: string, value: string) {
  const file = '.env.local';
  const line = `${key}=${value}`;
  const text = readFileSync(file, 'utf8');
  writeFileSync(
    file,
    new RegExp(`^${key}=.*$`, 'm').test(text)
      ? text.replace(new RegExp(`^${key}=.*$`, 'm'), line)
      : text.replace(/(^DIFY_INTERNAL_DATASET_ID=.*$)/m, `$1\n${line}`),
  );
}

const datasets = await step('list datasets', () => dify.listDatasets());
const ensureDataset = async (name: string) =>
  datasets.find((d) => d.name === name)?.id ?? (await step(`create dataset ${name}`, () => dify.createDataset(name, EMBEDDING)));

const publicId = await ensureDataset('spct-public');
const internalId = await ensureDataset('spct-internal');

async function replaceDocs(datasetId: string, names: string[]) {
  const existing = await step('list documents', () => dify.listDocuments(datasetId));
  for (const name of names) {
    for (const doc of existing.filter((d) => d.name === name)) {
      await step(`delete old ${name}`, () => dify.deleteDocument(datasetId, doc.id));
    }
    const text = readFileSync(`content/dify/${name}.md`, 'utf8');
    await step(`upload ${name}`, () => dify.createDocumentByText(datasetId, name, text));
  }
  return existing;
}

const publicExisting = await replaceDocs(publicId, PUBLIC_DOCS);
await replaceDocs(internalId, INTERNAL_DOCS);

// The admin FAQ holds answers the team adds from the admin panel, so it is created once and never replaced.
const adminFaqId =
  publicExisting.find((d) => d.name === ADMIN_FAQ)?.id ??
  (await step(`create ${ADMIN_FAQ}`, () => dify.createDocumentByText(publicId, ADMIN_FAQ, ADMIN_FAQ_SEED)));

setEnv('DIFY_PUBLIC_DATASET_ID', publicId);
setEnv('DIFY_INTERNAL_DATASET_ID', internalId);
setEnv('DIFY_ADMIN_FAQ_DOCUMENT_ID', adminFaqId);
console.log('Saved DIFY_PUBLIC_DATASET_ID, DIFY_INTERNAL_DATASET_ID, DIFY_ADMIN_FAQ_DOCUMENT_ID to .env.local');
