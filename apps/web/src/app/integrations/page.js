'use client';

import Link from 'next/link';
import { Header } from '../../components/Header.js';

export default function IntegrationsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Header activeTab="integrations" />

      <main className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="eyebrow" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)' }}>
              ECOSSISTEMA TZOLKIN & CONECTORES
            </span>
            <span style={{
              fontSize: 9,
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 100,
              background: 'rgba(250, 250, 247, 0.12)',
              color: 'var(--tzolkin-offwhite)',
              border: '1px solid rgba(250, 250, 247, 0.25)',
              textTransform: 'lowercase',
            }}>
              em breve
            </span>
          </div>

          <h1 className="tzolkin-title" style={{ fontSize: 28, marginTop: 4 }}>INTEGRAÇÕES & CONECTORES NATIVOS</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Conecte o Lead Finder com as ferramentas de atendimento, automação e design do ecossistema Tzolkin.
          </p>
        </div>

        {/* UPCOMING INTEGRATIONS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* TZOLKIN WHATSAPP MANAGER */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>
                  Tzolkin WhatsApp Manager
                </div>
                <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                  EM BREVE
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Conexão própria nativa de WhatsApp sem intermediários. Dispare propostas, acompanhe visualizações e envie apresentações comerciais diretamente aos decisores mapeados.
              </p>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Conexão via QR Code</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>Fase Beta</span>
            </div>
          </div>

          {/* TZOLKIN DESIGNER */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>
                  Tzolkin Designer
                </div>
                <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                  EM BREVE
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Geração automática de propostas comerciais em PDF/Web, formulários interativos de qualificação e currículos corporativos personalizados com 1-clique.
              </p>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Modelos Interativos</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>Fase Beta</span>
            </div>
          </div>

          {/* META ADS & INSTAGRAM AUTOMATION */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>
                  Meta Ads & Apify Connector
                </div>
                <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#3B82F6', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                  CONECTADO
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Varredura contínua de bibliotecas de anúncios da Meta e perfis do Instagram para auditoria de investimento de mídia dos concorrentes dos seus clientes.
              </p>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Integração Apify</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>Ativo</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
