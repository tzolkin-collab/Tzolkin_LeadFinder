import { SerperClient, type SerperOrganicResult } from './serper.client.js';
import { CoreLogger } from '../utils/logger.js';

export interface B2BCommunityMention {
  platform: 'REDDIT' | 'YOUTUBE' | 'LINKEDIN_POST' | 'RECLAME_AQUI' | 'B2B_FORUM';
  title: string;
  url: string;
  snippet: string;
  detectedPainPoint?: string;
}

export interface B2BCommunityAnalysis {
  targetNicheOrBrand: string;
  mentionsCount: number;
  mentions: B2BCommunityMention[];
  dominantComplaints: string[];
}

/**
 * Cliente de Rastreamento de Conversas B2B & Fóruns (Reddit, YouTube, LinkedIn Posts, Reclame Aqui).
 * Alimenta o Cérebro Global com dores reais expressas em conversas públicas.
 */
export class SocialCommunityClient {
  private readonly logger = new CoreLogger('SocialCommunityClient');
  private readonly serperClient: SerperClient;

  constructor(serperClient: SerperClient) {
    this.serperClient = serperClient;
  }

  /**
   * Rastreia conversas e queixas de mercado no Reddit, YouTube, LinkedIn e Reclame Aqui.
   */
  async searchB2BConversations(targetQuery: string): Promise<B2BCommunityAnalysis> {
    const mentions: B2BCommunityMention[] = [];

    if (!this.serperClient.isConfigured) {
      return {
        targetNicheOrBrand: targetQuery,
        mentionsCount: 0,
        mentions: [],
        dominantComplaints: [],
      };
    }

    const queries = [
      { platform: 'REDDIT' as const, query: `site:reddit.com "${targetQuery}" (problema OR agência OR tráfego OR site)` },
      { platform: 'YOUTUBE' as const, query: `site:youtube.com "${targetQuery}"` },
      { platform: 'LINKEDIN_POST' as const, query: `site:linkedin.com/posts "${targetQuery}"` },
      { platform: 'RECLAME_AQUI' as const, query: `site:reclameaqui.com.br "${targetQuery}"` },
    ];

    for (const q of queries) {
      try {
        const results = await (this.serperClient as any).executeSearch(q.query, 5) as SerperOrganicResult[];
        results.forEach((item) => {
          if (item.link && item.title) {
            mentions.push({
              platform: q.platform,
              title: item.title,
              url: item.link,
              snippet: item.snippet || '',
            });
          }
        });
      } catch (err) {
        this.logger.error(`Erro ao buscar conversas no ${q.platform} para "${targetQuery}":`, err);
      }
    }

    this.logger.info(`Rastreamento de fóruns B2B concluído para "${targetQuery}"`, {
      mentionsFound: mentions.length,
    });

    return {
      targetNicheOrBrand: targetQuery,
      mentionsCount: mentions.length,
      mentions,
      // Sem NLP de sumarização, não há como derivar "queixa dominante" dos
      // snippets — inventar 3 frases fixas aqui era o mesmo erro do
      // diagnostic.service.ts. O consumidor lê `mentions` (dado real) direto.
      dominantComplaints: [],
    };
  }
}
