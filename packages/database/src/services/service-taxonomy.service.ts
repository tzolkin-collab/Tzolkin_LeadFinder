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
  /**
   * Teto duro de subcategorias utilizáveis por categoria.
   *
   * Subiu de 24 para 40 por decisão de produto: a meta declarada é COBERTURA
   * ("em algum momento todas as profissões vão ter sido cadastradas
   * corretamente"), não só contenção. 24 dava pouca folga — só
   * DESENVOLVIMENTO já tem site, landing page, loja, sistema, app, PWA, API,
   * manutenção, performance, migração, headless, marketplace, portal, intranet…
   *
   * Continua finito e continua caindo em prompt: 5 × 40 = 200 itens, ~1k
   * tokens. É justamente o teto que torna a lista consultável pela IA viável
   * (ver listTaxonomyForAI). Acompanhar folga por `taxonomyHealth()`.
   */
  MAX_ACTIVE_PER_CATEGORY: 40,
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
  /** Necessário para detecção entre nichos — ver EXISTS_IN_OTHER_CATEGORY. */
  category: ServiceCategory;
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
  /** Slug idêntico a uma ACTIVE no nicho pedido. */
  | { kind: 'LINKED_EXACT'; subcategoryId: string }
  /** Já registrado como alias de uma ACTIVE no nicho pedido. */
  | { kind: 'LINKED_ALIAS'; subcategoryId: string }
  /** Parecido o bastante: entra como alias, sem criar linha. */
  | { kind: 'ABSORB_AS_ALIAS'; subcategoryId: string; alias: string }
  /** Apontava para uma que foi absorvida — segue o ponteiro. */
  | { kind: 'FOLLOW_MERGE'; subcategoryId: string }
  /**
   * O serviço existe, mas em OUTRO nicho. Não cria nada: quem chamou deve
   * perguntar "isso é <label>, dentro de <categoria>. Quer adicionar esse
   * nicho ao seu perfil?".
   *
   * Sem isto o resolver tentava criar linha nova e batia na constraint
   * `slug @unique` (que é global, não por categoria) — erro de banco, não
   * duplicata silenciosa.
   */
  | {
      kind: 'EXISTS_IN_OTHER_CATEGORY';
      subcategoryId: string;
      category: ServiceCategory;
      label: string;
      matchedBy: 'SLUG' | 'ALIAS' | 'SIMILARITY';
    }
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
  /** Nicho em que o usuário está declarando o serviço. */
  targetCategory: ServiceCategory;
  /**
   * Subcategorias de TODAS as categorias. A varredura tem que ser global
   * porque `slug` é `@unique` no banco inteiro, não por categoria — comparar
   * só dentro do nicho pedido levava a tentar criar slug já existente e
   * estourar constraint.
   */
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
 *  2. match exato de slug (em QUALQUER nicho) — resolve o caso comum e evita
 *     colisão de constraint. Se o nicho não é o pedido, devolve
 *     EXISTS_IN_OTHER_CATEGORY em vez de criar.
 *  3. REJECTED antes de tudo o mais — é a garantia de convergência
 *  4. alias e similaridade DENTRO do nicho pedido
 *  5. alias e similaridade em OUTRO nicho → EXISTS_IN_OTHER_CATEGORY
 *  6. absorção vem ANTES do rate limit: absorver duplicata é bom e não cria
 *     linha, então não deve ser penalizado por quota
 *  7. rate limit e teto de PENDING só barram o que criaria linha, e os tetos
 *     contam só o nicho pedido
 *  8. teto de ACTIVE é checado na PROMOÇÃO, não na criação — por isso ACTIVE
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

  const inTarget = input.existing.filter((e) => e.category === input.targetCategory);
  const inOthers = input.existing.filter((e) => e.category !== input.targetCategory);

  // 2/3. Match exato de slug — global, porque o slug é único global.
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

    // Existe, mas noutro nicho: quem chamou tem que perguntar se o usuário
    // quer adicionar aquele nicho ao perfil. Nunca duplicar.
    if (exact.category !== input.targetCategory) {
      return {
        kind: 'EXISTS_IN_OTHER_CATEGORY',
        subcategoryId: exact.id,
        category: exact.category,
        label: exact.label,
        matchedBy: 'SLUG',
      };
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
    const activeInTarget = inTarget.filter((e) => e.status === 'ACTIVE').length;
    if (
      nextCount >= TAXONOMY_LIMITS.PROMOTION_CONFIRMATIONS &&
      activeInTarget < TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY
    ) {
      return { kind: 'PROMOTE', subcategoryId: exact.id };
    }
    return { kind: 'CONFIRM_PENDING', subcategoryId: exact.id, countsAsNewConfirmation: true };
  }

  // 4a. Alias conhecido dentro do nicho pedido.
  const aliasInTarget = inTarget.find(
    (e) => e.status === 'ACTIVE' && e.aliases.some((a) => normalizeSlug(a) === slug),
  );
  if (aliasInTarget) return { kind: 'LINKED_ALIAS', subcategoryId: aliasInTarget.id };

  // 4b. Similaridade dentro do nicho pedido → absorve como alias.
  const bestInTarget = bestMatch(inTarget, slug, label);
  if (bestInTarget && bestInTarget.score >= TAXONOMY_LIMITS.ABSORB_SIMILARITY) {
    return { kind: 'ABSORB_AS_ALIAS', subcategoryId: bestInTarget.entry.id, alias: label };
  }

  // 5. Não achou no nicho pedido — mas existe em outro? Perguntar, não criar.
  const aliasElsewhere = inOthers.find(
    (e) => e.status === 'ACTIVE' && e.aliases.some((a) => normalizeSlug(a) === slug),
  );
  if (aliasElsewhere) {
    return {
      kind: 'EXISTS_IN_OTHER_CATEGORY',
      subcategoryId: aliasElsewhere.id,
      category: aliasElsewhere.category,
      label: aliasElsewhere.label,
      matchedBy: 'ALIAS',
    };
  }

  const bestElsewhere = bestMatch(inOthers, slug, label);
  if (bestElsewhere && bestElsewhere.score >= TAXONOMY_LIMITS.ABSORB_SIMILARITY) {
    return {
      kind: 'EXISTS_IN_OTHER_CATEGORY',
      subcategoryId: bestElsewhere.entry.id,
      category: bestElsewhere.entry.category,
      label: bestElsewhere.entry.label,
      matchedBy: 'SIMILARITY',
    };
  }

  // 6/7. Daqui pra baixo criaria linha — só agora as quotas valem.
  if (input.tenantProposalsInWindow >= TAXONOMY_LIMITS.MAX_PROPOSALS_PER_TENANT_PER_WINDOW) {
    return { kind: 'REJECT', reason: 'TENANT_RATE_LIMIT' };
  }

  const pendingInTarget = inTarget.filter((e) => e.status === 'PENDING').length;
  if (pendingInTarget >= TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY) {
    return { kind: 'REJECT', reason: 'PENDING_CAP_REACHED' };
  }

  return { kind: 'CREATE_PENDING', slug, label };
}

function bestMatch(
  pool: ExistingSubcategory[],
  slug: string,
  label: string,
): { entry: ExistingSubcategory; score: number } | null {
  let best: { entry: ExistingSubcategory; score: number } | null = null;
  for (const e of pool) {
    if (e.status !== 'ACTIVE') continue;
    const score = Math.max(similarity(slug, e.slug), similarity(label, e.label));
    if (!best || score > best.score) best = { entry: e, score };
  }
  return best;
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
  /**
   * Preenchido só em EXISTS_IN_OTHER_CATEGORY. É o pedido que quem chamou deve
   * fazer ao usuário: "isso é <label>, do nicho <category>. Adicionar esse
   * nicho ao seu perfil?".
   */
  suggestCategory?: {
    category: ServiceCategory;
    subcategoryId: string;
    label: string;
    matchedBy: 'SLUG' | 'ALIAS' | 'SIMILARITY';
  };
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
  // Varredura GLOBAL, não por categoria: `slug` é @unique no banco inteiro, e
  // sem ver os outros nichos o resolver tentava criar slug já existente.
  // A tabela é limitada por construção (ver TAXONOMY_LIMITS), então carregar
  // tudo é barato — algumas centenas de linhas no pior caso.
  const existing = await prisma.serviceSubcategory.findMany({
    select: {
      id: true,
      category: true,
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
    targetCategory: input.category,
    existing,
    tenantProposalsInWindow,
  });

  switch (action.kind) {
    case 'LINKED_EXACT':
    case 'LINKED_ALIAS':
    case 'FOLLOW_MERGE':
      return { action, subcategoryId: action.subcategoryId, usable: true };

    case 'EXISTS_IN_OTHER_CATEGORY':
      // Não escreve nada. O serviço existe e é utilizável — só está noutro
      // nicho, e o usuário precisa aceitar adicionar esse nicho ao perfil.
      return {
        action,
        subcategoryId: action.subcategoryId,
        usable: false,
        suggestCategory: {
          category: action.category,
          subcategoryId: action.subcategoryId,
          label: action.label,
          matchedBy: action.matchedBy,
        },
      };

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

// ─── Lista consultável pela IA ────────────────────────────────────────────

export interface TaxonomyForAI {
  categories: Array<{
    category: ServiceCategory;
    subcategories: Array<{ id: string; label: string; aliases: string[] }>;
  }>;
  /** Total de itens — para o chamador saber o custo em token antes de mandar. */
  itemCount: number;
}

/**
 * Catálogo completo em forma consultável, para a IA escolher em vez de inventar.
 *
 * É o que resolve o buraco que a similaridade por trigrama não fecha: "mídia
 * paga" tem 0,17 de similaridade com "tráfego pago" e nunca seria absorvido por
 * string, mas um modelo lendo a lista acerta na hora.
 *
 * O teto por categoria é o que torna isto possível — a lista inteira é limitada
 * por construção (≤ 200 itens), então cabe em prompt sem paginação, sem RAG e
 * sem custo variável.
 *
 * ⚠️ A IA NUNCA escreve na taxonomia direto. Ela lê esta lista e devolve ou um
 * `id` existente, ou um termo novo que passa por `resolveServiceSubcategory`
 * como qualquer outra fonte — indo para quarentena e exigindo confirmação
 * independente. Mesmo princípio de "regra decide, LLM só redige".
 */
export async function listTaxonomyForAI(): Promise<TaxonomyForAI> {
  const rows = await prisma.serviceSubcategory.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, category: true, label: true, aliases: true },
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
  });

  const grouped = new Map<ServiceCategory, TaxonomyForAI['categories'][number]['subcategories']>();
  for (const r of rows) {
    const list = grouped.get(r.category) ?? [];
    list.push({ id: r.id, label: r.label, aliases: r.aliases });
    grouped.set(r.category, list);
  }

  return {
    categories: [...grouped.entries()].map(([category, subcategories]) => ({
      category,
      subcategories,
    })),
    itemCount: rows.length,
  };
}

/**
 * A mesma lista em texto compacto, pronta para prompt.
 *
 * Formato deliberadamente enxuto — um item por linha, aliases entre parênteses
 * — porque o modelo só precisa reconhecer, não navegar estrutura.
 */
export function formatTaxonomyForPrompt(taxonomy: TaxonomyForAI): string {
  return taxonomy.categories
    .map(({ category, subcategories }) => {
      const items = subcategories
        .map((s) => {
          const alias = s.aliases.length > 0 ? ` (${s.aliases.slice(0, 4).join(', ')})` : '';
          return `  - ${s.label}${alias} [${s.id}]`;
        })
        .join('\n');
      return `${category}:\n${items}`;
    })
    .join('\n\n');
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

// ─── Perfil de serviço do tenant (multi-nicho, multi-profissão) ───────────

export interface TenantServiceProfile {
  /** Profissões declaradas, com o nicho de cada uma. */
  services: Array<{
    subcategoryId: string;
    category: ServiceCategory;
    label: string;
    providerSpecialty: ProviderSpecialty | null;
  }>;
  /** Nichos distintos que o tenant atende. */
  categories: ServiceCategory[];
  /** Especialidades DERIVADAS — entrada do mapa de relevância. */
  specialties: ProviderSpecialty[];
  /**
   * Profissões declaradas cuja subcategoria não tem `providerSpecialty`
   * mapeado. O produto precisa dizer que não sabe o que mostrar para elas em
   * vez de escolher sinal no chute.
   */
  unmappedLabels: string[];
}

/**
 * Lê o perfil de serviço do tenant e deriva as especialidades.
 *
 * A relação é a fonte de verdade porque carrega nicho + profissão juntos.
 * `Tenant.specialties` é só cache para leitura rápida — quem precisa da
 * verdade chama aqui.
 */
export async function tenantServiceProfile(tenantId: string): Promise<TenantServiceProfile> {
  const rows = await prisma.tenantService.findMany({
    where: { tenantId },
    select: {
      subcategory: {
        select: { id: true, category: true, label: true, providerSpecialty: true },
      },
    },
  });

  const services = rows.map((r) => ({
    subcategoryId: r.subcategory.id,
    category: r.subcategory.category,
    label: r.subcategory.label,
    providerSpecialty: r.subcategory.providerSpecialty,
  }));

  const categories = [...new Set(services.map((s) => s.category))];
  const specialties = [
    ...new Set(
      services
        .map((s) => s.providerSpecialty)
        .filter((s): s is ProviderSpecialty => s !== null),
    ),
  ];
  const unmappedLabels = services.filter((s) => s.providerSpecialty === null).map((s) => s.label);

  return { services, categories, specialties, unmappedLabels };
}

/**
 * Define o conjunto de profissões do tenant e recalcula o cache de
 * especialidade numa transação — sem janela em que os dois discordem.
 *
 * Só aceita subcategoria ACTIVE: escolher algo em quarentena colocaria no
 * perfil um termo que ainda não passou por confirmação independente.
 */
export async function setTenantServices(
  tenantId: string,
  subcategoryIds: string[],
): Promise<TenantServiceProfile> {
  const valid = await prisma.serviceSubcategory.findMany({
    where: { id: { in: subcategoryIds }, status: 'ACTIVE' },
    select: { id: true, providerSpecialty: true },
  });

  const validIds = valid.map((v) => v.id);
  const derivedSpecialties = [
    ...new Set(
      valid.map((v) => v.providerSpecialty).filter((s): s is ProviderSpecialty => s !== null),
    ),
  ];

  await prisma.$transaction([
    prisma.tenantService.deleteMany({ where: { tenantId } }),
    ...validIds.map((subcategoryId) =>
      prisma.tenantService.create({ data: { tenantId, subcategoryId } }),
    ),
    prisma.tenant.update({
      where: { id: tenantId },
      data: { specialties: derivedSpecialties },
    }),
  ]);

  return tenantServiceProfile(tenantId);
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
