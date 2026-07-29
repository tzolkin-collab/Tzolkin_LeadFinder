'use client';

/**
 * Número tipográfico grande, sem caixa/fundo/borda nenhuma — só tipografia
 * flutuando na página. É o "momento de revelação" que quebra o ritmo denso
 * do feed de sinal, como uma revista interrompe coluna de texto com um
 * destaque, não como um dashboard empilha tiles iguais.
 *
 * `value` já vem formatado pelo chamador ("73%", "R$ 4.200", "3 novos") — o
 * componente nunca calcula nem formata número. Testado contra os três
 * formatos sem precisar de tratamento especial por tipo.
 *
 * Único uso de amarelo aqui é a ação — "uma ênfase por tela".
 * Ver .claude/skills/tracer-design.
 */
export function HeroStat({ value, caption, actionLabel, actionHref, isExample = false }) {
  return (
    <div style={{ opacity: isExample ? 0.85 : 1 }}>
      <div
        style={{
          fontSize: 40,
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 5 }}>{caption}</div>
      {actionLabel ? (
        <a
          href={actionHref || '#'}
          style={{ fontSize: 12, color: 'var(--tzolkin-yellow)', marginTop: 6, display: 'inline-block' }}
        >
          {actionLabel} →
        </a>
      ) : null}
    </div>
  );
}
