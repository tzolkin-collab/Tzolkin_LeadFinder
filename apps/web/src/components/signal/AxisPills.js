'use client';

/**
 * Os quatro eixos de sinal, sempre nesta ordem.
 *
 * A ordem é fixa por design: é o que permite ler o conjunto pelo padrão de cor
 * sem processar número. Trocar a ordem quebra a leitura de todo mundo que já
 * usou o produto. Ver .claude/skills/tracer-design.
 *
 * As cores reaproveitam os tokens semânticos que já existem em globals.css
 * (--score-high/medium/low, mesmos usados no score-circle do dossiê) — o
 * quarto eixo, momento, é o único que usa o amarelo da marca, porque é o
 * diferencial do produto.
 */
export const AXES = [
  { key: 'dor', label: 'dor', varColor: 'var(--score-low)', varBg: 'var(--error-soft)' },
  { key: 'dinheiro', label: 'dinheiro', varColor: 'var(--score-medium)', varBg: 'var(--warning-soft)' },
  { key: 'momento', label: 'momento', varColor: 'var(--tzolkin-yellow)', varBg: 'var(--tzolkin-yellow-soft)' },
  { key: 'alcance', label: 'alcance', varColor: 'var(--score-high)', varBg: 'var(--success-soft)' },
];

/**
 * `facts` é `{ dor?, dinheiro?, momento?, alcance? }` — o FATO curto que
 * sustenta o eixo (`"sem site"`, `"anuncia + 340 av."`, `"16 dias"`,
 * `"whatsapp"`), nunca uma nota de 1 a 10. Nota sem evidência não convence, e
 * antes do cliente zero validar desfecho, qualquer dígito é confiança
 * fabricada. Ver .claude/skills/tracer-design.
 *
 * Eixo sem fato conhecido renderiza travessão. O fato tem comprimento muito
 * variável ("sem site" vs "anuncia + 340 av.") — por isso cada pílula reserva
 * uma largura máxima com reticências em vez de largura fixa; o `title` nativo
 * revela o texto completo no hover sem precisar de tooltip próprio.
 */
export function AxisPills({ facts = {} }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {AXES.map((axis) => {
        const fact = facts[axis.key];
        const known = typeof fact === 'string' && fact.length > 0;
        const text = `${axis.label} · ${known ? fact : '—'}`;

        return (
          <span
            key={axis.key}
            className="badge"
            title={known ? text : undefined}
            style={{
              color: known ? axis.varColor : 'var(--text-tertiary)',
              background: known ? axis.varBg : 'var(--bg-elevated)',
              minWidth: 58,
              maxWidth: 168,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
          >
            <span style={{ opacity: 0.75, fontWeight: 400 }}>{axis.label}</span>
            {' · '}
            <span style={{ fontWeight: 500 }}>{known ? fact : '—'}</span>
          </span>
        );
      })}
    </div>
  );
}
