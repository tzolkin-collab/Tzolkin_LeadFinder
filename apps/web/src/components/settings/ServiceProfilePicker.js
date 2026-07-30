'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

const CATEGORY_LABELS = {
  MARKETING_DIGITAL: 'Marketing digital',
  DESENVOLVIMENTO: 'Desenvolvimento',
  DESIGN: 'Design',
  AUTOMACAO_IA: 'Automação e IA',
  CONSULTORIA: 'Consultoria',
};

/**
 * Escolha em DOIS níveis: nicho e depois a profissão dentro do nicho.
 *
 * Multi nos dois níveis de propósito — o mesmo prestador pode fazer landing
 * page (Desenvolvimento) e tráfego pago (Marketing digital). O nicho vem da
 * própria profissão escolhida, então não existe par inconsistente.
 *
 * O campo de texto livre passa por `POST /api/taxonomy/resolve`, que aplica os
 * guardrails da taxonomia. Nunca cria categoria direto — inclusive o caso de
 * "esse serviço existe, mas em outro nicho", que aqui vira uma pergunta em vez
 * de uma duplicata.
 */
export function ServiceProfilePicker({ onSaved }) {
  const [taxonomy, setTaxonomy] = useState(null);
  const [selected, setSelected] = useState([]);
  const [openCategory, setOpenCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [freeTextCategory, setFreeTextCategory] = useState('MARKETING_DIGITAL');
  const [resolveResult, setResolveResult] = useState(null);
  const [gaps, setGaps] = useState([]);

  const load = useCallback(async () => {
    try {
      const [taxRes, profRes] = await Promise.all([
        fetch(`${API_URL}/api/taxonomy`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/taxonomy/profile`, { headers: authHeaders() }),
      ]);
      if (taxRes.ok) setTaxonomy(await taxRes.json());
      if (profRes.ok) {
        const prof = await profRes.json();
        setSelected(prof.services.map((s) => s.subcategoryId));
        setGaps(prof.relevance?.gaps ?? []);
      }
    } catch {
      // Estado vazio honesto — a tela diz que não carregou em vez de mostrar
      // uma lista falsa.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Adiado por microtask — `load` faz setState, e chamá-lo direto no corpo do
    // efeito dispara render em cascata (mesma correção do NicheSignalWidget).
    Promise.resolve().then(() => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      load();
    });
  }, [load]);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/taxonomy/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ subcategoryIds: selected }),
      });
      if (res.ok) {
        const prof = await res.json();
        setGaps(prof.relevance?.gaps ?? []);
        onSaved?.(prof);
      }
    } finally {
      setSaving(false);
    }
  }

  async function resolveFreeText() {
    if (!freeText.trim()) return;
    setResolveResult(null);
    try {
      const res = await fetch(`${API_URL}/api/taxonomy/resolve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rawLabel: freeText, category: freeTextCategory }),
      });
      if (res.ok) setResolveResult(await res.json());
    } catch {
      setResolveResult(null);
    }
  }

  if (loading) return <div style={{ height: 220 }} aria-hidden="true" />;

  if (!taxonomy) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        Não foi possível carregar a lista de serviços.
      </p>
    );
  }

  const selectedByCategory = taxonomy.categories
    .map((c) => ({
      category: c.category,
      picked: c.subcategories.filter((s) => selected.includes(s.id)),
    }))
    .filter((c) => c.picked.length > 0);

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Escolha o nicho e, dentro dele, o que você faz. Pode marcar quantos quiser, em
        nichos diferentes — é isso que define quais sinais de negócio aparecem pra você.
      </p>

      {/* Resumo do que já está escolhido, agrupado por nicho */}
      {selectedByCategory.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectedByCategory.map(({ category, picked }) => (
            <div key={category} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{CATEGORY_LABELS[category]}:</span>{' '}
              <span style={{ color: 'var(--text-primary)' }}>
                {picked.map((p) => p.label).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Nível 1: nicho. Nível 2: profissão dentro do nicho. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {taxonomy.categories.map(({ category, subcategories }) => {
          const isOpen = openCategory === category;
          const pickedCount = subcategories.filter((s) => selected.includes(s.id)).length;

          return (
            <div
              key={category}
              style={{
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : category)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span>{CATEGORY_LABELS[category]}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {pickedCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--tzolkin-yellow)',
                      }}
                    >
                      {pickedCount}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: '0 14px 14px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {subcategories.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="chip-toggle"
                      aria-pressed={selected.includes(s.id)}
                      onClick={() => toggle(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Texto livre — passa pelo resolver, nunca cria direto */}
      <div
        style={{
          borderTop: '1px solid var(--border-primary)',
          paddingTop: 16,
          marginBottom: 16,
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}
        >
          Não achou o que você faz?
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="input"
            value={freeTextCategory}
            onChange={(e) => setFreeTextCategory(e.target.value)}
            style={{ flex: '0 0 190px', fontSize: 12 }}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Ex: automação de inbound com IA"
            style={{ flex: 1, minWidth: 200, fontSize: 12 }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={resolveFreeText}>
            Verificar
          </button>
        </div>

        {resolveResult && <ResolveFeedback result={resolveResult} onAdd={toggle} />}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Salvando…' : 'Salvar meu perfil'}
      </button>

      {gaps.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
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

/**
 * Traduz a decisão do resolver em linguagem de produto. O caso central é
 * EXISTS_IN_OTHER_CATEGORY: em vez de duplicar em silêncio, pergunta se o
 * usuário quer adicionar aquele nicho.
 */
function ResolveFeedback({ result, onAdd }) {
  const kind = result.action?.kind;
  const base = { fontSize: 12, marginTop: 10, marginBottom: 0, lineHeight: 1.5 };

  if (result.suggestCategory) {
    const { label, category, subcategoryId } = result.suggestCategory;
    return (
      <p style={{ ...base, color: 'var(--text-secondary)' }}>
        Isso é <strong style={{ color: 'var(--text-primary)' }}>{label}</strong>, do nicho{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[category]}</strong>.{' '}
        <button
          type="button"
          onClick={() => onAdd(subcategoryId)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--tzolkin-yellow)',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          adicionar esse nicho ao meu perfil →
        </button>
      </p>
    );
  }

  if (kind === 'LINKED_EXACT' || kind === 'LINKED_ALIAS' || kind === 'ABSORB_AS_ALIAS') {
    return (
      <p style={{ ...base, color: 'var(--text-secondary)' }}>
        Já existe na lista —{' '}
        <button
          type="button"
          onClick={() => onAdd(result.subcategoryId)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--tzolkin-yellow)',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          marcar no meu perfil →
        </button>
      </p>
    );
  }

  if (kind === 'CREATE_PENDING' || kind === 'CONFIRM_PENDING') {
    return (
      <p style={{ ...base, color: 'var(--text-tertiary)' }}>
        Registramos sua sugestão. Ela entra na lista quando outros profissionais
        descreverem a mesma coisa — é assim que o catálogo cresce sem virar bagunça.
      </p>
    );
  }

  if (kind === 'REJECT') {
    const reasons = {
      INVALID_LABEL: 'Descreva com um pouco mais de detalhe (3 a 60 caracteres).',
      ALREADY_REJECTED: 'Esse termo já foi avaliado e não entrou na lista.',
      TENANT_RATE_LIMIT: 'Muitas sugestões de uma vez. Tente novamente amanhã.',
      PENDING_CAP_REACHED: 'A fila de sugestões desse nicho está cheia no momento.',
      ACTIVE_CAP_REACHED: 'Esse nicho está com a lista cheia.',
    };
    return (
      <p style={{ ...base, color: 'var(--warning)' }}>
        {reasons[result.action.reason] ?? 'Não foi possível registrar agora.'}
      </p>
    );
  }

  return null;
}
