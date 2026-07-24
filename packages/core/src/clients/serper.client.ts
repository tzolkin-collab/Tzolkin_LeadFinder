import type { CacheService } from '../services/cache.service.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { CoreLogger } from '../utils/logger.js';

export interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
}

export interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
}

export interface MetaAdsSearchResult {
  hasAds: boolean;
  adsLibraryUrl: string;
  foundLinks: string[];
  adDetails: Array<{ link: string; title?: string; snippet?: string }>;
}

export interface SerperClientOptions {
  apiKey?: string | undefined;
  cacheService?: CacheService | undefined;
  cacheTtlSeconds?: number | undefined;
}

/**
 * Reusable client for Serper.dev Google Search API.
 * Encapsulates search queries for Instagram profiles and Meta Ads Library links.
 * Supports Redis/in-memory caching, retry with backoff and request timeout.
 */
export class SerperClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://google.serper.dev/search';
  private readonly logger = new CoreLogger('SerperClient');
  private readonly cache?: CacheService | undefined;
  private readonly cacheTtlSeconds: number | undefined;

  constructor(options?: SerperClientOptions) {
    this.apiKey = options?.apiKey ?? '';
    this.cache = options?.cacheService;
    this.cacheTtlSeconds = options?.cacheTtlSeconds ?? 60 * 60 * 24 * 7; // 7 days
  }

  get isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_serper_api_key_here';
  }

  public cleanBusinessName(name: string): string {
    if (!name) return '';
    // Extrai o nome da marca principal removendo subtítulos delimitados por -, |, –, :, /
    // Ex: "Rufino Baterias - Comércio de Baterias Moura" -> "Rufino Baterias"
    let clean = name;
    const parts = name.split(/\s*[\-\|\–\:\/]\s*/);
    if (parts.length > 1 && parts[0] && parts[0].trim().length >= 3) {
      clean = parts[0].trim();
    }
    return clean || name;
  }

  /**
   * Search Google for Instagram profile handles of a business.
   */
  async searchInstagramHandle(businessName: string, location?: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const cleanName = this.cleanBusinessName(businessName);
    const city = this.cleanLocation(location);
    const cleanBrand = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const queries = [
      `site:instagram.com "${cleanName}"`,
      `${cleanName} ${city} instagram`.trim(),
    ];

    const handles: string[] = [];

    for (const query of queries) {
      const organic = await this.executeSearch(query, 5);

      organic.forEach(item => {
        const link = item.link ?? '';
        const title = item.title ?? '';

        // Se for post/reel/story de terceiros, tenta extrair o handle do autor no título ou pula
        if (link.includes('/p/') || link.includes('/reel/') || link.includes('/stories/')) {
          const titleMatch = title.match(/@([a-zA-Z0-9_.]+)/);
          if (titleMatch?.[1]) {
            handles.push(titleMatch[1].toLowerCase());
          }
          return;
        }

        const match = link.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
        if (match?.[1]) {
          const handle = match[1].toLowerCase().replace('@', '');
          const ignored = ['accounts', 'explore', 'p', 'reel', 'reels', 'stories', 'about', 'legal', 'developer', 'directory'];
          if (!ignored.includes(handle)) {
            handles.push(handle);
          }
        }
      });
    }

    if (handles.length === 0) {
      this.logger.debug(`Nenhum perfil Instagram encontrado para "${businessName}"`);
      return null;
    }

    // Filtra apenas handles relevantes que contêm a marca principal para evitar perfis pessoais irrelevantes
    const relevantHandles = handles.filter(h => {
      if (cleanBrand.length >= 4) {
        return h.includes(cleanBrand) || cleanBrand.includes(h);
      }
      return true;
    });

    const candidates = relevantHandles.length > 0 ? relevantHandles : handles;
    const bestHandle = this.getMostFrequent(candidates);

    this.logger.info(`Perfil Instagram localizado: @${bestHandle}`, { businessName, handle: bestHandle });
    return bestHandle;
  }

  /**
   * Search Google for TikTok profile handles of a business (3-Level Search Strategy).
   */
  async searchTikTokHandle(businessName: string, location?: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const city = this.cleanLocation(location);
    const shortName = this.cleanBusinessName(businessName);
    const handles: string[] = [];

    const processOrganic = (organic: SerperOrganicResult[]) => {
      organic.forEach(item => {
        const link = item.link ?? '';
        const isVideo = link.includes('/video/');
        const match = link.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/);
        if (match?.[1]) {
          const h = match[1].replace('@', '').toLowerCase();
          const cleanShort = shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (
            !['discover', 'tag', 'video', 'music', 'about', 'legal', 'embed', 'upload', 'search'].includes(h)
          ) {
            // Prioriza homepages de perfil; descarta vídeos de criadores terceiros a menos que o handle coincida
            if (!isVideo || h.includes(cleanShort) || cleanShort.includes(h)) {
              handles.push(h);
            }
          }
        }
      });
    };

    const directHandle = `@${shortName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Level 0: Direct profile handle URL query (ex: site:tiktok.com/@xicodakafua)
    const organic0 = await this.executeSearch(`site:tiktok.com/${directHandle}`, 5);
    processOrganic(organic0);

    // Level 1: Short business name site query
    if (handles.length === 0) {
      const organic1 = await this.executeSearch(`site:tiktok.com "${shortName}"`, 5);
      processOrganic(organic1);
    }

    // Level 2: Precise site query with full name
    if (handles.length === 0) {
      const organic2 = await this.executeSearch(`site:tiktok.com "${businessName}"`, 5);
      processOrganic(organic2);
    }

    // Level 3: Short name + location query
    if (handles.length === 0) {
      const organic3 = await this.executeSearch(`${shortName} ${city} tiktok`.trim(), 5);
      processOrganic(organic3);
    }

    if (handles.length === 0) {
      this.logger.debug(`Nenhum perfil TikTok encontrado para "${businessName}"`);
      return null;
    }

    const bestHandle = this.getMostFrequent(handles);
    this.logger.info(`Perfil TikTok localizado: @${bestHandle}`, { businessName, handle: bestHandle });
    return `https://www.tiktok.com/@${bestHandle}`;
  }

  private cleanLocation(location?: string): string {
    if (!location) return '';
    const stateMatch = location.match(/([^,-]+)\s*-\s*[A-Z]{2}/i);
    if (stateMatch?.[1]) return stateMatch[1].trim();
    const parts = location.split(',');
    if (parts.length >= 2) {
      const item = parts[parts.length - 2];
      if (item) {
        const candidate = item.replace(/\d{5}-\d{3}/, '').trim();
        if (candidate.length > 2) return candidate;
      }
    }
    return location.trim();
  }

  /**
   * Search Google for LinkedIn Company page URL of a business.
   */
  async searchLinkedInCompanyUrl(businessName: string, location?: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const cleanName = this.cleanBusinessName(businessName);
    const city = this.cleanLocation(location);
    let query = `site:linkedin.com/company "${cleanName}" ${city}`.trim();
    let organic = await this.executeSearch(query, 5);

    if (organic.length === 0 && cleanName !== businessName) {
      query = `site:linkedin.com/company "${businessName}" ${city}`.trim();
      organic = await this.executeSearch(query, 5);
    }

    for (const item of organic) {
      const link = item.link ?? '';
      if (link.includes('linkedin.com/company/')) {
        this.logger.info(`Página LinkedIn localizada: ${link}`, { businessName });
        return link;
      }
    }

    return null;
  }

  /**
   * Search Google for the official website URL of a business when Google Places misses it.
   */
  async searchOfficialWebsite(businessName: string, location?: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const cleanName = this.cleanBusinessName(businessName);
    const city = this.cleanLocation(location);

    const queries = [
      city ? `"${businessName}" "${city}"` : `"${businessName}"`,
      city ? `"${cleanName}" "${city}"` : `"${cleanName}"`,
      city ? `${cleanName} ${city}` : cleanName,
      `${cleanName} site oficial`,
    ];

    const ignoredDomains = [
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com',
      'twitter.com',
      'x.com',
      'whatsapp.com',
      'wa.me',
      'linktr.ee',
      'beacons.ai',
      'bio.link',
      'taplink.cc',
      'ifood.com.br',
      'mercadolivre.com.br',
      'olx.com.br',
      'tripadvisor.com.br',
      'apontador.com.br',
      'guiamais.com.br',
      'solutudo.com.br',
      'yelp.com',
      'google.com',
      'jusbrasil.com.br',
      'econodata.com.br',
      'cnpjs.rocks',
      'cnpj.biz',
      'casadosdados.com.br',
      'empresasdobrasil.com',
      'empresas.serasaexperian.com.br',
    ];

    for (const query of queries) {
      const organic = await this.executeSearch(query, 5);

      for (const item of organic) {
        const link = item.link ?? '';
        if (!link.startsWith('http')) continue;

        const domainMatch = link.match(/^https?:\/\/([^\/]+)/i);
        const domain = domainMatch?.[1]?.toLowerCase() ?? '';

        if (ignoredDomains.some(d => domain.includes(d))) continue;

        this.logger.info(`Website oficial localizado no Serper (${query}): ${link}`, { businessName });
        return link;
      }
    }

    return null;
  }

  /**
   * Search Google for active Meta Ads Library links for a business (3-Level Fallback Strategy).
   */
  async searchMetaAdsLibrary(businessName: string, handle?: string, location?: string): Promise<MetaAdsSearchResult> {
    const cleanName = this.cleanBusinessName(businessName);
    const fallbackUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(cleanName)}`;

    if (!this.isConfigured) {
      return {
        hasAds: false,
        adsLibraryUrl: fallbackUrl,
        foundLinks: [],
        adDetails: [],
      };
    }

    const adDetailsMap = new Map<string, { link: string; title?: string; snippet?: string }>();

    const processOrganicResults = (results: SerperOrganicResult[]) => {
      results.forEach(item => {
        const link = item.link ?? '';
        if (link.includes('facebook.com/ads/library') || link.includes('meta.com/ads/library')) {
          if (!adDetailsMap.has(link)) {
            adDetailsMap.set(link, {
              link,
              ...(item.title ? { title: item.title } : {}),
              ...(item.snippet ? { snippet: item.snippet } : {}),
            });
          }
        }
      });
    };

    // Nível 1: Busca pelo Handle do Instagram (mais preciso)
    if (handle) {
      const queryHandle = `site:facebook.com/ads/library "${handle}"`;
      const organicHandle = await this.executeSearch(queryHandle, 5);
      processOrganicResults(organicHandle);
    }

    // Nível 2: Se não achou pelo handle, busca pelo Nome Limpo da Empresa (ex: Rufino Baterias)
    if (adDetailsMap.size === 0) {
      const queryName = `site:facebook.com/ads/library "${cleanName}"`;
      const organicName = await this.executeSearch(queryName, 5);
      processOrganicResults(organicName);

      if (adDetailsMap.size === 0 && cleanName !== businessName) {
        const queryFullName = `site:facebook.com/ads/library "${businessName}"`;
        const organicFullName = await this.executeSearch(queryFullName, 5);
        processOrganicResults(organicFullName);
      }
    }

    // Nível 3: Se ainda não achou, tenta Nome da Empresa + Localização
    if (adDetailsMap.size === 0 && location) {
      const queryLocation = `site:facebook.com/ads/library "${cleanName}" "${location}"`;
      const organicLoc = await this.executeSearch(queryLocation, 5);
      processOrganicResults(organicLoc);
    }

    const adDetails = Array.from(adDetailsMap.values());
    const foundLinks = adDetails.map(d => d.link);
    const hasAds = foundLinks.length > 0;
    const adsLibraryUrl = hasAds && foundLinks[0] ? foundLinks[0] : fallbackUrl;

    this.logger.info(`Meta Ads Library search (3 níveis) concluída para "${businessName}"`, {
      hasAds,
      foundLinksCount: foundLinks.length,
      attempts: handle ? 3 : 2,
    });

    return {
      hasAds,
      adsLibraryUrl,
      foundLinks,
      adDetails,
    };
  }

  /**
   * Search Google Ads Transparency Center for active Google Ads.
   */
  async searchGoogleAds(businessName: string, domain?: string): Promise<{ hasGoogleAds: boolean; adsUrl: string; foundLinks: string[] }> {
    const fallbackUrl = `https://adstransparency.google.com/?region=BR&q=${encodeURIComponent(businessName)}`;

    if (!this.isConfigured) {
      return { hasGoogleAds: false, adsUrl: fallbackUrl, foundLinks: [] };
    }

    const foundLinks: string[] = [];

    // Query 1: By business name
    const organicName = await this.executeSearch(`site:adstransparency.google.com "${businessName}"`, 5);
    organicName.forEach(item => {
      const link = item.link ?? '';
      if (link.includes('adstransparency.google.com') && !foundLinks.includes(link)) {
        foundLinks.push(link);
      }
    });

    // Query 2: By domain if available
    if (domain && foundLinks.length === 0) {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const organicDomain = await this.executeSearch(`site:adstransparency.google.com "${cleanDomain}"`, 5);
      organicDomain.forEach(item => {
        const link = item.link ?? '';
        if (link.includes('adstransparency.google.com') && !foundLinks.includes(link)) {
          foundLinks.push(link);
        }
      });
    }

    const hasGoogleAds = foundLinks.length > 0;
    const adsUrl = hasGoogleAds && foundLinks[0] ? foundLinks[0] : fallbackUrl;

    return { hasGoogleAds, adsUrl, foundLinks };
  }

  /**
   * Search TikTok Ads Library for active TikTok Ads.
   */
  async searchTikTokAds(businessName: string, handle?: string): Promise<{ hasTikTokAds: boolean; adsUrl: string; foundLinks: string[] }> {
    const fallbackUrl = `https://library.tiktok.com/ads?region=BR&q=${encodeURIComponent(businessName)}`;

    if (!this.isConfigured) {
      return { hasTikTokAds: false, adsUrl: fallbackUrl, foundLinks: [] };
    }

    const foundLinks: string[] = [];

    const organic = await this.executeSearch(`site:library.tiktok.com "${handle ?? businessName}"`, 5);
    organic.forEach(item => {
      const link = item.link ?? '';
      if (link.includes('library.tiktok.com') && !foundLinks.includes(link)) {
        foundLinks.push(link);
      }
    });

    const hasTikTokAds = foundLinks.length > 0;
    const adsUrl = hasTikTokAds && foundLinks[0] ? foundLinks[0] : fallbackUrl;

    return { hasTikTokAds, adsUrl, foundLinks };
  }

  /**
   * Search Google for CNPJ references of a business.
   */
  async searchCnpj(query: string): Promise<SerperOrganicResult[]> {
    if (!this.isConfigured) return [];
    return this.executeSearch(query, 5);
  }

  /**
   * Search Google for LinkedIn Decision Makers (Owners, Partners, Founders, Managers).
   */
  async searchDecisionMakers(businessName: string, location?: string): Promise<Array<{ name: string; role?: string; linkedinUrl?: string; snippet?: string }>> {
    if (!this.isConfigured) return [];

    const city = this.cleanLocation(location);
    const query = `site:linkedin.com/in "${businessName}" (dono OR sócio OR fundador OR proprietário OR gerente OR diretor) ${city}`.trim();
    const organic = await this.executeSearch(query, 5);

    const profiles: Array<{ name: string; role?: string; linkedinUrl?: string; snippet?: string }> = [];

    organic.forEach(item => {
      const link = item.link ?? '';
      if (link.includes('linkedin.com/in/')) {
        const rawTitle = item.title ?? '';
        const nameParts = rawTitle.split('-')[0]?.split('|')[0]?.trim();
        const roleMatch = rawTitle.match(/-\s*([^|-]+)/);
        const role = roleMatch?.[1]?.trim();
        profiles.push({
          name: nameParts ?? rawTitle,
          ...(role ? { role } : {}),
          linkedinUrl: link,
          ...(item.snippet ? { snippet: item.snippet } : {}),
        });
      }
    });

    this.logger.info(`Busca de decisores no LinkedIn concluída para "${businessName}"`, { profilesFound: profiles.length });
    return profiles;
  }

  private async executeSearch(query: string, num = 5): Promise<SerperOrganicResult[]> {
    const startedAt = Date.now();
    const cacheKey = `serper:${this.hashKey(query)}:${num}`;

    try {
      const cached = await this.cache?.get<SerperOrganicResult[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Serper cache hit for query: "${query}"`, { organicCount: cached.length });
        return cached;
      }
    } catch (error) {
      this.logger.error('Failed to read Serper cache', error, { query });
    }

    try {
      const response = await fetchWithRetry(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num, gl: 'br', hl: 'pt-br' }),
        timeoutMs: 10000,
        maxRetries: 2,
      });

      if (!response.ok) {
        this.logger.error(`Serper API HTTP status ${response.status}`, undefined, {
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
        return [];
      }

      const data = (await response.json()) as SerperSearchResponse;
      const organic = data.organic ?? [];

      try {
        await this.cache?.set(cacheKey, organic, this.cacheTtlSeconds);
      } catch (error) {
        this.logger.error('Failed to write Serper cache', error, { query });
      }

      this.logger.debug(`Serper API Raw Response for query: "${query}"`, {
        organicCount: organic.length,
        durationMs: Date.now() - startedAt,
        cacheHit: false,
      });

      return organic;
    } catch (error) {
      this.logger.error('Falha na requisição Serper API', error, {
        durationMs: Date.now() - startedAt,
      });
      return [];
    }
  }

  private hashKey(query: string): string {
    // Simple hash to keep cache keys short but deterministic
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getMostFrequent(items: string[]): string {
    const counts: Record<string, number> = {};
    items.forEach(i => {
      counts[i] = (counts[i] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0]!;
  }
}
