import type { ProviderSpecialty, SignalType } from '@tzolkin/database';

/**
 * Traduz "o que o usuário faz" em "que sinal importa pra ele".
 *
 * Era o buraco central do produto: o Tracer nunca perguntou quem é o usuário,
 * então mostrava o mesmo `SEM_SITE` pra todo mundo — inútil pra um designer,
 * pra quem "não tem site" não é dor vendável. Ver ADR de perfil de usuário.
 *
 * Função pura de propósito: nenhuma consulta a banco, nenhuma chamada de IA.
 * Relevância é regra auditável — a mesma razão pela qual o diagnóstico é regra
 * e o LLM só redige.
 */

/** Peso de um sinal para uma especialidade. */
export type RelevanceWeight = 'PRIMARIO' | 'SECUNDARIO';

export interface SpecialtyRelevance {
  /** Sinais que sustentam a oferta principal dessa especialidade. */
  primary: SignalType[];
  /** Sinais que ajudam a qualificar, mas não são a dor central. */
  secondary: SignalType[];
  /**
   * true quando o vocabulário de sinal atual não cobre de verdade essa
   * especialidade. Não é erro — é lacuna conhecida, e a interface precisa
   * dizer isso em vez de mostrar sinal irrelevante como se servisse.
   */
  poorlyCovered: boolean;
  /** Por que está mal coberta. Vazio quando poorlyCovered é false. */
  coverageGap?: string;
}

/**
 * ⚠️ Este mapa expõe um viés real do produto: o `SignalType` atual foi
 * desenhado por quem vende SITE. `DESENVOLVIMENTO_WEB` e `TRAFEGO_PAGO` têm
 * sinal primário de sobra; `DESIGN_BRANDING` não tem praticamente nenhum,
 * porque não existe sinal de "identidade visual datada", "sem foto
 * profissional" ou "marca inconsistente". A lacuna está declarada em
 * `coverageGap`, não escondida atrás de um proxy ruim.
 */
const RELEVANCE: Record<ProviderSpecialty, SpecialtyRelevance> = {
  DESENVOLVIMENTO_WEB: {
    primary: ['SEM_SITE', 'SITE_FORA_DO_AR', 'SO_LINKTREE'],
    // PUBLICOU_SITE é sinal invertido: provavelmente perdeu o lead.
    secondary: ['PUBLICOU_SITE', 'CNPJ_RECENTE', 'NOVA_UNIDADE'],
    poorlyCovered: false,
  },

  TRAFEGO_PAGO: {
    primary: ['COMECOU_A_ANUNCIAR', 'AUMENTOU_CRIATIVOS', 'PAROU_DE_ANUNCIAR'],
    // "anuncia sem landing page" é a combinação mais forte deste perfil —
    // SEM_SITE aqui não é a oferta, é o agravante que justifica a abordagem.
    secondary: ['SEM_SITE', 'SO_LINKTREE'],
    poorlyCovered: false,
  },

  SOCIAL_MEDIA: {
    primary: ['INSTAGRAM_ATIVO'],
    secondary: ['SO_LINKTREE', 'DM_ABERTO', 'SALTO_DE_REVIEWS'],
    poorlyCovered: true,
    coverageGap:
      'Só sabemos se o Instagram existe, não se está bem cuidado. Faltam sinais de frequência de post, queda de engajamento e qualidade de conteúdo.',
  },

  DESIGN_BRANDING: {
    primary: [],
    secondary: ['SO_LINKTREE', 'CNPJ_RECENTE', 'NOVA_UNIDADE'],
    poorlyCovered: true,
    coverageGap:
      'Nenhum sinal atual mede identidade visual. Faltam sinais de marca datada, ausência de foto profissional e inconsistência visual entre canais — é o perfil menos servido pelo produto hoje.',
  },

  AUTOMACAO_IA: {
    primary: ['WHATSAPP_COMERCIAL', 'DM_ABERTO'],
    secondary: ['SALTO_DE_REVIEWS', 'COMECOU_A_ANUNCIAR'],
    poorlyCovered: true,
    coverageGap:
      'Sabemos que o canal existe, não que ele está saturado. Faltam sinais de tempo de resposta e volume de atendimento — o que de fato justifica automação.',
  },

  SEO_CONTEUDO: {
    primary: ['SEM_SITE', 'SITE_FORA_DO_AR'],
    secondary: ['SALTO_DE_REVIEWS', 'RECLAMACAO_EM_REVIEW'],
    poorlyCovered: true,
    coverageGap:
      'Não medimos posição em busca nem conteúdo indexado. Sem Keyword Planner/Trends (ver ADR de fontes de dados), a dor de SEO fica implícita.',
  },

  CONSULTORIA_ESTRATEGIA: {
    primary: ['CNPJ_RECENTE', 'NOVA_UNIDADE', 'PAROU_DE_ANUNCIAR'],
    secondary: ['RECLAMACAO_EM_REVIEW', 'SALTO_DE_REVIEWS', 'SEM_SITE'],
    poorlyCovered: false,
  },

  OUTRO: {
    primary: [],
    secondary: [],
    poorlyCovered: true,
    coverageGap:
      'Especialidade fora da taxonomia — sem mapa de relevância. O usuário descreveu a própria atuação em texto livre; até existir mapeamento, o feed mostra sinal geral.',
  },
};

/** Rótulos de interface. Fonte única — a UI nunca escreve isso à mão. */
export const SPECIALTY_LABELS: Record<ProviderSpecialty, string> = {
  DESENVOLVIMENTO_WEB: 'Sites e landing pages',
  TRAFEGO_PAGO: 'Tráfego pago',
  SOCIAL_MEDIA: 'Social media',
  DESIGN_BRANDING: 'Design e identidade visual',
  AUTOMACAO_IA: 'Automação e IA',
  SEO_CONTEUDO: 'SEO e conteúdo',
  CONSULTORIA_ESTRATEGIA: 'Consultoria e estratégia',
  OUTRO: 'Outro',
};

export interface CombinedRelevance {
  primary: SignalType[];
  secondary: SignalType[];
  /** Todo sinal relevante, primário primeiro. */
  all: SignalType[];
  /** Especialidades escolhidas que o vocabulário de sinal ainda não serve bem. */
  gaps: Array<{ specialty: ProviderSpecialty; label: string; gap: string }>;
  /** true quando NENHUMA especialidade escolhida tem sinal primário. */
  noPrimaryCoverage: boolean;
}

/** Relevância de uma especialidade isolada. */
export function relevanceFor(specialty: ProviderSpecialty): SpecialtyRelevance {
  return RELEVANCE[specialty];
}

/**
 * Une a relevância de todas as especialidades do tenant.
 *
 * Um sinal primário para qualquer especialidade é primário no conjunto — quem
 * faz site e tráfego quer ver as duas coisas em destaque, não a interseção.
 * Sinal que é primário em uma e secundário em outra fica primário (o mais
 * forte ganha), senão apareceria rebaixado sem motivo.
 *
 * Lista vazia devolve conjunto vazio com `noPrimaryCoverage: true` — o
 * chamador precisa saber a diferença entre "não configurou" e "configurou e
 * não temos sinal". Nunca devolve um default silencioso.
 */
export function combineRelevance(specialties: ProviderSpecialty[]): CombinedRelevance {
  const primary = new Set<SignalType>();
  const secondary = new Set<SignalType>();
  const gaps: CombinedRelevance['gaps'] = [];

  for (const specialty of specialties) {
    const rel = RELEVANCE[specialty];
    rel.primary.forEach((s) => primary.add(s));
    rel.secondary.forEach((s) => secondary.add(s));
    if (rel.poorlyCovered && rel.coverageGap) {
      gaps.push({ specialty, label: SPECIALTY_LABELS[specialty], gap: rel.coverageGap });
    }
  }

  // Primário vence secundário quando o mesmo sinal aparece nos dois.
  for (const s of primary) secondary.delete(s);

  const primaryList = [...primary];
  const secondaryList = [...secondary];

  return {
    primary: primaryList,
    secondary: secondaryList,
    all: [...primaryList, ...secondaryList],
    gaps,
    noPrimaryCoverage: primaryList.length === 0,
  };
}

/** `true` se o sinal tem qualquer relevância para o conjunto de especialidades. */
export function isSignalRelevant(
  signalType: SignalType,
  specialties: ProviderSpecialty[],
): boolean {
  if (specialties.length === 0) return true; // sem perfil, não filtra nada
  return combineRelevance(specialties).all.includes(signalType);
}
