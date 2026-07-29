'use client';

import { useState } from 'react';
import { AppShell, PageHeader } from '../../components/shell/AppShell.js';

/**
 * Casca visual do Tracer — chat + painel de artefatos, só frontend.
 *
 * Sem streaming, sem tool-use, sem rota de API ainda (isso é a próxima
 * rodada, "full backend"). As mensagens abaixo são exemplo estático, e o
 * painel de artefato mostra o estado vazio honesto — nunca fingir que já
 * existe dossiê ou mapa ali.
 */
export default function TracerPage() {
  const [draft, setDraft] = useState('');

  return (
    <AppShell>
      <PageHeader title="Tracer" meta="conversa de exemplo" />
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        <ChatPanel draft={draft} onDraftChange={setDraft} />
        <ArtifactPanel />
      </div>
    </AppShell>
  );
}

function ChatPanel({ draft, onDraftChange }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-primary)',
      }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ChatMessage role="user">
          estéticas em Contagem que começaram a anunciar esse mês e não têm site
        </ChatMessage>
        <ChatMessage role="assistant">
          Achei 4 com sinal forte. A Studio Bella se destaca — anuncia há 16 dias, sem site,
          e o link da bio vai direto pro WhatsApp.
        </ChatMessage>
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--border-primary)' }}>
        <input
          className="input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="pergunte ou peça algo…"
          disabled
          style={{ opacity: 0.6, cursor: 'not-allowed' }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, marginBottom: 0 }}>
          conversa ainda não está conectada — casca visual, sem backend
        </p>
      </div>
    </div>
  );
}

function ChatMessage({ role, children }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {isUser ? 'você' : 'tracer'}
      </span>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-primary)',
          background: isUser ? 'var(--bg-card)' : 'transparent',
          padding: isUser ? '10px 14px' : 0,
          borderRadius: isUser ? 'var(--radius-md)' : 0,
          maxWidth: '85%',
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ArtifactPanel() {
  return (
    <div style={{ width: 320, flexShrink: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        artefato
      </span>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
        Os artefatos da conversa aparecem aqui — dossiê em .md ao vivo, ou um mapa quando
        a localização importar. Nada foi gerado ainda nesta conversa de exemplo.
      </p>
    </div>
  );
}
