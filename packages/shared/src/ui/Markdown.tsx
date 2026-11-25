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
      {text}
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
