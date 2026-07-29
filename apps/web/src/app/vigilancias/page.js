'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell, PageHeader } from '../../components/shell/AppShell.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

export default function VigilanciasPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      const res = await fetch(`${API_URL}/api/businesses`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao buscar vigilâncias:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Vigilâncias de Mercado"
        meta="negócios sob acompanhamento de sinais"
        centered={false}
      />

      <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--tzolkin-offwhite)', marginBottom: 6 }}>
            📡 Radar de Mudanças de Superfície Digital
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            O Tracer monitora periodicamente estes alvos para identificar alterações no status de anúncios (Meta Ads), publicação de novos websites, aumento repentino de avaliações e abertura de filiais.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Carregando vigilâncias ativas...
          </div>
        ) : businesses.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-primary)',
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Nenhum negócio cadastrado na vigilância.
            </div>
            <Link href="/busca" className="btn btn-primary btn-sm">
              Buscar e Adicionar Alvos ↗
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {businesses.map((b) => (
              <div
                key={b.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Link
                      href={`/business/${b.id}`}
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--tzolkin-offwhite)',
                        textDecoration: 'none',
                      }}
                    >
                      {b.name}
                    </Link>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'rgba(74, 222, 128, 0.1)',
                        color: 'var(--success)',
                        fontWeight: 500,
                      }}
                    >
                      ● Vigilância Ativa
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
                    <span>{b.address || 'Endereço não informado'}</span>
                    {b.rating && <span>★ {b.rating} ({b.reviewCount || 0} avaliações)</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: b.hasWebsite ? 'var(--text-tertiary)' : 'var(--warning)',
                      padding: '4px 10px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    {b.hasWebsite ? '🌐 Website Ativo' : '⚠️ Sem Website'}
                  </span>

                  <Link href={`/business/${b.id}`} className="btn btn-secondary btn-sm">
                    Ver Dossiê ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
