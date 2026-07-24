/**
 * Configuração padrão do Scanner Inteligente de PMEs Sem Anúncios e Sem Website.
 * Centraliza os critérios de qualificação, limites e comportamentos do scanner.
 */

export interface ScannerConfig {
  /** Nome oficial do produto */
  productName: string;
  /** Promessa curta do produto */
  tagline: string;
  /** Critérios de qualificação de leads */
  qualification: {
    /** Lead ideal: sem website ativo */
    mustNotHaveWebsite: boolean;
    /** Lead ideal: sem anúncios ativos pagos (Meta, Google, TikTok) */
    mustNotHavePaidAds: boolean;
    /** Bônus: ter Instagram ativo (presença digital sem site próprio) */
    preferActiveInstagram: boolean;
    /** Bônus: ter boa reputação no Google Maps */
    minGoogleRating: number;
    /** Bônus: ter número mínimo de reviews no Google Maps */
    minReviewCount: number;
  };
  /** Limites operacionais */
  limits: {
    /** Máximo de resultados por busca no Google Places */
    maxSearchResults: number;
    /** Raio padrão de busca em metros */
    defaultSearchRadiusMeters: number;
    /** Máximo de leads processados em lote por review-all */
    maxBatchReviewSize: number;
  };
  /** Pesos do scoring (0–1) — usados como orientação para a IA */
  scoringWeights: {
    noWebsite: number;
    activeAds: number;
    activeInstagram: number;
    highRating: number;
    highReviewCount: number;
    cnpjAvailable: number;
    decisionMakerFound: number;
  };
}

export const defaultScannerConfig: ScannerConfig = {
  productName: 'Scanner Inteligente de PMEs Sem Anúncios e Sem Website',
  tagline: 'Encontre PMEs locais com dor digital óbvia e orçamento comprovado, já com o pitch pronto.',
  qualification: {
    mustNotHaveWebsite: true,
    mustNotHavePaidAds: true,
    preferActiveInstagram: true,
    minGoogleRating: 4.0,
    minReviewCount: 10,
  },
  limits: {
    maxSearchResults: 50,
    defaultSearchRadiusMeters: 5000,
    maxBatchReviewSize: 10,
  },
  scoringWeights: {
    noWebsite: 0.35,
    activeAds: -0.25,
    activeInstagram: 0.15,
    highRating: 0.1,
    highReviewCount: 0.05,
    cnpjAvailable: 0.05,
    decisionMakerFound: 0.05,
  },
};

/**
 * Retorna a configuração efetiva do scanner, permitindo overrides por variáveis de ambiente.
 */
export function getScannerConfig(overrides?: Partial<ScannerConfig>): ScannerConfig {
  return {
    ...defaultScannerConfig,
    ...overrides,
    qualification: {
      ...defaultScannerConfig.qualification,
      ...overrides?.qualification,
    },
    limits: {
      ...defaultScannerConfig.limits,
      ...overrides?.limits,
    },
    scoringWeights: {
      ...defaultScannerConfig.scoringWeights,
      ...overrides?.scoringWeights,
    },
  };
}
