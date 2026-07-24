import type { CacheService } from '../services/cache.service.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { CoreLogger } from '../utils/logger.js';

export interface BrasilApiQsaItem {
  identificador_de_socio: number;
  nome_socio: string;
  codigo_qualificacao_socio: number;
  qualificacao_socio: string;
  data_entrada_sociedade?: string;
  cpf_cnpj_socio?: string;
}

export interface BrasilApiCnpjData {
  cnpj: string;
  identificador_matriz_filial?: number;
  descricao_matriz_filial?: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  situacao_cadastral?: number;
  descricao_situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  motivo_situacao_cadastral?: string;
  nome_cidade_exterior?: string | null;
  codigo_natureza_juridica?: number;
  natureza_juridica?: string;
  data_inicio_atividade?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  descricao_tipo_de_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  codigo_municipio?: number;
  municipio?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string | null;
  ddd_fax?: string | null;
  qualificacao_do_responsavel?: number;
  capital_social?: number;
  porte?: number;
  descricao_porte?: string;
  opcao_pelo_simples?: boolean | null;
  data_opcao_pelo_simples?: string | null;
  data_exclusao_do_simples?: string | null;
  opcao_pelo_mei?: boolean | null;
  situacao_especial?: string | null;
  data_situacao_especial?: string | null;
  qsa?: BrasilApiQsaItem[];
}

export interface BrasilApiClientOptions {
  cacheService?: CacheService | undefined;
  cacheTtlSeconds?: number | undefined;
}

/**
 * Client for Brasil API (https://brasilapi.com.br).
 * Provides CNPJ enrichment with Redis/in-memory caching, retry and timeout.
 */
export class BrasilApiClient {
  private readonly baseUrl = 'https://brasilapi.com.br/api';
  private readonly logger = new CoreLogger('BrasilApiClient');
  private readonly cache?: CacheService | undefined;
  private readonly cacheTtlSeconds: number | undefined;

  constructor(options?: BrasilApiClientOptions) {
    this.cache = options?.cacheService;
    this.cacheTtlSeconds = options?.cacheTtlSeconds ?? 60 * 60 * 24 * 30; // 30 days
  }

  /**
   * Fetch CNPJ data from Brasil API.
   * Returns null on any failure (invalid CNPJ, network error, API down).
   */
  async getCnpj(cnpj: string): Promise<BrasilApiCnpjData | null> {
    const startedAt = Date.now();
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      this.logger.warn('Invalid CNPJ length', { cnpj: cleanCnpj });
      return null;
    }

    const cacheKey = `brasilapi:cnpj:${cleanCnpj}`;

    try {
      const cached = await this.cache?.get<BrasilApiCnpjData>(cacheKey);
      if (cached) {
        this.logger.debug(`Brasil API cache hit for CNPJ ${cleanCnpj}`);
        return cached;
      }
    } catch (error) {
      this.logger.error('Failed to read Brasil API cache', error, { cnpj: cleanCnpj });
    }

    try {
      const response = await fetchWithRetry(`${this.baseUrl}/cnpj/v1/${cleanCnpj}`, {
        method: 'GET',
        timeoutMs: 10000,
        maxRetries: 2,
      });

      if (!response.ok) {
        this.logger.error(`Brasil API HTTP status ${response.status}`, undefined, {
          cnpj: cleanCnpj,
          durationMs: Date.now() - startedAt,
        });
        return null;
      }

      const data = (await response.json()) as BrasilApiCnpjData;

      try {
        await this.cache?.set(cacheKey, data, this.cacheTtlSeconds);
      } catch (error) {
        this.logger.error('Failed to write Brasil API cache', error, { cnpj: cleanCnpj });
      }

      this.logger.info(`Brasil API CNPJ resolved: ${cleanCnpj}`, {
        razaoSocial: data.razao_social,
        durationMs: Date.now() - startedAt,
      });

      return data;
    } catch (error) {
      this.logger.error('Falha na requisição Brasil API', error, {
        cnpj: cleanCnpj,
        durationMs: Date.now() - startedAt,
      });
      return null;
    }
  }
}
