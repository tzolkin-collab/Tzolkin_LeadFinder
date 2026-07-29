import {
  prisma,
  latestObservations,
  type ObservationSource,
  type SignalAxis,
  type SignalType,
} from '@tzolkin/database';
import { CoreLogger } from '../utils/logger.js';

export interface EvaluatedSignal {
  type: SignalType;
  axis: SignalAxis;
  value?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  source: ObservationSource;
  observedAt: Date;
}

export class SignalService {
  private readonly logger = new CoreLogger('SignalService');

  /**
   * Avalia diffs entre observações recentes da base canônica e grava sinais.
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

      // 3. Diffs do Brasil API (CNPJ Recente)
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

      this.logger.info(`Aavaliados ${evaluated.length} sinais para o negócio canônico ${canonicalId}`);
      return evaluated;
    } catch (err) {
      this.logger.error(`Erro ao avaliar sinais para ${canonicalId}:`, err);
      return [];
    }
  }
}
