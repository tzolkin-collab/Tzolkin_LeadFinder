'use client';

/**
 * Avatar de iniciais + frase inline — estilo menção do Twitter/X, não card.
 * O sujeito do sinal é uma pessoa, então a forma evoca uma pessoa, não uma
 * estatística.
 *
 * ⚠️ Fonte real ainda não existe: scrapeLinkedInCompany (packages/core) só
 * traz dado de empresa (nome, tagline, funcionários), não contratação nem
 * troca de cargo. Este componente é usado só com isExample=true até existir
 * capacidade de scraping de pessoa/perfil. Ver plano de implementação.
 */
export function PersonMention({ initials, headline, detail, href, isExample = false }) {
  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--tzolkin-yellow-soft)',
          color: 'var(--tzolkin-yellow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {initials}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{headline}</span> {detail}
      </span>
    </>
  );

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    opacity: isExample ? 0.85 : 1,
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
