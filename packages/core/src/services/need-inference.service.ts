import type { SignalType } from '@tzolkin/database';

/**
 * Infere QUAL serviço um negócio-alvo precisa, a partir dos sinais observados.
 *
 * É a peça que faltava entre "achei o lead" e "esse lead é pra mim": sem ela o
 * produto sabia que um negócio não tem site, mas não sabia dizer de que
 * profissional ele precisa — nem se é o profissional que está olhando a tela.
 *
 * Função pura e baseada em regra, não em LLM. Motivo é o mesmo do resto do
 * projeto: relevância comercial precisa ser auditável ("por que esse lead
 * apareceu pra mim?") e barata. O LLM entra depois, para redigir a abordagem —
 * nunca para decidir se existe necessidade.
 */

/**
 * Como a necessidade foi detectada. A ordem aqui é ordem de força comercial,
 * e o produto usa isso para ranquear.
 */
export type NeedMechanism =
  /**
   * Gasta em A, mas falta B, e B é pré-requisito de A funcionar. O mais forte:
   * o orçamento já está comprovado e a lacuna é demonstrável.
   * Ex.: anuncia no Meta mas não tem landing page.
   */
  | 'INVESTIMENTO_COM_LACUNA'
  /**
   * O volume não cabe no canal atual. Forte quando existe, mas o vocabulário
   * de sinal cobre pouco disso hoje.
   */
  | 'SATURACAO'
  /**
   * Simplesmente não tem X. O mais fraco: não prova orçamento nem urgência,
   * mas é o mais abundante.
   */
  | 'AUSENCIA';

export interface NeedRule {
  id: string;
  /** Slug da subcategoria de serviço que o negócio precisa. */
  needsSubcategorySlug: string;
  mechanism: NeedMechanism;
  /** TODOS estes sinais precisam estar presentes. */
  requires: SignalType[];
  /** Se QUALQUER um destes estiver presente, a regra não se aplica. */
  absent?: SignalType[];
  /**
   * Frase que sustenta a necessidade, em voz de produto: número datado no
   * lugar de adjetivo. Nunca "alto potencial" — sempre o fato observado.
   */
  thesis: string;
}

/**
 * Regras de inferência.
 *
 * ⚠️ Cada `needsSubcategorySlug` tem que existir na semente da taxonomia
 * (`seedServiceTaxonomy`), senão a regra dispara e o matching não acha o
 * serviço. Há um teste que trava isso.
 */
export const NEED_RULES: NeedRule[] = [
  // ── Investimento com lacuna — o mais vendável ─────────────────────────
  {
    id: 'anuncia-sem-pagina-de-conversao',
    needsSubcategorySlug: 'landing-page',
    mechanism: 'INVESTIMENTO_COM_LACUNA',
    requires: ['COMECOU_A_ANUNCIAR', 'SEM_SITE'],
    thesis:
      'Começou a anunciar e não tem página de conversão — o tráfego pago cai direto no WhatsApp, sem captura.',
  },
  {
    id: 'escalou-criativos-sem-pagina',
    needsSubcategorySlug: 'landing-page',
    mechanism: 'INVESTIMENTO_COM_LACUNA',
    requires: ['AUMENTOU_CRIATIVOS', 'SEM_SITE'],
    thesis:
      'Aumentou o número de criativos sem ter página de conversão — mais verba entrando no mesmo funil sem medição.',
  },
  {
    id: 'anuncia-com-so-linktree',
    needsSubcategorySlug: 'landing-page',
    mechanism: 'INVESTIMENTO_COM_LACUNA',
    requires: ['COMECOU_A_ANUNCIAR', 'SO_LINKTREE'],
    thesis:
      'Anuncia mandando o tráfego para um Linktree — página de terceiro, sem controle de conversão nem pixel próprio.',
  },
  {
    id: 'parou-de-anunciar-sem-pagina',
    needsSubcategorySlug: 'trafego-pago',
    mechanism: 'INVESTIMENTO_COM_LACUNA',
    requires: ['PAROU_DE_ANUNCIAR', 'SEM_SITE'],
    thesis:
      'Parou de anunciar e não tem site — provável que a verba não tenha retornado, porque não havia onde converter.',
  },

  // ── Saturação ──────────────────────────────────────────────────────────
  {
    id: 'volume-de-avaliacoes-no-whatsapp',
    needsSubcategorySlug: 'chatbot-atendimento',
    mechanism: 'SATURACAO',
    requires: ['SALTO_DE_REVIEWS', 'WHATSAPP_COMERCIAL'],
    thesis:
      'Salto de avaliações com atendimento só por WhatsApp — volume crescendo em cima de canal manual.',
  },
  {
    id: 'anuncia-e-atende-no-whatsapp',
    needsSubcategorySlug: 'chatbot-atendimento',
    mechanism: 'SATURACAO',
    requires: ['COMECOU_A_ANUNCIAR', 'WHATSAPP_COMERCIAL'],
    thesis:
      'Anuncia e recebe tudo no WhatsApp — cada real de mídia vira mensagem para uma pessoa responder à mão.',
  },

  // ── Ausência ───────────────────────────────────────────────────────────
  {
    id: 'sem-site-nenhum',
    needsSubcategorySlug: 'site-institucional',
    mechanism: 'AUSENCIA',
    requires: ['SEM_SITE'],
    // Sem esta exclusão, todo lead "sem site" dispararia as duas regras e o
    // dossiê ficaria repetitivo. Quem anuncia é caso de landing page, acima.
    absent: ['COMECOU_A_ANUNCIAR', 'AUMENTOU_CRIATIVOS'],
    thesis: 'Não tem site próprio — nada aparece no Google fora do perfil do Maps.',
  },
  {
    id: 'site-fora-do-ar',
    needsSubcategorySlug: 'site-institucional',
    mechanism: 'AUSENCIA',
    requires: ['SITE_FORA_DO_AR'],
    thesis: 'O site cadastrado não responde — quem procura pela marca cai em página morta.',
  },
  {
    id: 'presenca-so-em-linktree',
    needsSubcategorySlug: 'site-institucional',
    mechanism: 'AUSENCIA',
    requires: ['SO_LINKTREE'],
    absent: ['COMECOU_A_ANUNCIAR'],
    thesis: 'A presença digital é um Linktree — nenhum domínio próprio.',
  },
  {
    id: 'negocio-recem-aberto',
    needsSubcategorySlug: 'identidade-visual',
    mechanism: 'AUSENCIA',
    requires: ['CNPJ_RECENTE'],
    // Única regra que serve DESIGN hoje. É honesta (CNPJ novo é fato público,
    // e negócio novo precisa de identidade), mas não substitui sinal visual
    // observado — ver a lacuna declarada em specialty-relevance.
    thesis: 'CNPJ aberto há pouco tempo — negócio em fase de montar a própria identidade.',
  },
  {
    id: 'nova-unidade-aberta',
    needsSubcategorySlug: 'identidade-visual',
    mechanism: 'AUSENCIA',
    requires: ['NOVA_UNIDADE'],
    thesis: 'Abriu unidade nova — momento de material e comunicação para o ponto novo.',
  },
  {
    id: 'reclamacao-publica-em-avaliacao',
    needsSubcategorySlug: 'posicionamento-de-marca',
    mechanism: 'AUSENCIA',
    requires: ['RECLAMACAO_EM_REVIEW'],
    thesis: 'Tem reclamação pública nas avaliações sem resposta estruturada.',
  },
  {
    id: 'instagram-ativo-sem-site',
    needsSubcategorySlug: 'social-media',
    mechanism: 'AUSENCIA',
    requires: ['INSTAGRAM_ATIVO', 'SEM_SITE'],
    thesis: 'Mantém o Instagram ativo e é o único canal — toda a operação depende de uma rede.',
  },
];

export interface InferredNeed {
  ruleId: string;
  needsSubcategorySlug: string;
  mechanism: NeedMechanism;
  thesis: string;
  /** Os sinais que sustentaram a inferência — a cadeia de evidência. */
  evidence: SignalType[];
}

/** Força relativa dos mecanismos, para ranquear. Maior é mais vendável. */
const MECHANISM_WEIGHT: Record<NeedMechanism, number> = {
  INVESTIMENTO_COM_LACUNA: 3,
  SATURACAO: 2,
  AUSENCIA: 1,
};

/**
 * Aplica as regras aos sinais de um negócio.
 *
 * Devolve lista vazia quando nenhum sinal casa — nunca um palpite. Um negócio
 * sem sinal relevante não é um negócio com "necessidade genérica", é um negócio
 * sobre o qual não sabemos nada ainda.
 */
export function inferNeeds(signals: SignalType[]): InferredNeed[] {
  const present = new Set(signals);
  const found: InferredNeed[] = [];

  for (const rule of NEED_RULES) {
    const hasAllRequired = rule.requires.every((s) => present.has(s));
    if (!hasAllRequired) continue;

    const blocked = (rule.absent ?? []).some((s) => present.has(s));
    if (blocked) continue;

    found.push({
      ruleId: rule.id,
      needsSubcategorySlug: rule.needsSubcategorySlug,
      mechanism: rule.mechanism,
      thesis: rule.thesis,
      evidence: rule.requires,
    });
  }

  return found.sort(
    (a, b) => MECHANISM_WEIGHT[b.mechanism] - MECHANISM_WEIGHT[a.mechanism],
  );
}

// ─── Casamento com o que o prestador vende ────────────────────────────────

export interface MatchInput {
  /** Sinais observados no negócio-alvo. */
  signals: SignalType[];
  /** Slugs das subcategorias que o prestador vende (perfil do tenant). */
  providerSubcategorySlugs: string[];
}

export interface MatchResult {
  /** Necessidades que o prestador ATENDE — o que justifica abordar. */
  matched: InferredNeed[];
  /**
   * Necessidades reais do negócio que este prestador NÃO vende. Não é lixo: é
   * o que permite dizer "esse lead precisa de X, que você não faz" em vez de
   * fingir encaixe, e no futuro alimenta indicação entre prestadores.
   */
  unmatched: InferredNeed[];
  /** Mecanismo mais forte entre os casados — base do ranking do feed. */
  strongestMechanism: NeedMechanism | null;
  /** true quando há necessidade, mas nenhuma que este prestador atenda. */
  needsOtherService: boolean;
}

/**
 * Cruza a necessidade inferida com a oferta do prestador.
 *
 * Sem perfil configurado (`providerSubcategorySlugs` vazio) devolve tudo como
 * não-casado, com `needsOtherService: false` — o produto não sabe o que o
 * usuário vende, então não pode afirmar encaixe nem descarte.
 */
export function matchNeedsToProvider(input: MatchInput): MatchResult {
  const needs = inferNeeds(input.signals);
  const sells = new Set(input.providerSubcategorySlugs);

  if (sells.size === 0) {
    return {
      matched: [],
      unmatched: needs,
      strongestMechanism: null,
      needsOtherService: false,
    };
  }

  const matched = needs.filter((n) => sells.has(n.needsSubcategorySlug));
  const unmatched = needs.filter((n) => !sells.has(n.needsSubcategorySlug));

  return {
    matched,
    unmatched,
    strongestMechanism: matched[0]?.mechanism ?? null,
    needsOtherService: matched.length === 0 && unmatched.length > 0,
  };
}
