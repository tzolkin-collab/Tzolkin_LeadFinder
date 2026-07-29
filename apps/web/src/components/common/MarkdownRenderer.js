'use client';

import { DocumentIcon, TargetIcon, IdeaIcon, CheckIcon, LinkIcon } from '../brand/UIIcons.js';

/**
 * Renderizador nativo de Markdown (.md) sem emojis (100% SVG Vector Strokes).
 * Suporta parsing de links bibliográficos da internet `[Título da Fonte](url)`.
 * Títulos sempre em Offwhite/Branco — Amarelo reservado exclusivamente para destaques e ênfases.
 */
export function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Strip emojis from text to enforce user rule (Zero Emojis)
  const cleanContent = content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  const lines = cleanContent.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{ paddingLeft: 20, margin: '8px 0 16px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.substring(2));
      return;
    }

    if (inList) {
      flushList(index);
    }

    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={index} style={{ fontSize: 20, fontWeight: 700, color: 'var(--tzolkin-offwhite)', margin: '20px 0 12px', letterSpacing: '-0.01em' }}>
          {parseInlineMarkdown(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={index} style={{ fontSize: 16, fontWeight: 600, color: 'var(--tzolkin-offwhite)', margin: '18px 0 10px' }}>
          {parseInlineMarkdown(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={index} style={{ fontSize: 14, fontWeight: 600, color: 'var(--tzolkin-offwhite)', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <TargetIcon size={14} color="var(--tzolkin-yellow)" />
          <span>{parseInlineMarkdown(trimmed.substring(4))}</span>
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={index} style={{ fontSize: 13, fontWeight: 600, color: 'var(--tzolkin-offwhite)', margin: '14px 0 6px' }}>
          {parseInlineMarkdown(trimmed.substring(5))}
        </h4>
      );
    } else if (trimmed === '---') {
      elements.push(
        <hr key={index} style={{ border: 'none', borderTop: '1px solid var(--border-primary)', margin: '20px 0' }} />
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={index}
          style={{
            borderLeft: '3px solid var(--tzolkin-yellow)',
            background: 'var(--bg-input)',
            padding: '12px 16px',
            margin: '12px 0',
            borderRadius: 'var(--radius-xs)',
            fontSize: 13,
            color: 'var(--tzolkin-offwhite)',
          }}
        >
          {parseInlineMarkdown(trimmed.substring(2))}
        </blockquote>
      );
    } else {
      elements.push(
        <p key={index} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  if (inList) {
    flushList('final');
  }

  return <div className="markdown-body">{elements}</div>;
}

/**
 * Converte links markdown [texto](url), negrito (**text**), itálico (*text*) e código (`code`).
 */
function parseInlineMarkdown(text) {
  if (!text) return '';

  // Match links, bold, italic, code
  const parts = text.split(/(\[.*?\]\(.*?\)|`.*?`|\*\*.*?\*\*|\*.*?\*)/g);

  return parts.map((part, index) => {
    // Markdown link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--tzolkin-cyan)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <LinkIcon size={12} color="var(--tzolkin-cyan)" />
          {linkMatch[1]}
        </a>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index} style={{ color: 'var(--tzolkin-yellow)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index} style={{ color: 'var(--tzolkin-offwhite)' }}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            background: 'var(--bg-input)',
            padding: '2px 6px',
            borderRadius: 4,
            color: 'var(--tzolkin-cyan)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
