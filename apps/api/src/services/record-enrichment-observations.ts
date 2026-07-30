import { recordObservation } from '@tzolkin/database';
import type { ReviewPipelineResult } from '@tzolkin/core';
import { CoreLogger } from '@tzolkin/core';

const logger = new CoreLogger('EnrichmentObservations');

/**
 * Grava na base canônica o que o enriquecimento observou.
 *
 * Antes disto, só o fluxo de busca (Google Places) alimentava a base — o
 * enriquecimento descobria Instagram, anúncios e CNPJ e jogava tudo em
 * `BusinessReport`, que é privado do tenant. Consequência: o motor de sinal
 * nunca via anúncio nem Instagram, e "não anuncia" era indistinguível de
 * "nunca checamos".
 *
 * ⚠️ O payload carrega COMO a verificação foi feita (`checkMethod`,
 * `discoveryMethod`), não só o resultado. É isso que permite emitir sinal de
 * ausência verificada sem transformar falha de coleta em fato sobre o negócio.
 *
 * Efeito colateral por contrato: qualquer falha aqui é registrada e engolida.
 * A base canônica é infraestrutura compartilhada; ela nunca deve derrubar a
 * operação do tenant que pagou pela chamada.
 */
export async function recordEnrichmentObservations(
  canonicalId: string,
  tenantId: string,
  result: ReviewPipelineResult,
): Promise<void> {
  try {
    // ── Meta Ads ────────────────────────────────────────────────────────
    // FALLBACK_LINK significa que nenhuma verificação aconteceu — só
    // devolvemos um link para o usuário olhar. Gravar isso como observação
    // criaria a ilusão de que checamos.
    if (result.metaAds.checkMethod !== 'FALLBACK_LINK') {
      await recordObservation({
        canonicalId,
        source: 'META_ADS_LIBRARY',
        triggeredByTenantId: tenantId,
        payload: {
          hasAds: result.metaAds.hasAds,
          adsCount: result.metaAds.count,
          checkMethod: result.metaAds.checkMethod,
          adsLibraryUrl: result.metaAds.adsLibraryUrl,
          ...(result.metaAds.googleAds
            ? { hasGoogleAds: result.metaAds.googleAds.hasGoogleAds }
            : {}),
          ...(result.metaAds.tiktokAds
            ? { hasTikTokAds: result.metaAds.tiktokAds.hasTikTokAds }
            : {}),
        },
      });
    }

    // ── Instagram ───────────────────────────────────────────────────────
    // `discoveryMethod` nulo = a tool falhou por completo, não houve busca.
    if (result.instagram.discoveryMethod !== null) {
      await recordObservation({
        canonicalId,
        source: 'SERPER_INSTAGRAM',
        triggeredByTenantId: tenantId,
        payload: {
          found: result.instagram.handle !== null,
          handle: result.instagram.handle,
          followers: result.instagram.followers,
          posts: result.instagram.posts,
          discoveryMethod: result.instagram.discoveryMethod,
        },
      });
    }

    // ── CNPJ / Receita ──────────────────────────────────────────────────
    // Só grava quando achou: não existe "verificamos e a empresa não tem
    // CNPJ" — toda empresa formal tem. Não achar é limite da nossa busca,
    // não fato sobre o negócio.
    if (result.cnpj) {
      await recordObservation({
        canonicalId,
        source: 'BRASIL_API',
        // A data do fato é a abertura da empresa, não a hora da consulta —
        // é o que permite "CNPJ aberto há 45 dias" em vez de "descobrimos hoje".
        ...(result.cnpj.dataInicioAtividade
          ? { observedAt: new Date(result.cnpj.dataInicioAtividade) }
          : {}),
        triggeredByTenantId: tenantId,
        payload: {
          cnpj: result.cnpj.cnpj,
          razaoSocial: result.cnpj.razaoSocial,
          situacaoCadastral: result.cnpj.situacaoCadastral,
          dataInicioAtividade: result.cnpj.dataInicioAtividade,
          cnaeDescricao: result.cnpj.cnaeDescricao,
          source: result.cnpj.source,
        },
      });
    }

    // ── Site oficial ────────────────────────────────────────────────────
    // O pipeline pode ter encontrado site que o Places não tinha, ou
    // confirmado que não há. As duas coisas são observação legítima.
    await recordObservation({
      canonicalId,
      source: 'WEBSITE_PROBE',
      triggeredByTenantId: tenantId,
      payload: {
        hasWebsite: result.business.hasWebsite,
        websiteUrl: result.business.websiteUrl,
      },
    });
  } catch (error) {
    logger.error('Falha ao gravar observações do enriquecimento', error, { canonicalId });
  }
}
