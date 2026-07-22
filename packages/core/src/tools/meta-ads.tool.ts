import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';
import { SerperClient } from '../clients/serper.client.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const MetaAdsInputSchema = z.object({
  businessName: z
    .string()
    .min(2)
    .describe('Nome da empresa para verificar anúncios na Meta Ads Library'),
  country: z
    .string()
    .length(2)
    .default('BR')
    .describe('Código de país ISO (padrão: BR)'),
});

export type MetaAdsInput = z.input<typeof MetaAdsInputSchema>;
export type MetaAdsParsedInput = z.output<typeof MetaAdsInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const MetaAdItemSchema = z.object({
  id: z.string(),
  pageId: z.string().optional(),
  pageName: z.string().optional(),
  snapshotUrl: z.string().url().optional(),
});

export type MetaAdItem = z.infer<typeof MetaAdItemSchema>;

export const MetaAdsOutputSchema = z.object({
  hasAds: z.boolean(),
  count: z.number().int(),
  adsLibraryUrl: z
    .string()
    .describe('URL da Meta Ads Library para validação direta com 1 clique'),
  ads: z.array(MetaAdItemSchema),
  checkMethod: z.enum(['GRAPH_API', 'SERPER_SEARCH', 'FALLBACK_LINK']),
});

export type MetaAdsOutput = z.infer<typeof MetaAdsOutputSchema>;

// ─── Raw API Types ────────────────────────────────────────────────────────────

interface RawMetaAd {
  id: string;
  page_id?: string;
  page_name?: string;
  ad_snapshot_url?: string;
}

interface MetaAdsApiResponse {
  data?: RawMetaAd[];
  error?: {
    message?: string;
    code?: number;
  };
}

// ─── Tool Implementation ──────────────────────────────────────────────────────

export class MetaAdsTool implements Tool<MetaAdsInput, MetaAdsOutput> {
  readonly name = 'meta_ads_check' as const;
  readonly description =
    'Verifica se uma PME possui anúncios ativos na Meta Ads Library (Facebook/Instagram Ads). ' +
    'Utiliza Graph API se houver token, busca indexada via Serper como fallback automático, ' +
    'e sempre provê uma URL de 1-clique para o usuário validar visualmente.';
  readonly inputSchema = MetaAdsInputSchema;

  private readonly accessToken?: string | undefined;
  private readonly serperClient: SerperClient;
  private readonly baseUrl = 'https://graph.facebook.com/v18.0/ads_archive';

  constructor(accessToken?: string, serperApiKeyOrClient?: string | SerperClient) {
    this.accessToken = accessToken;
    if (serperApiKeyOrClient instanceof SerperClient) {
      this.serperClient = serperApiKeyOrClient;
    } else {
      this.serperClient = new SerperClient(serperApiKeyOrClient);
    }
  }

  async execute(input: MetaAdsInput): Promise<ToolResult<MetaAdsOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);
      const fallbackUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${validated.country}&q=${encodeURIComponent(validated.businessName)}`;

      // Strategy 1: Official Graph API if token is configured
      if (this.accessToken && this.accessToken !== 'your_meta_token_here') {
        try {
          const params = new URLSearchParams({
            access_token: this.accessToken,
            search_terms: validated.businessName,
            ad_reached_countries: `['${validated.country}']`,
            ad_active_status: 'ACTIVE',
            limit: '5',
            fields: 'id,ad_snapshot_url,page_name,page_id',
          });

          const response = await fetch(`${this.baseUrl}?${params.toString()}`);
          if (response.ok) {
            const data = (await response.json()) as MetaAdsApiResponse;
            if (!data.error) {
              const rawAds = data.data ?? [];
              const ads: MetaAdItem[] = rawAds.map(ad => ({
                id: ad.id,
                pageId: ad.page_id,
                pageName: ad.page_name,
                snapshotUrl: ad.ad_snapshot_url,
              }));

              return {
                success: true,
                data: {
                  hasAds: ads.length > 0,
                  count: ads.length,
                  adsLibraryUrl: ads[0]?.snapshotUrl ?? fallbackUrl,
                  ads,
                  checkMethod: 'GRAPH_API',
                },
                executedAt,
                durationMs: Date.now() - startedAt,
              };
            }
          }
        } catch {
          // Fall through to Strategy 2
        }
      }

      // Strategy 2: Serper Google Search for Meta Ads Library links
      if (this.serperClient.isConfigured) {
        const serperResult = await this.serperClient.searchMetaAdsLibrary(validated.businessName);
        return {
          success: true,
          data: {
            hasAds: serperResult.hasAds,
            count: serperResult.foundLinks.length,
            adsLibraryUrl: serperResult.adsLibraryUrl,
            ads: serperResult.foundLinks.map((link, idx) => ({ id: `serper_${idx}`, snapshotUrl: link })),
            checkMethod: 'SERPER_SEARCH',
          },
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      // Strategy 3: Clean Fallback URL for 1-click manual verification
      return {
        success: true,
        data: {
          hasAds: false,
          count: 0,
          adsLibraryUrl: fallbackUrl,
          ads: [],
          checkMethod: 'FALLBACK_LINK',
        },
        executedAt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[MetaAdsTool] Error:', message);

      return {
        success: false,
        error: message,
        executedAt,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Nome da empresa' },
          country: { type: 'string', description: 'Código do país (ex: BR)' },
        },
        required: ['businessName'],
      },
    };
  }

  toOpenAITool(): OpenAIToolDefinition {
    const anthropic = this.toAnthropicTool();
    return {
      type: 'function',
      function: {
        name: anthropic.name,
        description: anthropic.description,
        parameters: anthropic.input_schema,
      },
    };
  }
}
