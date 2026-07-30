import {
  prisma,
  latestObservations,
  type ObservationSource,
  type SignalAxis,
  type SignalType,
} from '@tzolkin/database';
import { CoreLogger } from '../utils/logger.js';
import { z } from 'zod';

export interface EvaluatedSignal {
  type: SignalType;
  axis: SignalAxis;
  value?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  source: ObservationSource;
  observedAt: Date;
}

const DynamicSignalsSchema = z.object({
  signals: z.array(z.object({
    type: z.string().describe('O código identificador do sinal em MAIUSCULO_COM_UNDERLINE (ex: SITE_LENTO, RECLAMACAO_PROCON)'),
    axis: z.enum(['DOR', 'DINHEIRO', 'MOMENTO', 'ALCANCE']).describe('O eixo estratégico ao qual esse sinal pertence'),
    value: z.record(z.unknown()).optional().describe('Um objeto com o valor ou métrica principal extraída (ex: { diff: 5 })'),
    evidence: z.record(z.unknown()).optional().describe('Um objeto justificando o porquê este sinal foi criado'),
  }))
});

export class SignalService {
  private readonly logger = new CoreLogger('SignalService');
  private readonly openAiApiKey: string | undefined;

  constructor(openAiApiKey?: string | undefined) {
    this.openAiApiKey = openAiApiKey;
  }

  /**
   * Avalia diffs entre observações recentes da base canônica e grava sinais.
   * Utiliza regras determinísticas para sinais core, e IA para descobrir novos sinais dinâmicos.
   */
  async evaluateSignals(canonicalId: string): Promise<EvaluatedSignal[]> {
    const evaluated: EvaluatedSignal[] = [];

    try {
      // 1. Diffs do Google Places (site, avaliações)
      const placesObs = await latestObservations(canonicalId, 'GOOGLE_PLACES', 2);
      const firstPlaces = placesObs[0];
      const secondPlaces = placesObs[1];

      if (firstPlaces) {
        const latestPayload = firstPlaces.payload as any;

        // Sinal: SEM_SITE
        if (latestPayload.hasWebsite === false || !latestPayload.websiteUrl) {
          evaluated.push({
            type: 'SEM_SITE',
            axis: 'DOR',
            evidence: { placeId: latestPayload.placeId, address: latestPayload.address },
            source: 'GOOGLE_PLACES',
            observedAt: firstPlaces.observedAt,
          });
        }

        // Diffs entre duas observações do Google Places
        if (secondPlaces) {
          const prevPayload = secondPlaces.payload as any;

          // PUBLICOU_SITE
          if (
            (!prevPayload.websiteUrl || prevPayload.hasWebsite === false) &&
            latestPayload.websiteUrl &&
            latestPayload.hasWebsite === true
          ) {
            evaluated.push({
              type: 'PUBLICOU_SITE',
              axis: 'MOMENTO',
              value: { websiteUrl: latestPayload.websiteUrl },
              evidence: { previousUrl: prevPayload.websiteUrl, currentUrl: latestPayload.websiteUrl },
              source: 'GOOGLE_PLACES',
              observedAt: firstPlaces.observedAt,
            });
          }

          // SALTO_DE_REVIEWS
          const prevReviews = prevPayload.reviewCount || 0;
          const currReviews = latestPayload.reviewCount || 0;
          if (currReviews - prevReviews >= 5) {
            evaluated.push({
              type: 'SALTO_DE_REVIEWS',
              axis: 'MOMENTO',
              value: { diff: currReviews - prevReviews, currentTotal: currReviews },
              evidence: { prevReviews, currReviews },
              source: 'GOOGLE_PLACES',
              observedAt: firstPlaces.observedAt,
            });
          }
        }
      }

      // 2. Diffs do Meta Ads Library (anúncios ativos)
      const metaObs = await latestObservations(canonicalId, 'META_ADS_LIBRARY', 2);
      const firstMeta = metaObs[0];
      const secondMeta = metaObs[1];

      if (firstMeta) {
        const payload = firstMeta.payload as any;
        const reallyChecked =
          payload.checkMethod === 'GRAPH_API' || payload.checkMethod === 'SERPER_SEARCH';
        const noAdsAnywhere =
          (payload.adsCount ?? 0) === 0 &&
          payload.hasGoogleAds !== true &&
          payload.hasTikTokAds !== true;

        if (reallyChecked && noAdsAnywhere) {
          evaluated.push({
            type: 'SEM_ANUNCIOS_DETECTADOS',
            axis: 'DOR',
            value: { checkMethod: payload.checkMethod },
            evidence: {
              adsCount: payload.adsCount ?? 0,
              adsLibraryUrl: payload.adsLibraryUrl,
              checkMethod: payload.checkMethod,
            },
            source: 'META_ADS_LIBRARY',
            observedAt: firstMeta.observedAt,
          });
        }
      }

      if (firstMeta && secondMeta) {
        const latestPayload = firstMeta.payload as any;
        const prevPayload = secondMeta.payload as any;
        const prevCount = prevPayload.adsCount || 0;
        const currCount = latestPayload.adsCount || 0;

        if (prevCount === 0 && currCount > 0) {
          evaluated.push({
            type: 'COMECOU_A_ANUNCIAR',
            axis: 'MOMENTO',
            value: { adsCount: currCount },
            evidence: { prevCount, currCount, adsLibraryUrl: latestPayload.adsLibraryUrl },
            source: 'META_ADS_LIBRARY',
            observedAt: firstMeta.observedAt,
          });
        } else if (prevCount > 0 && currCount === 0) {
          evaluated.push({
            type: 'PAROU_DE_ANUNCIAR',
            axis: 'MOMENTO',
            value: { adsCount: 0 },
            evidence: { prevCount, currCount },
            source: 'META_ADS_LIBRARY',
            observedAt: firstMeta.observedAt,
          });
        } else if (currCount > prevCount) {
          evaluated.push({
            type: 'AUMENTOU_CRIATIVOS',
            axis: 'MOMENTO',
            value: { diff: currCount - prevCount, adsCount: currCount },
            evidence: { prevCount, currCount },
            source: 'META_ADS_LIBRARY',
            observedAt: firstMeta.observedAt,
          });
        }
      }

      const igObs = await latestObservations(canonicalId, 'SERPER_INSTAGRAM', 1);
      const firstIg = igObs[0];
      if (firstIg) {
        const payload = firstIg.payload as any;
        if (payload.discoveryMethod === 'SERPER' && payload.found === false) {
          evaluated.push({
            type: 'SEM_INSTAGRAM',
            axis: 'DOR',
            value: { discoveryMethod: payload.discoveryMethod },
            evidence: { found: false, discoveryMethod: payload.discoveryMethod },
            source: 'SERPER_INSTAGRAM',
            observedAt: firstIg.observedAt,
          });
        } else if (payload.found === true && payload.handle) {
          evaluated.push({
            type: 'INSTAGRAM_ATIVO',
            axis: 'ALCANCE',
            value: { handle: payload.handle, followers: payload.followers },
            evidence: { handle: payload.handle, posts: payload.posts },
            source: 'SERPER_INSTAGRAM',
            observedAt: firstIg.observedAt,
          });
        }
      }

      const cnpjObs = await latestObservations(canonicalId, 'BRASIL_API', 1);
      const firstCnpj = cnpjObs[0];
      if (firstCnpj) {
        const payload = firstCnpj.payload as any;
        if (payload.dataInicioAtividade) {
          const startDate = new Date(payload.dataInicioAtividade);
          const daysOld = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld <= 90) {
            evaluated.push({
              type: 'CNPJ_RECENTE',
              axis: 'MOMENTO',
              value: { daysOld: Math.round(daysOld), dataInicioAtividade: payload.dataInicioAtividade },
              evidence: { cnpj: payload.cnpj, razaoSocial: payload.razaoSocial },
              source: 'BRASIL_API',
              observedAt: startDate,
            });
          }
        }
      }

      // 4. SINAIS DINÂMICOS IA E AUDITORIA DE SITE (PageSpeed/SSL)
      // Capturamos a última auditoria se ela existir (normalmente registrada via WebsiteAuditTool).
      // Se não for uma observação padrão ainda, podemos processá-la se o payload hash disser.
      // Aqui usamos o LLM para cruzar dados e inferir "SITE_LENTO", "SSL_INVALIDO" ou criar novos.
      if (this.openAiApiKey) {
        const dynamicSignals = await this.discoverDynamicSignals(canonicalId);
        for (const ds of dynamicSignals) {
          // Evita adicionar sinal que o determinístico já pegou (ex: se o LLM alucinar SEM_SITE)
          if (!evaluated.some(e => e.type === ds.type)) {
            evaluated.push(ds);
          }
        }
      }

      // Persistir sinais no banco
      for (const sig of evaluated) {
        await prisma.signal.create({
          data: {
            canonicalId,
            type: sig.type,
            axis: sig.axis,
            value: sig.value as never,
            evidence: sig.evidence as never,
            source: sig.source,
            observedAt: sig.observedAt,
          },
        });
      }

      this.logger.info(`Avaliados ${evaluated.length} sinais para o negócio canônico ${canonicalId}`);
      return evaluated;
    } catch (err) {
      this.logger.error(`Erro ao avaliar sinais para ${canonicalId}:`, err);
      return [];
    }
  }

  /**
   * Consulta as últimas observações e pede ao LLM para descobrir oportunidades não mapeadas.
   */
  private async discoverDynamicSignals(canonicalId: string): Promise<EvaluatedSignal[]> {
    try {
      // Coletamos uma amostragem das últimas observações (Google, Meta, WebsiteAudit se tivermos persistido)
      const recentObs = await prisma.observation.findMany({
        where: { canonicalId },
        orderBy: { observedAt: 'desc' },
        take: 5,
      });

      if (recentObs.length === 0) return [];

      const prompt = `Analise os seguintes snapshots (observações) extraídos recentemente de um negócio (Lead):
${JSON.stringify(recentObs.map(o => ({ source: o.source, payload: o.payload })), null, 2)}

Sua missão como Inteligência Comercial é identificar mudanças, dores (DOR), oportunidades de orçamento (DINHEIRO), momentos estratégicos (MOMENTO) ou nível de presença (ALCANCE).
Em particular, preste atenção em métricas de performance de site, segurança SSL (ex: expiresAt, valid: false), engajamento de redes, etc.

Não repita sinais básicos já cobertos por regras determinísticas (ex: SEM_SITE, PUBLICOU_SITE, COMECOU_A_ANUNCIAR, CNPJ_RECENTE).
Se você encontrar que a performance do site (performanceScore) é muito baixa (< 50), emita um sinal "SITE_LENTO".
Se o SSL está expirado ou prestes a expirar, emita "SSL_INVALIDO" ou "SSL_EXPIRANDO".
Se encontrar algo super diferente, INVENTE um novo sinal em MAIUSCULO_COM_UNDERLINE (ex: CATALOGO_PRODUTOS_NOVO, PIXEL_NAO_INSTALADO).

Retorne em formato JSON estritamente seguindo o schema solicitado.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é o cérebro de detecção de Sinais (Gatilhos de Vendas) da Tzolkin.'
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) return [];

      const data = await response.json();
      const rawJson = data.choices?.[0]?.message?.content;
      if (!rawJson) return [];

      const parsed = JSON.parse(rawJson);
      const validated = DynamicSignalsSchema.parse(parsed);

      return validated.signals.map(s => {
        const sig: EvaluatedSignal = {
          type: s.type,
          axis: s.axis as SignalAxis,
          source: recentObs[0]?.source ?? 'WEBSITE_PROBE',
          observedAt: recentObs[0]?.observedAt ?? new Date(),
        };
        if (s.value !== undefined) sig.value = s.value;
        if (s.evidence !== undefined) sig.evidence = s.evidence;
        return sig;
      });
    } catch (err) {
      this.logger.warn(`Falha na IA ao descobrir sinais dinâmicos para ${canonicalId}`, { error: String(err) });
      return [];
    }
  }
}
