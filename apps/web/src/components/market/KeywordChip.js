'use client';

import { SearchIcon } from '../brand/UIIcons.js';

/**
 * Pílula em formato de barra de busca — a forma evoca literalmente o que
 * representa (uma query), em vez de um card genérico rotulado "keyword".
 *
 * Regra de cor obrigatória: amarelo só quando a concorrência é baixa — é a
 * oportunidade boa. Média/alta ficam no cinza terciário. Sem essa condicional
 * o amarelo deixa de significar "vale a pena" e vira decoração, o que a skill
 * já proíbe para os eixos e vale exatamente igual aqui.
 */
export function KeywordChip({ query, volume, competition, href, isExample = false }) {
  const isGoodOpportunity = competition === 'baixa';

  return (
    <a
      href={href || '#'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--bg-subtle-fill)',
        borderRadius: 'var(--radius-pill)',
        padding: '9px 15px',
        textDecoration: 'none',
        opacity: isExample ? 0.85 : 1,
      }}
    >
      <SearchIcon size={14} color="var(--text-tertiary)" />
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {query}
      </span>
      <span
        style={{
          fontSize: 11,
          color: isGoodOpportunity ? 'var(--tzolkin-yellow)' : 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {volume.toLocaleString('pt-BR')}/mês · {competition}
      </span>
      {isExample && (
        <span className="badge badge-example" style={{ fontSize: 9, padding: '2px 6px', flexShrink: 0 }}>
          exemplo
        </span>
      )}
    </a>
  );
}
