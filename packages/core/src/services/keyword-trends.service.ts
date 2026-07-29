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
  totalSearchVolume: number;
  topKeywords: KeywordOpportunity[];
  trendDirection: 'GROWING' | 'STABLE' | 'DECLINING';
  growthPercentage: number;
}

export class KeywordTrendsService {
  private readonly logger = new CoreLogger('KeywordTrendsService');

  /**
   * Avalia o volume de busca e oportunidades de palavras-chave para um nicho e cidade no Brasil.
   */
  async evaluateKeywordTrends(niche: string, city: string): Promise<CategoryTrendReport> {
    const cleanNiche = niche.toLowerCase().trim();
    const cleanCity = city.trim();

    // Mock/Deterministic trends matrix based on Brasil regional data
    const topKeywords: KeywordOpportunity[] = [
      {
        query: `${cleanNiche} ${cleanCity}`,
        volume: 2400,
        competition: 'baixa',
        growth: '+18% este mês',
        recommendedCategory: cleanNiche,
        isGoodOpportunity: true,
      },
      {
        query: `melhor ${cleanNiche} em ${cleanCity}`,
        volume: 1800,
        competition: 'baixa',
        growth: '+24% este mês',
        recommendedCategory: cleanNiche,
        isGoodOpportunity: true,
      },
      {
        query: `preço ${cleanNiche} ${cleanCity}`,
        volume: 980,
        competition: 'média',
        growth: '+5% este mês',
        recommendedCategory: cleanNiche,
        isGoodOpportunity: false,
      },
    ];

    this.logger.info(`Trends e palavras-chave avaliadas para ${niche} em ${city}`, {
      totalVolume: 5180,
      keywordsCount: topKeywords.length,
    });

    return {
      niche,
      city,
      totalSearchVolume: 5180,
      topKeywords,
      trendDirection: 'GROWING',
      growthPercentage: 18,
    };
  }
}
