import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';
import { SerperClient } from '../clients/serper.client.js';
import { BrasilApiClient, type BrasilApiCnpjData } from '../clients/brasil-api.client.js';
import type { CacheService } from '../services/cache.service.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { CoreLogger } from '../utils/logger.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const CnpjInputSchema = z.object({
  businessName: z.string().min(2).describe('Nome do negócio para encontrar o CNPJ'),
  placeId: z.string().describe('ID do Google Place para cachear o resultado'),
  city: z.string().optional().describe('Cidade/UF para refinar a busca'),
  websiteUrl: z.string().url().optional().describe('Website do negócio para extração gratuita de CNPJ'),
});

export type CnpjInput = z.input<typeof CnpjInputSchema>;

// ─── Output Type ──────────────────────────────────────────────────────────────

export interface CnpjData {
  cnpj: string;
  razaoSocial?: string | undefined;
  nomeFantasia?: string | null | undefined;
  situacaoCadastral?: string | undefined;
  dataInicioAtividade?: string | undefined;
  cnaeDescricao?: string | undefined;
  capitalSocial?: number | undefined;
  municipio?: string | undefined;
  uf?: string | undefined;
  qsa?: Array<{ nome: string; qualificacao: string }> | undefined;
  source: 'CACHE' | 'WEBSITE' | 'SERPER' | 'MANUAL';
  raw: BrasilApiCnpjData;
}

// ─── Tool Implementation ──────────────────────────────────────────────────────

export class CnpjTool implements Tool<CnpjInput, CnpjData> {
  readonly name = 'cnpj_discovery' as const;
  readonly description =
    'Descobre e valida o CNPJ de uma PME brasileira usando Brasil API. ' +
    'Tenta primeiro extrair do website (gratuito), depois busca por nome+cidade no Google via Serper. ' +
    'Retorna dados oficiais da Receita Federal, incluindo sócios, CNAE e capital social.';
  readonly inputSchema = CnpjInputSchema;

  private readonly brasilApiClient: BrasilApiClient;
  private readonly serperClient?: SerperClient | undefined;
  private readonly cache?: CacheService | undefined;
  private readonly logger = new CoreLogger('CnpjTool');

  constructor(serperClient?: SerperClient | undefined, cacheService?: CacheService | undefined) {
    this.serperClient = serperClient;
    this.cache = cacheService;
    this.brasilApiClient = new BrasilApiClient({
      ...(cacheService ? { cacheService } : {}),
      cacheTtlSeconds: 60 * 60 * 24 * 30,
    });
  }

  async execute(input: CnpjInput): Promise<ToolResult<CnpjData>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);
      const cacheKey = `cnpj:place:${validated.placeId}`;

      // 1. Cache first
      const cached = await this.cache?.get<CnpjData>(cacheKey);
      if (cached) {
        this.logger.info(`CNPJ cache hit for place ${validated.placeId}`, { cnpj: cached.cnpj });
        return { success: true, data: { ...cached, source: 'CACHE' }, executedAt, durationMs: Date.now() - startedAt };
      }

      // 2. Try to extract CNPJ from website (free)
      let cnpj: string | null = null;
      let source: CnpjData['source'] = 'SERPER';

      if (validated.websiteUrl) {
        cnpj = await this.extractCnpjFromWebsite(validated.websiteUrl);
        if (cnpj) {
          source = 'WEBSITE';
          this.logger.info(`CNPJ extracted from website for ${validated.businessName}`, { cnpj });
        }
      }

      // 3. Fallback to Serper search by name + city (costs Serper credits)
      if (!cnpj && this.serperClient?.isConfigured) {
        cnpj = await this.findCnpjBySerper(validated.businessName, validated.city);
        if (cnpj) {
          source = 'SERPER';
          this.logger.info(`CNPJ found via Serper for ${validated.businessName}`, { cnpj });
        }
      }

      if (!cnpj) {
        return {
          success: false,
          error: 'CNPJ não encontrado para o negócio',
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      // 4. Validate and enrich with Brasil API
      const raw = await this.brasilApiClient.getCnpj(cnpj);
      if (!raw) {
        return {
          success: false,
          error: `CNPJ ${cnpj} encontrado, mas falha ao consultar Brasil API`,
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      // Basic sanity check: razao_social or nome_fantasia should loosely match business name or clean primary brand name
      const names = [raw.razao_social, raw.nome_fantasia].filter(Boolean).map(n => this.normalize(n ?? ''));
      const businessNameNorm = this.normalize(validated.businessName);
      const cleanNameNorm = this.serperClient ? this.normalize(this.serperClient.cleanBusinessName(validated.businessName)) : businessNameNorm;

      const nameMatch = names.some(n =>
        n.includes(businessNameNorm) || businessNameNorm.includes(n) ||
        n.includes(cleanNameNorm) || cleanNameNorm.includes(n)
      );

      if (!nameMatch) {
        this.logger.warn('CNPJ name mismatch', {
          businessName: validated.businessName,
          razaoSocial: raw.razao_social,
          nomeFantasia: raw.nome_fantasia,
        });
      }

      const data: CnpjData = {
        cnpj: raw.cnpj,
        razaoSocial: raw.razao_social,
        nomeFantasia: raw.nome_fantasia,
        situacaoCadastral: raw.descricao_situacao_cadastral,
        dataInicioAtividade: raw.data_inicio_atividade,
        cnaeDescricao: raw.cnae_fiscal_descricao,
        capitalSocial: raw.capital_social,
        municipio: raw.municipio,
        uf: raw.uf,
        qsa: raw.qsa?.map(s => ({
          nome: s.nome_socio,
          qualificacao: s.qualificacao_socio,
        })),
        source,
        raw,
      };

      try {
        await this.cache?.set(cacheKey, data, 60 * 60 * 24 * 30);
      } catch (error) {
        this.logger.error('Failed to write CNPJ cache', error, { placeId: validated.placeId });
      }

      const durationMs = Date.now() - startedAt;
      this.logger.info(`CNPJ enrichment completed for ${validated.businessName}`, { cnpj: data.cnpj, source }, durationMs);

      return { success: true, data, executedAt, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Falha na descoberta de CNPJ', error, { durationMs });

      return { success: false, error: message, executedAt, durationMs };
    }
  }

  private async extractCnpjFromWebsite(websiteUrl: string): Promise<string | null> {
    try {
      const response = await fetchWithRetry(websiteUrl, {
        method: 'GET',
        timeoutMs: 8000,
        maxRetries: 1,
      });

      if (!response.ok) return null;

      const text = await response.text();
      const maskedMatch = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (maskedMatch) {
        return maskedMatch[0].replace(/\D/g, '');
      }

      const rawMatches = text.match(/\d{14}/g);
      if (rawMatches) {
        for (const raw of rawMatches) {
          if (this.isValidCnpjDigits(raw)) return raw;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to extract CNPJ from website', error, { websiteUrl });
      return null;
    }
  }

  private async findCnpjBySerper(businessName: string, city?: string): Promise<string | null> {
    if (!this.serperClient) return null;

    const cleanName = this.serperClient.cleanBusinessName(businessName);
    let query = `"${cleanName}" "CNPJ" ${city ?? ''}`.trim();
    let organic = await this.serperClient.searchCnpj(query);

    if (organic.length === 0 && cleanName !== businessName) {
      const fallbackQuery = `"${businessName}" "CNPJ" ${city ?? ''}`.trim();
      organic = await this.serperClient.searchCnpj(fallbackQuery);
    }

    for (const item of organic) {
      const text = `${item.title ?? ''} ${item.snippet ?? ''}`;
      const maskedMatch = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (maskedMatch) return maskedMatch[0].replace(/\D/g, '');

      const rawMatches = text.match(/\d{14}/g);
      if (rawMatches) {
        for (const raw of rawMatches) {
          if (this.isValidCnpjDigits(raw)) return raw;
        }
      }
    }

    return null;
  }

  private isValidCnpjDigits(cnpj: string): boolean {
    if (!/^\d{14}$/.test(cnpj)) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    const calcCheck = (cnpj: string, weights: number[]) => {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += parseInt(cnpj.charAt(i), 10) * (weights[i] ?? 0);
      }
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const firstCheck = calcCheck(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (firstCheck !== parseInt(cnpj.charAt(12), 10)) return false;

    const secondCheck = calcCheck(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return secondCheck === parseInt(cnpj.charAt(13), 10);
  }

  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Nome do negócio' },
          placeId: { type: 'string', description: 'ID do Google Place' },
          city: { type: 'string', description: 'Cidade/UF (opcional)' },
          websiteUrl: { type: 'string', description: 'Website do negócio (opcional)' },
        },
        required: ['businessName', 'placeId'],
      },
    };
  }

  toOpenAITool(): OpenAIToolDefinition {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            businessName: { type: 'string', description: 'Nome do negócio' },
            placeId: { type: 'string', description: 'ID do Google Place' },
            city: { type: 'string', description: 'Cidade/UF (opcional)' },
            websiteUrl: { type: 'string', description: 'Website do negócio (opcional)' },
          },
          required: ['businessName', 'placeId'],
        },
      },
    };
  }
}
