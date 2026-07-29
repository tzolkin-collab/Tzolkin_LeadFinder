'use client';

import { TargetIcon, GlobeIcon, SparklesIcon } from '../brand/UIIcons.js';

/**
 * Widget Minimalista Tracer: Demanda de Serviços B2B no Brasil com Gráfico SVG
 * 100% SVG Vector Strokes — Zero Emojis!
 * Títulos em Offwhite — Amarelo reservado estritamente para destaques/ações.
 */
export function MostContractedServicesWidget({ isExample = true }) {
  const SERVICES = [
    { label: 'Landing Page & CRO', pct: 42, pctText: '42%', desc: 'páginas de alta conversão para tráfego pago', color: 'var(--tzolkin-yellow)' },
    { label: 'Google Ads & SEO Local', pct: 28, pctText: '28%', desc: 'posicionamento no Google Maps e busca', color: 'var(--tzolkin-cyan)' },
    { label: 'Reestruturação de Marca', pct: 18, pctText: '18%', desc: 'autoridade e posicionamento digital', color: 'var(--text-secondary)' },
    { label: 'Automação WhatsApp', pct: 12, pctText: '12%', desc: 'qualificação e agendamento direto', color: 'var(--success)' },
  ];

  return (
    <div style={{ marginBottom: 36, opacity: isExample ? 0.95 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlobeIcon size={15} color="var(--tzolkin-yellow)" />
          <span
            style={{
              fontSize: 11,
              color: 'var(--tzolkin-offwhite)',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            DEMANDA B2B MAIS CONTRATADA NO BRASIL
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-tertiary)' }}>
          {isExample ? (
            <span className="badge badge-example" style={{ fontSize: 9, padding: '2px 6px' }}>
              exemplo
            </span>
          ) : (
            <>
              <TargetIcon size={12} color="var(--text-tertiary)" />
              <span>Estimativa de mercado</span>
            </>
          )}
        </div>
      </div>

      {/* Gráfico de Barras SVG Interativo */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SERVICES.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.color }}>
                  {s.pctText}
                </span>
              </div>

              {/* Bar SVG container */}
              <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                <div
                  style={{
                    width: `${s.pct}%`,
                    height: '100%',
                    background: s.color,
                    borderRadius: 3,
                    transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
