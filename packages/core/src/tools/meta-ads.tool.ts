import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';

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
  ads: z.array(MetaAdItemSchema),
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
    'Funciona como um comprovante incontestável de orçamento de marketing. ' +
    'Negócios que anunciam mas não possuem website compõem o sweet spot absoluto de qualificação.';
  readonly inputSchema = MetaAdsInputSchema;

  private readonly accessToken?: string | undefined;
  private readonly baseUrl = 'https://graph.facebook.com/v18.0/ads_archive';

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  async execute(input: MetaAdsInput): Promise<ToolResult<MetaAdsOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);

      if (!this.accessToken || this.accessToken === 'your_meta_token_here') {
        return {
          success: true,
          data: { hasAds: false, count: 0, ads: [] },
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      const params = new URLSearchParams({
        access_token: this.accessToken,
        search_terms: validated.businessName,
        ad_reached_countries: `['${validated.country}']`,
        ad_active_status: 'ACTIVE',
        limit: '5',
        fields: 'id,ad_snapshot_url,page_name,page_id',
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);

      if (!response.ok) {
        // Sanitized error handling: don't leak token or raw query string
        return {
          success: false,
          error: `Meta Ads Library API falhou com status ${response.status}`,
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      const data = (await response.json()) as MetaAdsApiResponse;

      if (data.error) {
        return {
          success: false,
          error: `Meta API: ${data.error.message ?? 'Erro na consulta'}`,
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

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
          ads,
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
