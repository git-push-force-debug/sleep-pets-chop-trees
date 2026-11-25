import ReactMarkdown from 'react-markdown';

// react-markdown never renders raw HTML (no rehype-raw) and its default URL transform drops javascript: links.
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      skipHtml
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
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
