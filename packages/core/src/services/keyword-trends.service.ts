import { CoreLogger } from '../utils/logger.js';

export interface KeywordOpportunity {
  query: string;
  volume: number;
  competition: 'baixa' | 'média' | 'alta';
  growth: string;
  recommendedCategory: string;
  isGoodOpportunity: boolean;
}

export interface CategoryTrendReport {
  niche: string;
  city: string;
  /** null enquanto não houver fonte real (Keyword Planner — Google Ads API). */
  totalSearchVolume: number | null;
  topKeywords: KeywordOpportunity[];
  trendDirection: 'GROWING' | 'STABLE' | 'DECLINING' | null;
  growthPercentage: number | null;
  /** true enquanto o campo acima vier vazio por falta de fonte, não por erro. */
  dataUnavailable: boolean;
}

/**
 * Volume de busca e tendência por nicho+cidade exige o Keyword Planner
 * (Google Ads API + developer token) — a fonte mais burocrática do roadmap,
 * priorizada por último no ADR de fontes de dados. Não existe ainda: o
 * Serper detecta presença de Google Ads, não volume de busca.
 *
 * Sem essa integração, este service não inventa número — devolve estado
 * vazio explícito (dataUnavailable: true), no mesmo padrão que o resto do
 * produto usa para "ainda não temos esse dado".
 */
export class KeywordTrendsService {
  private readonly logger = new CoreLogger('KeywordTrendsService');

  async evaluateKeywordTrends(niche: string, city: string): Promise<CategoryTrendReport> {
    this.logger.debug(`Keyword Planner ainda não integrado — sem dado real para ${niche} em ${city}`);

    return {
      niche,
      city,
      totalSearchVolume: null,
      topKeywords: [],
      trendDirection: null,
      growthPercentage: null,
      dataUnavailable: true,
    };
  }
}
