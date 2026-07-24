import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { CoreLogger } from '../utils/logger.js';

export interface ApifyInstagramProfile {
  handle: string;
  url: string;
  fullName?: string;
  bio?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  profilePicUrl?: string;
  externalUrl?: string;
  recentPosts?: Array<{
    displayUrl: string;
    caption?: string;
    likesCount?: number;
    commentsCount?: number;
  }>;
  brandColors?: string[];
}

export interface ApifyTikTokProfile {
  handle: string;
  url: string;
  nickname?: string;
  bio?: string;
  followersCount?: number;
  likesCount?: number;
  videoCount?: number;
  avatarUrl?: string;
}

export interface ApifyLinkedInCompany {
  name: string;
  url: string;
  tagline?: string;
  description?: string;
  employeeCount?: number;
  industry?: string;
  logoUrl?: string;
  website?: string;
}

export interface ApifyMetaAdsResult {
  hasAds: boolean;
  adsCount: number;
  adsLibraryUrl: string;
  ads: Array<{
    id?: string;
    pageName?: string;
    adText?: string;
    publisherPlatforms?: string[];
  }>;
}

export interface ApifyClientOptions {
  apiToken?: string | undefined;
}

/**
 * ApifyClient
 * Native client for deep social media & ads library scraping using Apify Actors.
 * Extracts real profile metadata, brand identity signals, and live ad creatives.
 */
export class ApifyClient {
  private readonly apiToken: string;
  private readonly logger = new CoreLogger('ApifyClient');

  constructor(options?: ApifyClientOptions) {
    this.apiToken = options?.apiToken ?? process.env.APIFY_API_TOKEN ?? '';
  }

  get isConfigured(): boolean {
    return !!this.apiToken && this.apiToken !== 'your_apify_token_here';
  }

  /**
   * Deep Instagram Profile Scrape (Avatar, Bio, Followers, Posts & Visual Identity)
   */
  async scrapeInstagramProfile(handle: string): Promise<ApifyInstagramProfile | null> {
    if (!this.isConfigured || !handle) return null;
    const cleanHandle = handle.replace('@', '').trim();

    try {
      this.logger.info(`Iniciando extração profunda no Instagram para @${cleanHandle}`);
      const endpoint = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${this.apiToken}`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${cleanHandle}/`],
          resultsType: 'details',
          searchLimit: 1,
        }),
        timeoutMs: 30000,
      });

      if (!res.ok) {
        this.logger.warn(`Apify Instagram Actor retornou status ${res.status}`);
        return null;
      }

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) return null;

      const data = items[0];
      return {
        handle: cleanHandle,
        url: `https://www.instagram.com/${cleanHandle}/`,
        fullName: data.fullName,
        bio: data.biography,
        followersCount: data.followersCount,
        followsCount: data.followsCount,
        postsCount: data.postsCount,
        profilePicUrl: data.profilePicUrlHD || data.profilePicUrl,
        externalUrl: data.externalUrl,
        recentPosts: (data.latestPosts || []).slice(0, 6).map((p: any) => ({
          displayUrl: p.displayUrl,
          caption: p.caption,
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
        })),
      };
    } catch (err) {
      this.logger.error(`Erro ao extrair perfil do Instagram @${cleanHandle}:`, err);
      return null;
    }
  }

  /**
   * Deep TikTok Profile Scrape (Avatar, Followers, Total Likes & Video Count)
   */
  async scrapeTikTokProfile(handleOrUrl: string): Promise<ApifyTikTokProfile | null> {
    if (!this.isConfigured || !handleOrUrl) return null;
    const rawHandle = handleOrUrl.replace(/.*tiktok\.com\/@?/, '').replace('@', '').split('?')[0] || '';
    const cleanHandle = rawHandle.trim();

    try {
      this.logger.info(`Iniciando extração profunda no TikTok para @${cleanHandle}`);
      const endpoint = `https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=${this.apiToken}`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles: [cleanHandle],
          resultsPerPage: 1,
        }),
        timeoutMs: 30000,
      });

      if (!res.ok) return null;

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) return null;

      const data = items[0]?.authorMeta || items[0];
      return {
        handle: cleanHandle,
        url: `https://www.tiktok.com/@${cleanHandle}`,
        nickname: data.nickName || data.name,
        bio: data.signature || data.bio,
        followersCount: data.fans || data.followers,
        likesCount: data.heart || data.likes,
        videoCount: data.video || data.videoCount,
        avatarUrl: data.avatar || data.avatarLarger,
      };
    } catch (err) {
      this.logger.error(`Erro ao extrair perfil do TikTok @${cleanHandle}:`, err);
      return null;
    }
  }

  /**
   * Deep LinkedIn Company Profile Scrape (Logo, Employee Count, Tagline, Industry)
   */
  async scrapeLinkedInCompany(companySlugOrUrl: string): Promise<ApifyLinkedInCompany | null> {
    if (!this.isConfigured || !companySlugOrUrl) return null;

    try {
      this.logger.info(`Iniciando extração profunda no LinkedIn para ${companySlugOrUrl}`);
      const endpoint = `https://api.apify.com/v2/acts/dev_tools~linkedin-company-scraper/run-sync-get-dataset-items?token=${this.apiToken}`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [companySlugOrUrl.includes('linkedin.com') ? companySlugOrUrl : `https://www.linkedin.com/company/${companySlugOrUrl}`],
        }),
        timeoutMs: 30000,
      });

      if (!res.ok) return null;

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) return null;

      const data = items[0];
      return {
        name: data.name || data.companyName,
        url: data.url || companySlugOrUrl,
        tagline: data.tagline,
        description: data.description,
        employeeCount: data.employeeCount || data.staffCount,
        industry: data.industry,
        logoUrl: data.logoResolutionUrl || data.logoUrl,
        website: data.website,
      };
    } catch (err) {
      this.logger.error(`Erro ao extrair página do LinkedIn ${companySlugOrUrl}:`, err);
      return null;
    }
  }

  /**
   * Real Meta Ads Library Verification & Creative Extractor
   */
  async scrapeMetaAdsLibrary(businessName: string): Promise<ApifyMetaAdsResult> {
    const fallbackUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(businessName)}`;
    if (!this.isConfigured || !businessName) {
      return { hasAds: false, adsCount: 0, adsLibraryUrl: fallbackUrl, ads: [] };
    }

    try {
      this.logger.info(`Verificando anúncios ativos na Meta Ads Library via Apify para "${businessName}"`);
      const endpoint = `https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/run-sync-get-dataset-items?token=${this.apiToken}`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: businessName,
          countryCode: 'BR',
          activeStatus: 'ACTIVE',
          maxResults: 10,
        }),
        timeoutMs: 30000,
      });

      if (!res.ok) {
        return { hasAds: false, adsCount: 0, adsLibraryUrl: fallbackUrl, ads: [] };
      }

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) {
        return { hasAds: false, adsCount: 0, adsLibraryUrl: fallbackUrl, ads: [] };
      }

      const ads = items.map((item: any) => ({
        id: item.adArchiveID || item.id || undefined,
        pageName: item.pageName || undefined,
        adText: item.adBody || item.title || undefined,
        publisherPlatforms: Array.isArray(item.publisherPlatforms) ? item.publisherPlatforms.map(String) : [],
      }));

      return {
        hasAds: ads.length > 0,
        adsCount: ads.length,
        adsLibraryUrl: items[0]?.snapshotUrl || fallbackUrl,
        ads,
      };
    } catch (err) {
      this.logger.error(`Erro ao verificar Meta Ads Library via Apify para "${businessName}":`, err);
      return { hasAds: false, adsCount: 0, adsLibraryUrl: fallbackUrl, ads: [] };
    }
  }
}
