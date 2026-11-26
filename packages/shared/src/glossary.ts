/** English → Chinese game names (content/glossary.zh.json), shared by the guide translation and Pip. */
export type Glossary = Record<string, string>;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The glossary entries whose English name appears in `text`, longest first, as prompt lines. */
export function glossaryLines(glossary: Glossary, text: string): string {
  return Object.keys(glossary)
    .filter((en) => new RegExp(`(^|[^A-Za-z])${escape(en)}($|[^A-Za-z])`).test(text))
    .sort((a, b) => b.length - a.length)
    .map((en) => `${en} → ${glossary[en]}`)
    .join('\n');
}
