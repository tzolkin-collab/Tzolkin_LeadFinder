'use client';

import { Sidebar } from './Sidebar.js';

/**
 * Casca do app: sidebar persistente à esquerda, conteúdo à direita.
 *
 * Envolve apenas as telas novas do Tracer. O dossiê (business/[id]) e as
 * configurações seguem com o Header antigo (components/legacy) até serem
 * migrados — a troca é incremental de propósito.
 */
export function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}

/**
 * Cabeçalho de página. Altura fixa — o título troca sem empurrar o conteúdo
 * para baixo, que é a causa mais comum de layout shift em navegação.
 */
export function PageHeader({ title, meta, actions, centered = true }) {
  return (
    <header
      style={{
        height: 56,
        padding: '0 24px',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: centered ? 860 : '100%',
          margin: centered ? '0 auto' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>
            {title}
          </h1>
          {meta ? (
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {meta}
            </span>
          ) : null}
        </div>
        {actions ?? null}
      </div>
    </header>
  );
}
