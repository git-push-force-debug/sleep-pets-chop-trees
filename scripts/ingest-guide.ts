// Turns the guide HTML into site content, images and Dify documents. Run: npm run ingest
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseGuide, publicGuide, toDifyDocument } from './lib/guide-parse.ts';

const GUIDE_HTML =
  process.env.GUIDE_HTML ??
  `${homedir()}/Documents/Codex/2026-11-25/look-at-hte/outputs/sleep-pets-and-chop-trees-guide.html`;

const { guide, imageBytes } = parseGuide(readFileSync(GUIDE_HTML, 'utf8'));
const pub = publicGuide(guide);

const writeImages = (dir: string, ids: Iterable<string>) => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const id of ids) writeFileSync(join(dir, guide.images[id]!.file), imageBytes.get(id)!);
};

mkdirSync('content/dify', { recursive: true });
writeFileSync('content/guide.json', JSON.stringify(guide, null, 2));
writeFileSync('content/guide.public.json', JSON.stringify(pub, null, 2));
for (const chapter of guide.chapters) writeFileSync(`content/dify/${chapter.slug}.md`, toDifyDocument(chapter));

// The public site only ships public images; the admin panel also serves the creator chapter's.
writeImages('apps/web/public/guide/img', Object.keys(pub.images));
writeImages('apps/admin/public/guide/img', Object.keys(guide.images));

const sections = guide.chapters.reduce((n, c) => n + c.sections.length, 0);
console.log(
  `${guide.chapters.length} chapters · ${sections} sections · ${Object.keys(guide.images).length} images ` +
    `(${Object.keys(pub.images).length} public)`,
);
