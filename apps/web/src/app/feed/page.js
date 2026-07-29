'use client';

import { AppShell, PageHeader } from '../../components/shell/AppShell.js';
import { SignalRow, SignalRowList } from '../../components/signal/SignalRow.js';
import { HeroStat } from '../../components/market/HeroStat.js';
import { KeywordChip } from '../../components/market/KeywordChip.js';
import { PersonMention } from '../../components/market/PersonMention.js';

/**
 * Feed — a home do Tracer.
 *
 * Não tem campo de busca de propósito: a pergunta que esta tela responde não é
 * "quem tem esse perfil?" e sim "quem entrou no momento certo?". Enquanto o
 * coletor não acumular histórico, o estado vazio é a tela real — por isso ele
 * explica o porquê, com o mesmo traço que é a marca do produto, em vez de
 * um card genérico de "em breve".
 */
export default function FeedPage() {
  const hasSignals = false;

  return (
    <AppShell>
      <PageHeader title="O que mudou" meta="nenhum sinal ainda" />
      <div style={{ padding: '32px 24px', maxWidth: 860, margin: '0 auto' }}>
        {hasSignals ? null : <EmptyState />}
      </div>
    </AppShell>
  );
}

/**
 * Ordena os itens do feed. Hoje `context.lastSearch` é sempre `null` (não há
 * backend rastreando a última busca do tenant ainda) — a função só devolve a
 * ordem curada. Quando o backend expuser a última busca (categoria/cidade),
 * este é o único ponto que precisa mudar; nenhum componente é afetado.
 * Ver task de backend "rastrear última busca do tenant".
 */
function rankFeedItems(items, context) {
  if (!context?.lastSearch) return items;
  const { category, city } = context.lastSearch;
  return [...items].sort((a, b) => {
    const aMatch = a.category === category && a.city === city ? 1 : 0;
    const bMatch = b.category === category && b.city === city ? 1 : 0;
    return bMatch - aMatch;
  });
}

/**
 * Itens de exemplo, claramente marcados como tal (`isExample: true` em cada
 * um) — nunca fabricar atividade como se fosse real. Ritmo editorial:
 * linha de sinal como espinha, um momento de mercado a cada poucas linhas,
 * nunca agrupados. Cada momento de mercado termina em ação concreta, nunca
 * em número solto.
 */
const EXAMPLE_ITEMS = [
  { type: 'signal', category: 'estética', city: 'Contagem', props: {
    name: 'Studio Bella', fact: 'começou a anunciar · sem site', timestamp: daysAgo(0.3), isExample: true,
  } },
  { type: 'signal', category: 'barbearia', city: 'Belo Horizonte', props: {
    name: 'Barbearia Norte', fact: 'anuncia há 4 dias · sem site', timestamp: daysAgo(4), isExample: true,
  } },
  { type: 'signal', category: 'odontologia', city: 'Betim', props: {
    name: 'Odonto Vida', fact: 'publicou site · provavelmente perdido', timestamp: daysAgo(1), isExample: true,
  } },
  { type: 'hero', props: {
    value: '73%', caption: 'das barbearias em Contagem não têm site',
    actionLabel: 'ver as 22 barbearias', isExample: true,
  } },
  { type: 'signal', category: 'estética', city: 'Contagem', props: {
    name: 'Clínica Sul', fact: 'começou a anunciar há 2 dias', timestamp: daysAgo(2), isExample: true,
  } },
  { type: 'signal', category: 'academia', city: 'Contagem', props: {
    name: 'Fit90 Academia', fact: '+18 avaliações em 30 dias', timestamp: daysAgo(9), isExample: true,
  } },
  { type: 'signal', category: 'confeitaria', city: 'Belo Horizonte', props: {
    name: 'Doces da Vó', fact: 'instagram ativo · sem site', timestamp: daysAgo(12), isExample: true,
  } },
  { type: 'signal', category: 'oficina', city: 'Betim', props: {
    name: 'Auto Center Silva', fact: 'anuncia no Meta · sem site', timestamp: daysAgo(6), isExample: true,
  } },
  { type: 'keyword', props: {
    query: 'clínica odontológica Contagem', volume: 2400, competition: 'baixa', isExample: true,
  } },
  { type: 'signal', category: 'estética', city: 'Contagem', props: {
    name: 'Espaço Vida Fitness', fact: 'publicou site · provavelmente perdido', timestamp: daysAgo(1.2), isExample: true,
  } },
  { type: 'signal', category: 'salão', city: 'Betim', props: {
    name: 'Salão Beleza Rara', fact: 'CNPJ aberto há 45 dias · sem site', timestamp: daysAgo(18), isExample: true,
  } },
  { type: 'signal', category: 'pet shop', city: 'Contagem', props: {
    name: 'Pet Center Amigo', fact: 'whatsapp comercial · sem site', timestamp: daysAgo(25), isExample: true,
  } },
  { type: 'person', props: {
    initials: 'SM', headline: 'nova gerente de marketing',
    detail: 'na rede Sorriso+ há 12 dias · 4 unidades, nenhuma anuncia ainda', isExample: true,
  } },
];

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function EmptyState() {
  const items = rankFeedItems(EXAMPLE_ITEMS, { lastSearch: null });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <TraceExplainer />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            marginBottom: 10,
          }}
        >
          formato do feed, sem dado real ainda
        </span>
        <FeedItemList items={items} />
      </div>
    </div>
  );
}

function FeedItemList({ items }) {
  // Agrupa corridas consecutivas de sinal num único SignalRowList (pro
  // divisor de 1px funcionar entre elas), e intercala os momentos de mercado
  // soltos, sem moldura, entre esses grupos.
  const groups = [];
  let currentSignalGroup = [];

  for (const item of items) {
    if (item.type === 'signal') {
      currentSignalGroup.push(item);
      continue;
    }
    if (currentSignalGroup.length > 0) {
      groups.push({ type: 'signal-group', items: currentSignalGroup });
      currentSignalGroup = [];
    }
    groups.push(item);
  }
  if (currentSignalGroup.length > 0) {
    groups.push({ type: 'signal-group', items: currentSignalGroup });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map((group, i) => {
        if (group.type === 'signal-group') {
          return (
            <SignalRowList key={i}>
              {group.items.map((item, j) => (
                <SignalRow key={j} {...item.props} />
              ))}
            </SignalRowList>
          );
        }
        if (group.type === 'hero') return <HeroStat key={i} {...group.props} />;
        if (group.type === 'keyword') return <KeywordChip key={i} {...group.props} />;
        if (group.type === 'person') return <PersonMention key={i} {...group.props} />;
        return null;
      })}
    </div>
  );
}

/**
 * O traço, o mesmo primitivo da marca, redesenhado como diagrama. Uma linha
 * reta — "nada distingue este negócio de mil outros" — que só diverge na
 * segunda observação. É o conceito de Momento explicado pela própria forma da
 * lente, não por um parágrafo dentro de um card.
 */
function TraceExplainer() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 28, alignItems: 'center' }}>
      <svg
        viewBox="0 0 180 92"
        width="180"
        height="92"
        role="img"
        aria-label="Diagrama: uma linha reta até a segunda observação, quando diverge"
      >
        <line x1="8" y1="46" x2="76" y2="46" stroke="var(--border-secondary)" strokeWidth="2" />
        <circle cx="8" cy="46" r="3" fill="var(--text-tertiary)" />
        <circle cx="76" cy="46" r="3" fill="var(--text-tertiary)" />
        <path
          d="M76 46 C96 46 100 22 130 16"
          fill="none"
          stroke="var(--tzolkin-yellow)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="130" cy="16" r="3.5" fill="var(--tzolkin-yellow)" />
        <text x="8" y="66" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">
          1ª
        </text>
        <text x="66" y="66" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">
          2ª
        </text>
        <text x="112" y="12" fontSize="10" fill="var(--tzolkin-yellow)" fontFamily="var(--font-mono)">
          sinal
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
          O relógio ainda não começou a correr
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7, maxWidth: '52ch' }}>
          Sinal de momento — <em>&ldquo;começou a anunciar há 16 dias&rdquo;</em> — é a diferença entre
          duas observações do mesmo negócio. Na primeira, a linha é reta: nada distingue esse
          negócio de mil outros. Crie uma vigilância para o coletor começar a acumular.
        </p>
      </div>
    </div>
  );
}
