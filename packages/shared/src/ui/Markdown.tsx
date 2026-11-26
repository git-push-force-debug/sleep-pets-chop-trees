import ReactMarkdown from 'react-markdown';

// Model-written text: only same-site links become links, images never render (no phishing links or tracking pixels).
const sameSite = (href?: string) => {
  if (!href) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    return typeof window !== 'undefined' && new URL(href).origin === window.location.origin;
  } catch {
    return false;
  }
};

// Full-width punctuation such as （ ） 。 ，
const CJK_PUNCT = /[\u3000-\u303f\uff00-\uffef“”‘’]/;
const ASCII_PUNCT = /[!-/:-@[-`{-~]/;
const HAN = /\p{Script=Han}/u;

/**
 * CommonMark doesn't see `**` as bold when it sits between Chinese text and full-width punctuation
 * (`打开**奖励（Rewards）**并` shows raw asterisks). Moving that punctuation to the outside of the
 * markers fixes it; the bracket just isn't bold. Pairs are counted per line.
 */
export function cjkEmphasis(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      const parts = line.split('**');
      if (parts.length < 3) return line;
      for (let i = 1; i < parts.length; i++) {
        const opening = i % 2 === 1;
        if (opening && i < parts.length - 1 && CJK_PUNCT.test(parts[i]![0] ?? '')) {
          parts[i - 1] = parts[i - 1]! + parts[i]![0]!;
          parts[i] = parts[i]!.slice(1);
        } else if (!opening && CJK_PUNCT.test(parts[i - 1]!.at(-1) ?? '')) {
          parts[i] = parts[i - 1]!.at(-1)! + parts[i];
          parts[i - 1] = parts[i - 1]!.slice(0, -1);
        }
        // Bold that starts with a symbol right after Chinese text (`为**$6/s**`) needs a space before it.
        if (opening && i < parts.length - 1 && ASCII_PUNCT.test(parts[i]![0] ?? '') && HAN.test(parts[i - 1]!.at(-1) ?? '')) parts[i - 1] = `${parts[i - 1]} `;
      }
      return parts.join('**');
    })
    .join('\n');
}

// react-markdown never renders raw HTML (no rehype-raw) and its default URL transform drops javascript: links.
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      skipHtml
      disallowedElements={['img']}
      components={{
        a: ({ href, children }) =>
          sameSite(href) ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ) : (
            <span>{children}</span>
          ),
      }}
    >
      {cjkEmphasis(text)}
    </ReactMarkdown>
  );
}

/** Plain-text version of short markdown, for the typewriter and screen readers. */
export const markdownToPlain = (md: string) =>
  md
    .replace(/<[^>]*>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();
