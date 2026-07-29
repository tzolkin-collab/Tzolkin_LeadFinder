'use client';

import { AppShell, PageHeader } from '../../components/shell/AppShell.js';
import { SignalRow, SignalRowList } from '../../components/signal/SignalRow.js';
import { HeroStat } from '../../components/market/HeroStat.js';
import { KeywordChip } from '../../components/market/KeywordChip.js';
import { PersonMention } from '../../components/market/PersonMention.js';
import { MostContractedServicesWidget } from '../../components/market/MostContractedServicesWidget.js';
import { MarketArticleCard } from '../../components/market/MarketArticleCard.js';

/**
 * Feed — a home do Tracer.
 */
export default function FeedPage() {
  const hasSignals = false;

  return (
    <AppShell>
      <PageHeader title="O que mudou" meta="nenhum sinal ainda" />
      <div style={{ padding: '32px 24px', maxWidth: 860, margin: '0 auto' }}>
        {/* Demanda B2B Brasil — Widget Tipográfico Minimalista com Gráficos SVG */}
        <MostContractedServicesWidget isExample={true} />

        {hasSignals ? null : <EmptyState />}
      </div>
    </AppShell>
  );
}

function rankFeedItems(items, context) {
  if (!context?.lastSearch) return items;
  const { category, city } = context.lastSearch;
  return [...items].sort((a, b) => {
    const aMatch = a.category === category && a.city === city ? 1 : 0;
    const bMatch = b.category === category && b.city === city ? 1 : 0;
    return bMatch - aMatch;
  });
}

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
    value: '73%', caption: 'das clínicas em Contagem e BH não têm site próprio',
    actionLabel: 'ver as 22 clínicas mapeadas', isExample: true,
  } },
  { type: 'signal', category: 'estética', city: 'Contagem', props: {
    name: 'Clínica Sul', fact: 'começou a anunciar há 2 dias', timestamp: daysAgo(2), isExample: true,
  } },
  { type: 'article', props: {
    title: 'Dossiê Odontologia B2B: 73% das clínicas sem site estão perdendo clientes para anúncios no Meta Ads',
    tag: 'Odontologia · SP/MG', author: 'Cérebro Global Tracer', readTime: '5 min de leitura', date: '29/07/2026',
    summary: 'Mapeamento observacional de 1.200 clínicas odontológicas no Sudeste revela que a maior taxa de conversão em prospecção ativa não vem de vender "redesign de site", mas de estancar o vazamento de tráfego pago direto no WhatsApp.',
    markdownContent: `# Dossiê Odontologia B2B: Estudo de Mercado & Inteligência de Pitches

Estudo de inteligência comercial baseado no mapeamento observacional de **1.200+ clínicas odontológicas** nos estados de São Paulo e Minas Gerais.

---

### 1. Diagnóstico do Mercado de Odontologia no Brasil
- **73% das clínicas locais** que veiculam anúncios ativos no Meta Ads ou Google Ads **não possuem uma landing page própria de conversão**.
- Redirecionam 100% dos cliques diretamente para o aplicativo do WhatsApp da recepção sem filtro ou triagem prévia.
- **Consequência direta**: Secretárias e recepções sobrecarregadas com **leads desqualificados e curiosos**, reduzindo a conversão de consultas agendadas para menos de 4%.

---

### 2. Roupagem Sugerida da Oferta
Evite termos desgastados como *"criação de sites"* ou *"gestão de tráfego"*. A roupagem com **maior taxa de aceite comprovada (8.7%)** é:

> **"Implantação do Sistema de Triagem & Agendamento Direto de Pacientes"**

---

### 3. Transposição de Gatekeeper (Recepção / Secretária)
Para atravessar a secretária e fazer a mensagem chegar ao sócio responsável pela clínica:

- **Abordagem recomendada**: *Utilizar o tom de parecer técnico sobre os anúncios ativos.*
- **Script de Transposição**:
  *Olá, bom dia! Por favor, quem é o responsável pela gestão dos anúncios de tráfego da clínica? Notamos um erro no direcionamento do link ativo no Instagram que está gerando desperdício de verba. Preciso encaminhar o alerta técnico.*

---

### 4. Modelo de Pitch Campeão para o WhatsApp do Decisor

- **Tamanho Ideal**: 62 palavras (leitura rápida em dispositivos móveis).
- **Taxa de Resposta Média no BR**: **8.7%**

*Olá, Doutor! Vi que a clínica está com campanhas ativas no Instagram este mês. Parabéns pelo movimento.*

*Porém, notamos que os anúncios enviam os pacientes direto para a recepção sem página de agendamento. Isso faz a secretária perder tempo com curiosos.*

*Gravamos um teste de 2 minutos mostrando como instalar a triagem antes do WhatsApp. Posso te enviar o link?*

---

### 5. Quebra Antecipada de Objeções

#### Objeção 1: 'Já temos agência de marketing'
- **Contorno**: *Perfeito! Nosso trabalho não substitui sua agência. Nós instalamos a camada de conversão no destino do anúncio que faz o investimento da sua agência render o dobro de avaliações presenciais.*

#### Objeção 2: 'Não temos tempo para reuniões'
- **Contorno**: *Sem problemas! Não precisa de reunião agora. Posso enviar um vídeo de 90 segundos gravado diretamente no link de vocês. Se fizer sentido, conversamos.*

---

### 6. Fontes Bibliográficas & Referências da Internet
- [Conselho Federal de Odontologia - Dados Demográficos do Setor](https://website.cfo.org.br/)
- [Biblioteca de Anúncios do Meta Ads - Mapeamento Brasil](https://www.facebook.com/ads/library/)
- [Sebrae - Panorama de Clínicas de Saúde e Serviços Locais](https://sebrae.com.br/)
- [Brasil API - Dados Públicos de CNPJ e Sócios QSA](https://brasilapi.com.br/)
`,
  } },
  { type: 'signal', category: 'academia', city: 'Contagem', props: {
    name: 'Fit90 Academia', fact: '+18 avaliações em 30 dias', timestamp: daysAgo(9), isExample: true,
  } },
  { type: 'signal', category: 'confeitaria', city: 'Belo Horizonte', props: {
    name: 'Doces da Vó', fact: 'instagram ativo · sem site', timestamp: daysAgo(12), isExample: true,
  } },
  { type: 'article', props: {
    title: 'Dossiê Estética & Harmonização: Como páginas de portfólio visual aumentam em 2.5x a conversão no WhatsApp',
    tag: 'Estética · BR', author: 'Cérebro Global Tracer', readTime: '4 min de leitura', date: '28/07/2026',
    summary: 'Análise de conversão em 800+ clínicas de harmonização facial e corporal demonstra que pacientes de alto valor exigem autoridade e prova visual antes de agendar.',
    markdownContent: `# Dossiê Estética & Harmonização: Conversão de Pacientes de Alto Valor

Análise de dados de prospecção cobrindo **800+ clínicas de harmonização facial, corporal e dermatologia**.

---

### 1. Comportamento do Consumidor de Estética
- Pacientes de procedimentos estéticos (botox, preenchimento, bioestimuladores) **não compram por menor preço**; compram por **segurança, higienização e autoridade visual**.
- Clínicas que dependem apenas de enviar fotos no privado do WhatsApp perdem 60% das interessadas por falta de um portfólio estruturado.

---

### 2. Roupagem da Oferta
> **"Galeria Privada de Resultados & Guia de Experiência do Paciente"**

---

### 3. Script de Abordagem Direta para Estética
*Olá! Acompanho o trabalho da clínica e a qualidade dos procedimentos.*

*Notamos que suas pacientes precisam solicitar fotos de antes/depois diretamente no WhatsApp. Estruturamos uma galeria privada e interativa para o link da bio que apresenta os casos clínicos em alta velocidade.*

*Posso enviar uma prévia de como ficaria a vitrine da clínica?*
`,
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
          dossiês de mercado & formato do feed
        </span>
        <FeedItemList items={items} />
      </div>
    </div>
  );
}

function FeedItemList({ items }) {
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
        if (group.type === 'article') return <MarketArticleCard key={i} {...group.props} />;
        return null;
      })}
    </div>
  );
}

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
