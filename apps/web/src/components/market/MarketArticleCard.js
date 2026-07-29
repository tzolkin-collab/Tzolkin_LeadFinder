'use client';

import { useState } from 'react';
import { MarkdownRenderer } from '../common/MarkdownRenderer.js';
import { DocumentIcon, ArrowUpIcon } from '../brand/UIIcons.js';

/**
 * Componente Minimalista de Dossiê/Matéria Editorial em Markdown (.md).
 * 100% SVG Vector Strokes — Zero Emojis!
 * Títulos em Offwhite/Branco — Amarelo reservado estritamente para ações/destaques.
 */
export function MarketArticleCard({ title, tag, author, readTime, summary, markdownContent, date }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        style={{
          padding: '14px 0',
          borderBottom: '1px solid var(--border-primary)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
        onClick={() => setShowModal(true)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DocumentIcon size={13} color="var(--tzolkin-yellow)" />
            <span style={{ color: 'var(--tzolkin-offwhite)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.03em' }}>
              DOSSIÊ · {tag}
            </span>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{date}</span>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--tzolkin-offwhite)', margin: 0, lineHeight: 1.4 }}>
          {title}
        </h3>

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {summary}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginTop: 4 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Por {author || 'Tracer Intel'} · {readTime || '3 min'}</span>
          <span style={{ color: 'var(--tzolkin-yellow)', fontSize: 11, fontWeight: 500 }}>
            Ler Dossiê (.md) →
          </span>
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              maxWidth: 740,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 28,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <DocumentIcon size={14} color="var(--tzolkin-yellow)" />
                  <span style={{ fontSize: 11, color: 'var(--tzolkin-offwhite)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{tag}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--tzolkin-offwhite)', margin: 0 }}>{title}</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕ Fechar</button>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-primary)',
                paddingTop: 16,
              }}
            >
              <MarkdownRenderer content={markdownContent} />
            </div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(false)}>
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
