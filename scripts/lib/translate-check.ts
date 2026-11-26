// Guards a machine translation of guide Markdown: numbers and structure must survive unchanged.
const numbers = (md: string) => (md.match(/\d[\d,.]*\d|\d/g) ?? []).map((n) => n.replace(/,/g, '')).sort();
const count = (md: string, re: RegExp) => md.split('\n').filter((l) => re.test(l)).length;

/** Returns a short problem description, or null when the translation keeps the source's numbers and shape. */
export function checkTranslation(en: string, zh: string): string | null {
  if (count(en, /^\s*\|/) !== count(zh, /^\s*\|/)) return 'table rows differ';
  if (count(en, /^\s*([-*]|\d+\.)\s/) !== count(zh, /^\s*([-*]|\d+\.)\s/)) return 'list items differ';
  if (count(en, /^#+\s/) !== count(zh, /^#+\s/)) return 'headings differ';
  const images = (md: string) => (md.match(/\[image:[a-z0-9-]+\]/g) ?? []).join();
  if (images(en) !== images(zh)) return 'image tokens differ';
  // Ordinary lowercase words are prose that must be translated; capitalised words are mostly names kept in English.
  const prose = (en.replace(/\[image:[a-z0-9-]+\]/g, '').match(/\b[a-z]{3,}\b/g) ?? []).length;
  const han = (zh.match(/\p{Script=Han}/gu) ?? []).length;
  if (han < prose * 0.5) return `not translated (${han} Chinese characters for ${prose} English words)`;
  const a = numbers(en);
  const b = numbers(zh);
  const missing = a.filter((n) => !b.includes(n));
  if (missing.length) return `numbers missing: ${[...new Set(missing)].slice(0, 5).join(', ')}`;
  return null;
}
