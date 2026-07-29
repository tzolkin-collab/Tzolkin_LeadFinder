'use client';

import { useState, useEffect } from 'react';
import { GlobeIcon } from '../brand/UIIcons.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

/**
 * Substitui o antigo MostContractedServicesWidget — aquele mostrava
 * "distribuição de demanda B2B" com 4 percentuais fixos e uma amostragem
 * inventada ("1.400+ prospecções"). A base canônica não sabe qual serviço um
 * negócio contratou, só observa presença digital pública — não tinha como
 * aquele widget virar real na forma como existia.
 *
 * Este mostra o que a base realmente sabe: % sem site por categoria, só dos
 * negócios que ESTE tenant já mapeou (packages/database
 * aggregateNicheSignal). Não é claim de mercado nacional.
 */
export function NicheSignalWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Adiado por microtask — mesmo padrão assíncrono dos setState no .then/.finally abaixo.
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    fetch(`${API_URL}/api/businesses/niche-signal`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    // Reserva a altura aproximada do estado carregado — evita layout shift.
    return <div style={{ marginBottom: 36, height: 172 }} aria-hidden="true" />;
  }

  const buckets = data?.buckets ?? [];

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader total={data?.totalBusinesses} />

      {buckets.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          {data && data.totalBusinesses > 0
            ? `${data.totalBusinesses} negócio${data.totalBusinesses === 1 ? '' : 's'} mapeado${data.totalBusinesses === 1 ? '' : 's'}, ainda sem categoria com amostra suficiente.`
            : 'Nenhum negócio mapeado ainda — busque leads para ver o sinal por nicho.'}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {buckets.map((b, i) => {
              // Só a barra de maior "sem site" leva o amarelo — uma ênfase
              // por tela. O ícone do cabeçalho fica neutro de propósito.
              const isTop = i === 0;
              return (
                <div key={b.category} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.category}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 500,
                        color: isTop ? 'var(--tzolkin-yellow)' : 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {b.withoutWebsitePct}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                    <div
                      style={{
                        width: `${b.withoutWebsitePct}%`,
                        height: '100%',
                        background: isTop ? 'var(--tzolkin-yellow)' : 'var(--text-tertiary)',
                        borderRadius: 3,
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                    sem site, de {b.total} mapeado{b.total === 1 ? '' : 's'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ total }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GlobeIcon size={15} color="var(--text-tertiary)" />
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
          SEM SITE POR NICHO NA SUA BASE
        </span>
      </div>
      {total ? (
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {total} mapeado{total === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}
