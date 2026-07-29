'use client';

import { formatRelativeTime, getAgeDays } from '../../lib/relativeTime.js';
import { getFreshnessStyle } from '../../lib/signalFreshness.js';

/**
 * A espinha do feed. Linha densa, nunca card: ponto de frescor + nome + fato
 * + timestamp relativo. Sem borda ao redor do item — o divisor vem do
 * `SignalRowList`, não da própria linha.
 *
 * Rejeitado antes: pilha de `.card` com borda arredondada e badge dentro —
 * "sem vida e sem graça". Ver .claude/skills/tracer-design.
 */
export function SignalRow({ name, fact, timestamp, href, isExample = false }) {
  const ageDays = timestamp ? getAgeDays(timestamp) : Infinity;
  const { color, pulse } = getFreshnessStyle(ageDays);
  const relative = timestamp ? formatRelativeTime(timestamp) : '—';

  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          // O anel só acontece quando pulse=true, que só ocorre com cor amarela
          // (ver getFreshnessStyle) — por isso o token direto, sem derivar.
          boxShadow: pulse ? '0 0 0 3px var(--tzolkin-yellow-soft)' : 'none',
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-primary)',
          width: 150,
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {fact}
      </span>
      <span
        style={{
          width: 60,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {isExample && (
          <span className="badge badge-example" style={{ fontSize: 9, padding: '2px 6px' }}>
            exemplo
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 72,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {relative}
      </span>
    </>
  );

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 32,
    padding: '0 2px',
    opacity: isExample ? 0.7 : 1,
    textDecoration: 'none',
  };

  if (href) {
    return (
      <a href={href} style={rowStyle}>
        {content}
      </a>
    );
  }

  return <div style={rowStyle}>{content}</div>;
}

/**
 * Envolve uma lista de `SignalRow` com o divisor de 1px entre linhas — a
 * linha em si nunca gerencia sua própria borda (evita o problema de "sou eu a
 * última?").
 */
export function SignalRowList({ children }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column' }}
      className="signal-row-list"
    >
      {children}
    </div>
  );
}

