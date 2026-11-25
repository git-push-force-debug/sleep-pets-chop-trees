import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import TurndownService from 'turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';
import {
  CHAPTER_SLUGS,
  formatSegmentHeader,
  type Chapter,
  type Guide,
  type GuideImage,
  type Section,
} from '../../packages/shared/src/guide.ts';

const SEGMENT_SEPARATOR = '\n\n=====\n\n';
const SEGMENT_BODY_MAX = 5500; // header + title stay well under the 6,500 test cap
const IMAGE_TOKEN = /@@image:([a-z0-9-]+)@@/g; // turndown escapes [ ], so figures use a neutral token first

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function parseGuide(html: string): { guide: Guide; imageBytes: Map<string, Buffer> } {
  const $ = cheerio.load(html);
  const images: Record<string, GuideImage> = {};
  const imageBytes = new Map<string, Buffer>();
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  td.use(gfm);

  const registerImage = (fig: Cheerio<AnyNode>): string => {
    const img = fig.find('img');
    const match = (img.attr('src') ?? '').match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!match) throw new Error(`figure without an embedded image: ${img.attr('alt')}`);
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]!;
    const bytes = Buffer.from(match[2]!, 'base64');
    const cap = fig.find('figcaption');
    const sourceFile = cap.find('.source-file').text().trim();
    const label = cap.find('strong').first().text().trim();
    const caption = cap.clone().find('.source-file, strong').remove().end().text().replace(/\s+/g, ' ').trim();
    const base = sourceFile
      ? slug(sourceFile.replace(/\.[a-z0-9]+$/i, ''))
      : fig.hasClass('rig-card')
        ? `rig-${slug(label)}`
        : fig.parent().hasClass('icons')
          ? `icon-${slug(cap.text())}`
          : slug(img.attr('alt') ?? 'image');

    let id = base;
    for (let n = 2; images[id] && !imageBytes.get(id)!.equals(bytes); n++) id = `${base}-${n}`;
    if (!images[id]) {
      images[id] = {
        id,
        file: `${id}.${ext}`,
        url: `/guide/img/${id}.${ext}`,
        alt: img.attr('alt') ?? '',
        caption,
        label: label || caption,
        width: Number(img.attr('width')) || 0,
        height: Number(img.attr('height')) || 0,
      };
      imageBytes.set(id, bytes);
    }
    return id;
  };

  const parseSection = ($: CheerioAPI, id: string): Section => {
    const el = $(`section.chapter[id="${id}"]`);
    if (!el.length) throw new Error(`TOC links to a missing section: ${id}`);
    const body = el.clone();
    const title = body.find('h2').first().text().trim();
    body.find('p.chapter-group, h2, p.back, colgroup, script, style').remove();
    const imageIds: string[] = [];
    body.find('figure').each((_, node) => {
      const imageId = registerImage($(node));
      imageIds.push(imageId);
      $(node).replaceWith(`<p>@@image:${imageId}@@</p>`);
    });
    const markdown = td
      .turndown(body.html() ?? '')
      .replace(IMAGE_TOKEN, '[image:$1]')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return { id, title, markdown, imageIds: [...new Set(imageIds)] };
  };

  const chapters: Chapter[] = $('.toc-group')
    .toArray()
    .map((group, i) => {
      const g = $(group);
      const slugName = CHAPTER_SLUGS[i];
      if (!slugName) throw new Error(`unexpected TOC group #${i + 1}`);
      const [number = '', ...rest] = g.find('.toc-set').text().split('/').map((t) => t.trim());
      const ids = g.find('a[href^="#"]').toArray().map((a) => $(a).attr('href')!.slice(1));
      return {
        slug: slugName,
        number,
        title: rest.join(' / '),
        summary: g.children('p').not('.toc-set').first().text().trim(),
        internal: slugName === 'creator',
        sections: ids.map((id) => parseSection($, id)),
      };
    });

  return { guide: { chapters, images }, imageBytes };
}

export function publicGuide(guide: Guide): Guide {
  const chapters = guide.chapters.filter((c) => !c.internal);
  const used = new Set(chapters.flatMap((c) => c.sections.flatMap((s) => s.imageIds)));
  return { chapters, images: Object.fromEntries(Object.entries(guide.images).filter(([id]) => used.has(id))) };
}

const splitLongLine = (line: string, max: number) => line.match(new RegExp(`.{1,${max}}(?:\\s|$)`, 'g')) ?? [line];

// Oversized blocks split between table rows (repeating the header row) or at word boundaries.
function splitBlock(block: string, max: number): string[] {
  const lines = block.split('\n');
  const isTable = lines[0]?.startsWith('|') && /^\|[\s:|-]+\|$/.test(lines[1] ?? '');
  const head = isTable ? lines.slice(0, 2) : [];
  const rows = (isTable ? lines.slice(2) : lines).flatMap((l) => (l.length > max ? splitLongLine(l, max) : [l]));
  const out: string[] = [];
  let cur: string[] = [];
  for (const row of rows) {
    if (cur.length && [...head, ...cur, row].join('\n').length > max) {
      out.push([...head, ...cur].join('\n'));
      cur = [];
    }
    cur.push(row);
  }
  if (cur.length) out.push([...head, ...cur].join('\n'));
  return out;
}

function splitMarkdown(md: string, max: number): string[] {
  const blocks = md.split(/\n{2,}/).flatMap((b) => (b.length <= max ? [b] : splitBlock(b, max)));
  const parts: string[] = [];
  let cur = '';
  for (const b of blocks) {
    if (cur && cur.length + b.length + 2 > max) {
      parts.push(cur);
      cur = '';
    }
    cur = cur ? `${cur}\n\n${b}` : b;
  }
  if (cur) parts.push(cur);
  return parts;
}

export function toDifyDocument(chapter: Chapter): string {
  return chapter.sections
    .flatMap((s) =>
      splitMarkdown(s.markdown, SEGMENT_BODY_MAX).map((part) => {
        const partImages = [...new Set([...part.matchAll(/\[image:([a-z0-9-]+)\]/g)].map((m) => m[1]!))];
        return `${formatSegmentHeader(s.id, chapter.slug, partImages)}\n### ${chapter.title} › ${s.title}\n\n${part}`;
      }),
    )
    .join(SEGMENT_SEPARATOR);
}
