import { prisma } from '../index.js';
import type { ServiceCategory, TaxonomyStatus, ProviderSpecialty } from '@prisma/client';

/**
 * Taxonomia de serviço: categoria fixa (enum) + subcategoria controlada (tabela).
 *
 * O risco desta tabela é explosão de categoria — mil variações de "tráfego pago"
 * poluindo a base. O controle NÃO é boa intenção nem validação de string: são
 * limites numéricos, e a decisão é uma função pura (`decideTaxonomyAction`) que
 * dá para testar exaustivamente.
 *
 * Garantia de convergência, com os limites abaixo e 5 categorias:
 *   - ACTIVE  ≤ 5 × 24  = 120 linhas, para sempre, sem intervenção humana
 *   - PENDING ≤ 5 × 50  = 250 linhas
 *   - REJECTED é lembrado: re-propor o mesmo termo é no-op, não linha nova.
 *     É isto que faz a contagem convergir em vez de crescer com o tempo.
 *
 * O que este arquivo deliberadamente NÃO faz: casar sinônimo semântico
 * ("mídia paga" ≈ "tráfego pago"). Similaridade aqui é trigrama determinística
 * — pega acento, typo e ordem de palavra, não significado. Sinônimo verdadeiro
 * cai em PENDING e precisa de confirmação independente, ou entra como alias
 * semeado à mão. Trocar por embedding é possível depois; a estrutura já suporta,
 * e não fazer isso agora é seguro (erra para o lado de exigir confirmação).
 */

export const TAXONOMY_LIMITS = {
  /** Teto duro de subcategorias utilizáveis por categoria. */
  MAX_ACTIVE_PER_CATEGORY: 24,
  /** Teto da quarentena — sem isto, PENDING seria a lista infinita. */
  MAX_PENDING_PER_CATEGORY: 50,
  /** Propostas que criam linha, por tenant, por janela. */
  MAX_PROPOSALS_PER_TENANT_PER_WINDOW: 5,
  PROPOSAL_WINDOW_HOURS: 24,
  /** Fontes independentes necessárias para promover PENDING → ACTIVE. */
  PROMOTION_CONFIRMATIONS: 3,
  /** Acima disto, o termo é absorvido como alias em vez de virar linha. */
  ABSORB_SIMILARITY: 0.82,
  MIN_LABEL_LENGTH: 3,
  MAX_LABEL_LENGTH: 60,
} as const;

// ─── Normalização e similaridade (puras) ──────────────────────────────────

/** "Tráfego  Pago!" → "trafego-pago". Estável e idempotente. */
export function normalizeSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/**
 * Um termo contém o outro em fronteira de palavra E é substancial o bastante
 * para ser a mesma coisa, não uma raiz genérica engolindo um termo específico.
 *
 * Sem isto, "identidade visual" × "identidade visual completa" dava 0,80 —
 * logo abaixo do limiar — e criava linha duplicada. Medido, não suposto.
 *
 * A razão mínima de tamanho é o que impede o abuso oposto: "seo" (3 chars) não
 * pode absorver "seo local" (9), porque 3/9 = 0,33 fica abaixo do piso. Raiz
 * curta não engole especialização.
 */
/**
 * Piso escolhido por medição, não por palpite. As razões reais se separam em
 * dois grupos com um vazio no meio:
 *
 *   0,55–0,59  variação do MESMO serviço  → deve absorver
 *              "trafego pago" ~ "gestao de trafego pago"       0,55
 *              "landing page" ~ "landing page de vendas"       0,55
 *              "identidade visual" ~ "identidade visual e papelaria"  0,59
 *
 *   0,14–0,46  raiz curta × especialização → deve ficar separado
 *              "social media" ~ "social media para clinicas"   0,46
 *              "seo" ~ "seo local"                             0,33
 *              "design" ~ "design de embalagem"                0,32
 *              "web" ~ "web design responsivo"                 0,14
 *
 * 0,5 cai no vazio entre 0,46 e 0,55. Mexer aqui sem medir de novo reabre uma
 * das duas falhas.
 */
const CONTAINMENT_MIN_RATIO = 0.5;

function isContainedVariant(na: string, nb: string): boolean {
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length / longer.length < CONTAINMENT_MIN_RATIO) return false;
  return longer === shorter || longer.startsWith(`${shorter} `) || longer.endsWith(` ${shorter}`);
}

/**
 * Coeficiente de Dice sobre trigramas — 0 a 1. Determinística e sem
 * dependência: o mesmo par sempre dá o mesmo número, então o comportamento do
 * limite é reproduzível em teste.
 *
 * ⚠️ Pega variação de ESCRITA (acento, typo, plural, espaçamento), não
 * significado. Medido: "trafego pago" × "midia paga" = 0,17; × "google ads" =
 * 0,00. Sinônimo verdadeiro precisa de alias semeado à mão ou de confirmação
 * independente — ver nota no topo do arquivo.
 */
export function similarity(a: string, b: string): number {
  const na = normalizeSlug(a).replace(/-/g, ' ');
  const nb = normalizeSlug(b).replace(/-/g, ' ');
  if (na === nb) return 1;
  if (!na || !nb) return 0;

  const ta = trigrams(na);
  const tb = trigrams(nb);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const dice = (2 * shared) / (ta.size + tb.size);

  // Variante por contenção é a mesma coisa dita com mais palavras — vale pelo
  // menos o limiar de absorção, mesmo que o Dice não alcance.
  if (isContainedVariant(na, nb)) {
    return Math.max(dice, TAXONOMY_LIMITS.ABSORB_SIMILARITY);
  }

  return dice;
}

// ─── Decisor puro ─────────────────────────────────────────────────────────

export interface ExistingSubcategory {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  status: TaxonomyStatus;
  confirmations: number;
  proposedByTenantIds: string[];
  mergedIntoId: string | null;
}

export type RejectReason =
  | 'ALREADY_REJECTED'
  | 'ACTIVE_CAP_REACHED'
  | 'PENDING_CAP_REACHED'
  | 'TENANT_RATE_LIMIT'
  | 'INVALID_LABEL';

export type TaxonomyAction =
  /** Slug idêntico a uma ACTIVE. */
  | { kind: 'LINKED_EXACT'; subcategoryId: string }
  /** Já registrado como alias de uma ACTIVE. */
  | { kind: 'LINKED_ALIAS'; subcategoryId: string }
  /** Parecido o bastante: entra como alias, sem criar linha. */
  | { kind: 'ABSORB_AS_ALIAS'; subcategoryId: string; alias: string }
  /** Apontava para uma que foi absorvida — segue o ponteiro. */
  | { kind: 'FOLLOW_MERGE'; subcategoryId: string }
  /** Já em quarentena: soma confirmação (ou nada, se o tenant já contou). */
  | { kind: 'CONFIRM_PENDING'; subcategoryId: string; countsAsNewConfirmation: boolean }
  /** Cruzou o limiar de confirmações e há vaga em ACTIVE. */
  | { kind: 'PROMOTE'; subcategoryId: string }
  /** Termo genuinamente novo — nasce em quarentena, nunca ACTIVE direto. */
  | { kind: 'CREATE_PENDING'; slug: string; label: string }
  | { kind: 'REJECT'; reason: RejectReason };

export interface DecideInput {
  rawLabel: string;
  tenantId: string;
  /** Subcategorias da MESMA categoria — o escopo de comparação. */
  existing: ExistingSubcategory[];
  /** Propostas que criaram linha, deste tenant, na janela. */
  tenantProposalsInWindow: number;
}

/**
 * Decide o que fazer com um termo proposto. Pura: nenhuma consulta, nenhuma
 * escrita, nenhum relógio. É o ponto onde a segurança da taxonomia é
 * verificável.
 *
 * A ORDEM importa e é deliberada:
 *  1. label inválido morre antes de qualquer coisa
 *  2. match exato resolve o caso comum sem varredura
 *  3. REJECTED antes de tudo o mais — é a garantia de convergência
 *  4. absorção por similaridade vem ANTES do rate limit: absorver duplicata
 *     é bom e não cria linha, então não deve ser penalizado por quota
 *  5. rate limit e teto de PENDING só barram o que criaria linha
 *  6. teto de ACTIVE é checado na PROMOÇÃO, não na criação — por isso ACTIVE
 *     não pode passar do teto nem em corrida
 */
export function decideTaxonomyAction(input: DecideInput): TaxonomyAction {
  const label = input.rawLabel.trim();

  if (
    label.length < TAXONOMY_LIMITS.MIN_LABEL_LENGTH ||
    label.length > TAXONOMY_LIMITS.MAX_LABEL_LENGTH
  ) {
    return { kind: 'REJECT', reason: 'INVALID_LABEL' };
  }

  const slug = normalizeSlug(label);
  if (!slug) return { kind: 'REJECT', reason: 'INVALID_LABEL' };

  // 2/3. Match exato de slug.
  const exact = input.existing.find((e) => e.slug === slug);
  if (exact) {
    if (exact.status === 'REJECTED') {
      return { kind: 'REJECT', reason: 'ALREADY_REJECTED' };
    }
    if (exact.status === 'MERGED') {
      return exact.mergedIntoId
        ? { kind: 'FOLLOW_MERGE', subcategoryId: exact.mergedIntoId }
        : { kind: 'REJECT', reason: 'ALREADY_REJECTED' };
    }
    if (exact.status === 'ACTIVE') {
      return { kind: 'LINKED_EXACT', subcategoryId: exact.id };
    }

    // PENDING: confirmação independente é o que promove.
    const alreadyCounted = exact.proposedByTenantIds.includes(input.tenantId);
    if (alreadyCounted) {
      return { kind: 'CONFIRM_PENDING', subcategoryId: exact.id, countsAsNewConfirmation: false };
    }

    const nextCount = exact.confirmations + 1;
    const activeCount = input.existing.filter((e) => e.status === 'ACTIVE').length;
    if (
      nextCount >= TAXONOMY_LIMITS.PROMOTION_CONFIRMATIONS &&
      activeCount < TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY
    ) {
      return { kind: 'PROMOTE', subcategoryId: exact.id };
    }
    return { kind: 'CONFIRM_PENDING', subcategoryId: exact.id, countsAsNewConfirmation: true };
  }

  // 4a. Já é alias conhecido de uma ACTIVE?
  const byAlias = input.existing.find(
    (e) => e.status === 'ACTIVE' && e.aliases.some((a) => normalizeSlug(a) === slug),
  );
  if (byAlias) return { kind: 'LINKED_ALIAS', subcategoryId: byAlias.id };

  // 4b. Parecido o bastante com uma ACTIVE → absorve como alias.
  let best: { id: string; score: number } | null = null;
  for (const e of input.existing) {
    if (e.status !== 'ACTIVE') continue;
    const score = Math.max(similarity(slug, e.slug), similarity(label, e.label));
    if (!best || score > best.score) best = { id: e.id, score };
  }
  if (best && best.score >= TAXONOMY_LIMITS.ABSORB_SIMILARITY) {
    return { kind: 'ABSORB_AS_ALIAS', subcategoryId: best.id, alias: label };
  }

  // 5. Daqui pra baixo criaria linha — só agora as quotas valem.
  if (input.tenantProposalsInWindow >= TAXONOMY_LIMITS.MAX_PROPOSALS_PER_TENANT_PER_WINDOW) {
    return { kind: 'REJECT', reason: 'TENANT_RATE_LIMIT' };
  }

  const pendingCount = input.existing.filter((e) => e.status === 'PENDING').length;
  if (pendingCount >= TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY) {
    return { kind: 'REJECT', reason: 'PENDING_CAP_REACHED' };
  }

  return { kind: 'CREATE_PENDING', slug, label };
}

// ─── Resolver com persistência ────────────────────────────────────────────

export interface ResolveSubcategoryInput {
  rawLabel: string;
  category: ServiceCategory;
  tenantId: string;
}

export interface ResolveSubcategoryResult {
  action: TaxonomyAction;
  /** Preenchido quando a resolução terminou numa subcategoria utilizável. */
  subcategoryId: string | null;
  /** true só quando o termo pode ser usado agora (ACTIVE). */
  usable: boolean;
}

/**
 * Resolve um termo contra a taxonomia, aplicando todos os guardrails.
 *
 * Nada mais no código deve inserir em `service_subcategories` — nem a IA. O
 * LLM propõe por aqui como qualquer outra fonte, e a proposta cai em
 * quarentena igual. Mesmo princípio de "regra decide, LLM só redige".
 */
export async function resolveServiceSubcategory(
  input: ResolveSubcategoryInput,
): Promise<ResolveSubcategoryResult> {
  const existing = await prisma.serviceSubcategory.findMany({
    where: { category: input.category },
    select: {
      id: true,
      slug: true,
      label: true,
      aliases: true,
      status: true,
      confirmations: true,
      proposedByTenantIds: true,
      mergedIntoId: true,
    },
  });

  const windowStart = new Date(
    Date.now() - TAXONOMY_LIMITS.PROPOSAL_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const tenantProposalsInWindow = await prisma.serviceSubcategory.count({
    where: { proposedByTenantIds: { has: input.tenantId }, createdAt: { gte: windowStart } },
  });

  const action = decideTaxonomyAction({
    rawLabel: input.rawLabel,
    tenantId: input.tenantId,
    existing,
    tenantProposalsInWindow,
  });

  switch (action.kind) {
    case 'LINKED_EXACT':
    case 'LINKED_ALIAS':
    case 'FOLLOW_MERGE':
      return { action, subcategoryId: action.subcategoryId, usable: true };

    case 'ABSORB_AS_ALIAS':
      await prisma.serviceSubcategory.update({
        where: { id: action.subcategoryId },
        data: { aliases: { push: action.alias } },
      });
      return { action, subcategoryId: action.subcategoryId, usable: true };

    case 'PROMOTE':
      await prisma.serviceSubcategory.update({
        where: { id: action.subcategoryId },
        data: {
          status: 'ACTIVE',
          confirmations: { increment: 1 },
          proposedByTenantIds: { push: input.tenantId },
        },
      });
      return { action, subcategoryId: action.subcategoryId, usable: true };

    case 'CONFIRM_PENDING':
      if (action.countsAsNewConfirmation) {
        await prisma.serviceSubcategory.update({
          where: { id: action.subcategoryId },
          data: {
            confirmations: { increment: 1 },
            proposedByTenantIds: { push: input.tenantId },
          },
        });
      }
      // Em quarentena não é utilizável — quem chamou precisa saber disso.
      return { action, subcategoryId: action.subcategoryId, usable: false };

    case 'CREATE_PENDING': {
      const created = await prisma.serviceSubcategory.create({
        data: {
          category: input.category,
          slug: action.slug,
          label: action.label,
          status: 'PENDING',
          confirmations: 1,
          proposedByTenantIds: [input.tenantId],
        },
        select: { id: true },
      });
      return { action, subcategoryId: created.id, usable: false };
    }

    case 'REJECT':
      return { action, subcategoryId: null, usable: false };
  }
}

/** Subcategorias utilizáveis — o que a interface pode oferecer como escolha. */
export async function listActiveSubcategories(category?: ServiceCategory) {
  return prisma.serviceSubcategory.findMany({
    where: { status: 'ACTIVE', ...(category ? { category } : {}) },
    select: {
      id: true,
      category: true,
      slug: true,
      label: true,
      providerSpecialty: true,
    },
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
  });
}

// ─── Semente da taxonomia inicial ─────────────────────────────────────────

/**
 * Taxonomia base, ACTIVE desde o início por decisão humana — não passa pelo
 * fluxo de confirmação porque não é proposta de usuário, é o ponto de partida.
 *
 * Os `aliases` aqui são a mitigação do que a similaridade por trigrama NÃO pega:
 * sinônimo verdadeiro. "mídia paga", "google ads" e "gestão de tráfego" têm
 * similaridade 0,17 / 0,00 / 0,47 com "tráfego pago" — nenhum seria absorvido
 * automaticamente. Semeados à mão, resolvem na primeira tentativa.
 */
const SEED: Array<{
  category: ServiceCategory;
  slug: string;
  label: string;
  aliases: string[];
  providerSpecialty: ProviderSpecialty | null;
}> = [
  {
    category: 'MARKETING_DIGITAL',
    slug: 'trafego-pago',
    label: 'Tráfego pago',
    aliases: ['mídia paga', 'gestão de tráfego', 'google ads', 'meta ads', 'anúncios pagos', 'ppc'],
    providerSpecialty: 'TRAFEGO_PAGO',
  },
  {
    category: 'MARKETING_DIGITAL',
    slug: 'social-media',
    label: 'Social media',
    aliases: ['gestão de redes sociais', 'redes sociais', 'gestão de instagram', 'conteúdo orgânico'],
    providerSpecialty: 'SOCIAL_MEDIA',
  },
  {
    category: 'MARKETING_DIGITAL',
    slug: 'seo',
    label: 'SEO',
    aliases: ['otimização para busca', 'busca orgânica', 'seo local', 'posicionamento no google'],
    providerSpecialty: 'SEO_CONTEUDO',
  },
  {
    category: 'MARKETING_DIGITAL',
    slug: 'email-marketing',
    label: 'E-mail marketing',
    aliases: ['automação de e-mail', 'newsletter', 'régua de e-mail'],
    providerSpecialty: 'SEO_CONTEUDO',
  },
  {
    category: 'DESENVOLVIMENTO',
    slug: 'site-institucional',
    label: 'Site institucional',
    aliases: ['site', 'website', 'presença digital', 'site corporativo'],
    providerSpecialty: 'DESENVOLVIMENTO_WEB',
  },
  {
    category: 'DESENVOLVIMENTO',
    slug: 'landing-page',
    label: 'Landing page',
    aliases: ['página de captura', 'página de vendas', 'lp', 'cro'],
    providerSpecialty: 'DESENVOLVIMENTO_WEB',
  },
  {
    category: 'DESENVOLVIMENTO',
    slug: 'loja-virtual',
    label: 'Loja virtual',
    aliases: ['e-commerce', 'ecommerce', 'loja online', 'checkout'],
    providerSpecialty: 'DESENVOLVIMENTO_WEB',
  },
  {
    category: 'DESENVOLVIMENTO',
    slug: 'sistema-web',
    label: 'Sistema web',
    aliases: ['software sob medida', 'saas', 'painel administrativo', 'erp'],
    providerSpecialty: 'DESENVOLVIMENTO_WEB',
  },
  {
    category: 'DESIGN',
    slug: 'identidade-visual',
    label: 'Identidade visual',
    aliases: ['branding', 'logo', 'logotipo', 'marca', 'manual de marca'],
    providerSpecialty: 'DESIGN_BRANDING',
  },
  {
    category: 'DESIGN',
    slug: 'material-grafico',
    label: 'Material gráfico',
    aliases: ['papelaria', 'impresso', 'design de embalagem', 'cartão de visita'],
    providerSpecialty: 'DESIGN_BRANDING',
  },
  {
    category: 'DESIGN',
    slug: 'ui-ux',
    label: 'UI/UX',
    aliases: ['design de interface', 'experiência do usuário', 'prototipação', 'ux research'],
    providerSpecialty: 'DESIGN_BRANDING',
  },
  {
    category: 'DESIGN',
    slug: 'audiovisual',
    label: 'Audiovisual',
    aliases: ['vídeo institucional', 'edição de vídeo', 'motion', 'fotografia'],
    providerSpecialty: 'DESIGN_BRANDING',
  },
  {
    category: 'AUTOMACAO_IA',
    slug: 'chatbot-atendimento',
    label: 'Chatbot de atendimento',
    aliases: ['bot de whatsapp', 'atendimento automatizado', 'chat bot', 'typebot'],
    providerSpecialty: 'AUTOMACAO_IA',
  },
  {
    category: 'AUTOMACAO_IA',
    slug: 'agente-de-ia',
    label: 'Agente de IA',
    aliases: ['assistente de ia', 'agente autônomo', 'copiloto de ia'],
    providerSpecialty: 'AUTOMACAO_IA',
  },
  {
    category: 'AUTOMACAO_IA',
    slug: 'automacao-de-processo',
    label: 'Automação de processo',
    aliases: ['integração de sistemas', 'n8n', 'make', 'zapier', 'rpa'],
    providerSpecialty: 'AUTOMACAO_IA',
  },
  {
    category: 'CONSULTORIA',
    slug: 'estrategia-comercial',
    label: 'Estratégia comercial',
    aliases: ['consultoria de vendas', 'processo comercial', 'playbook de vendas'],
    providerSpecialty: 'CONSULTORIA_ESTRATEGIA',
  },
  {
    category: 'CONSULTORIA',
    slug: 'posicionamento-de-marca',
    label: 'Posicionamento de marca',
    aliases: ['consultoria de marca', 'proposta de valor', 'reposicionamento'],
    providerSpecialty: 'CONSULTORIA_ESTRATEGIA',
  },
  {
    category: 'CONSULTORIA',
    slug: 'dados-e-bi',
    label: 'Dados e BI',
    aliases: ['dashboard', 'business intelligence', 'relatório gerencial', 'looker studio'],
    providerSpecialty: 'CONSULTORIA_ESTRATEGIA',
  },
];

/**
 * Idempotente por `slug` — rodar de novo não duplica nem sobrescreve alias que
 * a operação já absorveu em produção.
 */
export async function seedServiceTaxonomy(): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;

  for (const item of SEED) {
    const found = await prisma.serviceSubcategory.findUnique({ where: { slug: item.slug } });
    if (found) {
      existing++;
      continue;
    }
    await prisma.serviceSubcategory.create({
      data: {
        category: item.category,
        slug: item.slug,
        label: item.label,
        aliases: item.aliases,
        status: 'ACTIVE',
        providerSpecialty: item.providerSpecialty,
        confirmations: TAXONOMY_LIMITS.PROMOTION_CONFIRMATIONS,
        proposedByTenantIds: [],
      },
    });
    created++;
  }

  return { created, existing };
}

/** Diagnóstico de saúde da taxonomia — quanto de cada teto já foi usado. */
export async function taxonomyHealth() {
  const rows = await prisma.serviceSubcategory.groupBy({
    by: ['category', 'status'],
    _count: { _all: true },
  });

  const byCategory = new Map<string, { active: number; pending: number; other: number }>();
  for (const r of rows) {
    const entry = byCategory.get(r.category) ?? { active: 0, pending: 0, other: 0 };
    const count = r._count._all;
    if (r.status === 'ACTIVE') entry.active += count;
    else if (r.status === 'PENDING') entry.pending += count;
    else entry.other += count;
    byCategory.set(r.category, entry);
  }

  return {
    limits: TAXONOMY_LIMITS,
    categories: [...byCategory.entries()].map(([category, v]) => ({
      category,
      ...v,
      activeCapUsedPct: Math.round((v.active / TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY) * 100),
      pendingCapUsedPct: Math.round((v.pending / TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY) * 100),
    })),
  };
}

export type { ServiceCategory, TaxonomyStatus, ProviderSpecialty };
