'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GlobeIcon } from '../brand/UIIcons.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

/** Rótulos de sinal para leitura humana. Espelha SignalType do schema. */
const SIGNAL_LABELS = {
  SEM_SITE: 'sem site',
  SITE_FORA_DO_AR: 'site fora do ar',
  SO_LINKTREE: 'só Linktree',
  PUBLICOU_SITE: 'publicou site',
  COMECOU_A_ANUNCIAR: 'começou a anunciar',
  PAROU_DE_ANUNCIAR: 'parou de anunciar',
  AUMENTOU_CRIATIVOS: 'aumentou criativos',
  SALTO_DE_REVIEWS: 'salto de avaliações',
  CNPJ_RECENTE: 'CNPJ recente',
  NOVA_UNIDADE: 'nova unidade',
  INSTAGRAM_ATIVO: 'Instagram ativo',
  WHATSAPP_COMERCIAL: 'WhatsApp comercial',
  DM_ABERTO: 'DM aberto',
  RECLAMACAO_EM_REVIEW: 'reclamação em avaliação',
};

/**
 * Sinal por nicho, filtrado pela especialidade do usuário.
 *
 * Duas versões anteriores erraram aqui e vale registrar: a primeira mostrava
 * percentuais fixos com uma amostragem inventada; a segunda agregava só
 * `hasWebsite`, o que é inútil para quem não vende site. Agora o backend
 * resolve "especialidade → sinal relevante" e esta tela renderiza os estados
 * honestos que ele expõe — inclusive "seu perfil não tem sinal ainda".
 */
export function NicheSignalWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
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
  const profileConfigured = data?.profileConfigured ?? false;
  const gaps = data?.relevance?.gaps ?? [];

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader total={data?.totalBusinesses} configured={profileConfigured} />

      {!profileConfigured ? (
        <Panel dashed>
          <p style={{ margin: 0, marginBottom: 10 }}>
            O Tracer ainda não sabe o que você faz — então não sabe que sinal é relevante
            pra você.
          </p>
          <Link href="/settings" style={{ color: 'var(--tzolkin-yellow)', fontSize: 12 }}>
            definir minha especialidade →
          </Link>
        </Panel>
      ) : buckets.length === 0 ? (
        <Panel dashed>
          {data?.totalBusinesses > 0
            ? `${data.totalBusinesses} negócio${data.totalBusinesses === 1 ? '' : 's'} mapeado${data.totalBusinesses === 1 ? '' : 's'}, nenhum com sinal relevante para a sua especialidade ainda.`
            : 'Nenhum negócio mapeado ainda — busque leads para ver o sinal por nicho.'}
        </Panel>
      ) : (
        <Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {buckets.map((b, i) => (
              <CategoryRow key={b.category} bucket={b} isTop={i === 0} />
            ))}
          </div>
        </Panel>
      )}

      {gaps.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gaps.map((g) => (
            <p
              key={g.specialty}
              style={{ fontSize: 11, color: 'var(--warning)', margin: 0, lineHeight: 1.5 }}
            >
              <strong style={{ fontWeight: 500 }}>{g.label}:</strong> {g.gap}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ bucket, isTop }) {
  const topSignals = Object.entries(bucket.signalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{bucket.category}</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            // Uma ênfase por tela: só a categoria com mais sinal leva o amarelo.
            color: isTop ? 'var(--tzolkin-yellow)' : 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {bucket.withRelevantSignal}/{bucket.total}
        </span>
      </div>

      <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
        <div
          style={{
            width: `${bucket.withRelevantSignalPct}%`,
            height: '100%',
            background: isTop ? 'var(--tzolkin-yellow)' : 'var(--text-tertiary)',
            borderRadius: 3,
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
        {topSignals.length > 0
          ? topSignals.map(([type, count]) => `${SIGNAL_LABELS[type] || type} (${count})`).join(' · ')
          : 'sem sinal relevante nesta categoria'}
      </span>
    </div>
  );
}

function Panel({ children, dashed = false }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: `1px ${dashed ? 'dashed' : 'solid'} var(--border-primary)`,
        borderRadius: 'var(--radius-md)',
        padding: dashed ? 24 : 18,
        fontSize: 12,
        color: 'var(--text-tertiary)',
        textAlign: dashed ? 'center' : 'left',
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ total, configured }) {
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
          {configured ? 'SINAL RELEVANTE PARA VOCÊ, POR NICHO' : 'SINAL POR NICHO'}
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
