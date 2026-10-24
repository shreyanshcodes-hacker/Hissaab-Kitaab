import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Lightweight, XSS-safe Markdown renderer for AI chat replies.
 *
 * Builds React nodes directly (never uses `dangerouslySetInnerHTML`) and supports:
 * - `***text***` / `___text___` → bold + italic
 * - `**text**`                  → bold
 * - `__text__`, `++text++`, `<u>text</u>` → underline
 * - `*text*` / `_text_`         → italic (snake_case identifiers are left untouched)
 * - `~~text~~`                  → strikethrough
 * - `` `code` ``                → inline code
 * - `# Heading` … `###### Heading`
 * - `-`, `*`, `•` bullet lists and `1.` / `1)` numbered lists
 */

interface InlineRule {
  regex: RegExp;
  render: (inner: string, key: string) => React.ReactNode;
}

const INLINE_RULES: InlineRule[] = [
  {
    regex: /`([^`\n]+)`/,
    render: (inner, key) => (
      <code
        key={key}
        className="px-1.5 py-0.5 rounded bg-surface-container text-[0.85em] font-mono text-on-surface"
      >
        {inner}
      </code>
    ),
  },
  {
    regex: /\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*/,
    render: (inner, key) => (
      <strong key={key} className="font-bold italic">
        {parseInline(inner, key)}
      </strong>
    ),
  },
  {
    regex: /(?<![A-Za-z0-9])___(?!\s)(.+?)(?<!\s)___(?![A-Za-z0-9])/,
    render: (inner, key) => (
      <strong key={key} className="font-bold italic">
        {parseInline(inner, key)}
      </strong>
    ),
  },
  {
    regex: /\*\*(?!\s)(.+?)(?<!\s)\*\*/,
    render: (inner, key) => (
      <strong key={key} className="font-bold">
        {parseInline(inner, key)}
      </strong>
    ),
  },
  {
    regex: /<u>([\s\S]+?)<\/u>/i,
    render: (inner, key) => (
      <u key={key} className="underline underline-offset-2">
        {parseInline(inner, key)}
      </u>
    ),
  },
  {
    regex: /(?<![A-Za-z0-9])__(?!\s)(.+?)(?<!\s)__(?![A-Za-z0-9])/,
    render: (inner, key) => (
      <u key={key} className="underline underline-offset-2">
        {parseInline(inner, key)}
      </u>
    ),
  },
  {
    regex: /\+\+(?!\s)(.+?)(?<!\s)\+\+/,
    render: (inner, key) => (
      <u key={key} className="underline underline-offset-2">
        {parseInline(inner, key)}
      </u>
    ),
  },
  {
    regex: /~~(?!\s)(.+?)(?<!\s)~~/,
    render: (inner, key) => (
      <s key={key} className="line-through opacity-80">
        {parseInline(inner, key)}
      </s>
    ),
  },
  {
    regex: /(?<![A-Za-z0-9*])\*(?![\s*])([^*\n]+?)(?<!\s)\*(?![A-Za-z0-9*])/,
    render: (inner, key) => (
      <em key={key} className="italic">
        {parseInline(inner, key)}
      </em>
    ),
  },
  {
    regex: /(?<![A-Za-z0-9_])_(?![\s_])([^_\n]+?)(?<!\s)_(?![A-Za-z0-9_])/,
    render: (inner, key) => (
      <em key={key} className="italic">
        {parseInline(inner, key)}
      </em>
    ),
  },
];

/** Recursively converts inline markdown into React nodes. */
function parseInline(text: string, keyPrefix = 'i'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  while (remaining.length > 0) {
    // Find the earliest matching rule (ties resolved by rule priority order).
    let best: { rule: InlineRule; match: RegExpExecArray } | null = null;
    for (const rule of INLINE_RULES) {
      const m = rule.regex.exec(remaining);
      if (m && (best === null || m.index < best.match.index)) {
        best = { rule, match: m };
      }
    }

    if (!best) {
      nodes.push(remaining);
      break;
    }

    const { rule, match } = best;
    if (match.index > 0) {
      nodes.push(remaining.slice(0, match.index));
    }
    nodes.push(rule.render(match[1], `${keyPrefix}-${idx++}`));
    remaining = remaining.slice(match.index + match[0].length);
  }

  return nodes;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; lines: string[] }
  | { type: 'spacer' };

const BULLET_RE = /^\s*(?:[-•]|\*(?!\*))\s+(.*)$/;
const NUMBERED_RE = /^\s*\d+[.)]\s+(.*)$/;
const HEADING_RE = /^\s*(#{1,6})\s+(.*)$/;

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    const last = blocks[blocks.length - 1];
    let m: RegExpMatchArray | null;

    if (line.trim() === '') {
      if (last && last.type !== 'spacer') blocks.push({ type: 'spacer' });
      continue;
    }

    if ((m = line.match(HEADING_RE))) {
      blocks.push({ type: 'heading', level: m[1].length, text: m[2] });
    } else if ((m = line.match(BULLET_RE))) {
      if (last?.type === 'ul') last.items.push(m[1]);
      else blocks.push({ type: 'ul', items: [m[1]] });
    } else if ((m = line.match(NUMBERED_RE))) {
      if (last?.type === 'ol') last.items.push(m[1]);
      else blocks.push({ type: 'ol', items: [m[1]] });
    } else if (last?.type === 'p') {
      last.lines.push(line);
    } else {
      blocks.push({ type: 'p', lines: [line] });
    }
  }

  // Trim trailing spacer
  while (blocks.length && blocks[blocks.length - 1].type === 'spacer') blocks.pop();
  return blocks;
}

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className }) => {
  const blocks = parseBlocks(text || '');

  return (
    <div className={cn('leading-relaxed break-words', className)}>
      {blocks.map((block, bi) => {
        const key = `b-${bi}`;
        switch (block.type) {
          case 'spacer':
            return <div key={key} className="h-2" aria-hidden="true" />;
          case 'heading': {
            const size =
              block.level === 1 ? 'text-lg' : block.level === 2 ? 'text-base' : 'text-sm';
            return (
              <p key={key} className={cn('font-bold text-on-surface mt-1', size)} role="heading" aria-level={block.level}>
                {parseInline(block.text, key)}
              </p>
            );
          }
          case 'ul':
            return (
              <ul key={key} className="list-disc pl-5 space-y-1 marker:text-primary">
                {block.items.map((item, ii) => (
                  <li key={`${key}-${ii}`}>{parseInline(item, `${key}-${ii}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="list-decimal pl-5 space-y-1 marker:text-primary marker:font-semibold">
                {block.items.map((item, ii) => (
                  <li key={`${key}-${ii}`}>{parseInline(item, `${key}-${ii}`)}</li>
                ))}
              </ol>
            );
          case 'p':
          default:
            return (
              <p key={key}>
                {block.lines.map((ln, li) => (
                  <React.Fragment key={`${key}-${li}`}>
                    {li > 0 && <br />}
                    {parseInline(ln, `${key}-${li}`)}
                  </React.Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
};

export default FormattedText;
