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

const COLUMNS = [
  { id: 'PENDING', label: 'Não Auditado', badgeClass: 'badge-pending', color: 'var(--text-tertiary)' },
  { id: 'REVIEWED', label: 'Dossiê Pronto', badgeClass: 'badge-reviewed', color: 'var(--tzolkin-yellow)' },
  { id: 'CONTACTED', label: 'Em Abordagem', badgeClass: 'badge-contacted', color: 'var(--tzolkin-cyan)' },
  { id: 'REJECTED', label: 'Descartado', badgeClass: 'badge-rejected', color: 'var(--error)' },
];

export default function PipelinePage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

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
      console.error('Erro ao buscar pipeline:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_URL}/api/businesses/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === id ? { ...b, report: { ...b.report, status: newStatus } } : b))
        );
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdatingId(null);
    }
  }

  const countByStatus = (statusId) =>
    businesses.filter((b) => (b.report?.status || 'PENDING') === statusId).length;

  return (
    <AppShell>
      <PageHeader
        title="Pipeline de Abordagem"
        meta={`${businesses.length} negócios monitorados`}
        centered={false}
      />

      <div style={{ padding: '24px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Carregando pipeline comercial...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
              gap: 16,
              alignItems: 'start',
            }}
          >
            {COLUMNS.map((col) => {
              const columnBusinesses = businesses.filter(
                (b) => (b.report?.status || 'PENDING') === col.id
              );

              return (
                <div
                  key={col.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    padding: 16,
                    minHeight: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: 10,
                      borderBottom: '1px solid var(--border-primary)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: col.color,
                        }}
                      />
                      {col.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        background: 'var(--bg-input)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {countByStatus(col.id)}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {columnBusinesses.length === 0 ? (
                      <div
                        style={{
                          padding: 24,
                          textAlign: 'center',
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          border: '1px dashed var(--border-primary)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      columnBusinesses.map((b) => (
                        <div
                          key={b.id}
                          className="card"
                          style={{
                            padding: 14,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            opacity: updatingId === b.id ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: 6,
                            }}
                          >
                            <Link
                              href={`/business/${b.id}`}
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--tzolkin-offwhite)',
                                textDecoration: 'none',
                              }}
                            >
                              {b.name}
                            </Link>
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-tertiary)',
                              marginBottom: 10,
                              lineHeight: 1.4,
                            }}
                          >
                            {b.address || 'Sem endereço'}
                          </div>

                          {/* Attributes / Badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {b.rating && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  background: 'rgba(255,255,255,0.04)',
                                  borderRadius: 4,
                                  color: 'var(--tzolkin-yellow)',
                                }}
                              >
                                ★ {b.rating} ({b.reviewCount || 0})
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: b.hasWebsite ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                borderRadius: 4,
                                color: b.hasWebsite ? 'var(--success)' : 'var(--error)',
                              }}
                            >
                              {b.hasWebsite ? 'Com Website' : 'Sem Website'}
                            </span>
                          </div>

                          {/* Actions / Move Controls */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: 8,
                              borderTop: '1px solid var(--border-primary)',
                            }}
                          >
                            <Link
                              href={`/business/${b.id}`}
                              style={{
                                fontSize: 11,
                                color: 'var(--tzolkin-cyan)',
                                textDecoration: 'none',
                              }}
                            >
                              Ver Dossiê ↗
                            </Link>

                            <select
                              value={b.report?.status || 'PENDING'}
                              onChange={(e) => updateStatus(b.id, e.target.value)}
                              style={{
                                fontSize: 10,
                                background: 'var(--bg-main)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 4,
                                padding: '2px 4px',
                                cursor: 'pointer',
                              }}
                            >
                              {COLUMNS.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
