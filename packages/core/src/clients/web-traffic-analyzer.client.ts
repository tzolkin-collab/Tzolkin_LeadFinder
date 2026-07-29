import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { CoreLogger } from '../utils/logger.js';

export interface WebTrafficSignature {
  domain: string;
  technologiesDetected: string[];
  hasMetaPixel: boolean;
  hasGoogleAnalytics: boolean;
  hasGtm: boolean;
  cms: string | null;
}

/**
 * Detecta pixels de rastreamento e stack tecnológica de um site a partir de
 * assinaturas literais no HTML (fbq(), gtag(), wp-content etc.) — sinal real,
 * o mesmo tipo de checagem que browsers/extensões de ad-tech fazem.
 *
 * Não estima tráfego nem performance: a versão anterior derivava
 * "mobilePerformanceScore" do tamanho em bytes do HTML e chamava isso de
 * "simulação do PageSpeed" — nem o nome do campo era verdade. Para esses dois
 * dados, a fonte real é a API do PageSpeed Insights (gratuita, sem token) e
 * uma API de tráfego de fato — nenhuma das duas está integrada ainda.
 */
export class WebTrafficAnalyzerClient {
  private readonly logger = new CoreLogger('WebTrafficAnalyzerClient');

  /**
   * Analisa a assinatura de tráfego e tecnologia de um domínio comercial.
   */
  async analyzeDomain(websiteUrl: string): Promise<WebTrafficSignature> {
    if (!websiteUrl) {
      return {
        domain: '',
        technologiesDetected: [],
        hasMetaPixel: false,
        hasGoogleAnalytics: false,
        hasGtm: false,
        cms: null,
      };
    }

    const domain = websiteUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    const cleanUrl = `https://${domain}`;

    let html = '';
    let hasMetaPixel = false;
    let hasGoogleAnalytics = false;
    let hasGtm = false;
    let cms: string | null = null;
    const technologiesDetected: string[] = [];

    try {
      const response = await fetchWithRetry(cleanUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        timeoutMs: 8000,
        maxRetries: 1,
      });

      if (response.ok) {
        html = await response.text();

        if (html.includes('fbq(') || html.includes('connect.facebook.net') || html.includes('fbevents.js')) {
          hasMetaPixel = true;
          technologiesDetected.push('Meta Pixel (Facebook Ads)');
        }
        if (html.includes('gtag(') || html.includes('google-analytics.com') || html.includes('G-')) {
          hasGoogleAnalytics = true;
          technologiesDetected.push('Google Analytics 4');
        }
        if (html.includes('googletagmanager.com/gtm.js')) {
          hasGtm = true;
          technologiesDetected.push('Google Tag Manager');
        }
        if (html.includes('wp-content') || html.includes('wp-includes')) {
          cms = 'WordPress';
          technologiesDetected.push('WordPress');
        } else if (html.includes('cdn.shopify.com')) {
          cms = 'Shopify';
          technologiesDetected.push('Shopify');
        } else if (html.includes('wix.com')) {
          cms = 'Wix';
          technologiesDetected.push('Wix');
        } else if (html.includes('rdstation')) {
          technologiesDetected.push('RD Station Marketing');
        }
      }
    } catch (err) {
      this.logger.debug(`HTML probe parcial para ${domain}`, { error: String(err) });
    }

    this.logger.info(`Assinatura de tecnologia concluída para ${domain}`, {
      hasMetaPixel,
      hasGoogleAnalytics,
      cms,
      technologiesCount: technologiesDetected.length,
    });

    return {
      domain,
      technologiesDetected,
      hasMetaPixel,
      hasGoogleAnalytics,
      hasGtm,
      cms,
    };
  }
}
