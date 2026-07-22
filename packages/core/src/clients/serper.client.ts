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
}

/**
 * Reusable client for Serper.dev Google Search API.
 * Encapsulates search queries for Instagram profiles and Meta Ads Library links.
 */
export class SerperClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://google.serper.dev/search';

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? '';
  }

  get isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_serper_api_key_here';
  }

  /**
   * Search Google for Instagram profile handles of a business.
   */
  async searchInstagramHandle(businessName: string, location?: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const query = `${businessName} ${location ?? ''} instagram`.trim();
    const organic = await this.executeSearch(query, 5);

    const handles: string[] = [];

    organic.forEach(item => {
      const link = item.link ?? '';
      if (link.includes('instagram.com/')) {
        const match = link.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
        if (
          match?.[1] &&
          !['accounts', 'explore', 'p', 'reel', 'stories', 'about', 'legal', 'developer'].includes(
            match[1],
          )
        ) {
          handles.push(match[1]);
        }
      }
    });

    if (handles.length === 0) return null;

    return this.getMostFrequent(handles);
  }

  /**
   * Search Google for active Meta Ads Library links for a business.
   */
  async searchMetaAdsLibrary(businessName: string): Promise<MetaAdsSearchResult> {
    const fallbackUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(businessName)}`;

    if (!this.isConfigured) {
      return {
        hasAds: false,
        adsLibraryUrl: fallbackUrl,
        foundLinks: [],
      };
    }

    const query = `site:facebook.com/ads/library "${businessName}"`;
    const organic = await this.executeSearch(query, 5);

    const foundLinks: string[] = [];

    organic.forEach(item => {
      const link = item.link ?? '';
      if (link.includes('facebook.com/ads/library') || link.includes('meta.com/ads/library')) {
        foundLinks.push(link);
      }
    });

    const hasAds = foundLinks.length > 0;
    const adsLibraryUrl = hasAds && foundLinks[0] ? foundLinks[0] : fallbackUrl;

    return {
      hasAds,
      adsLibraryUrl,
      foundLinks,
    };
  }

  private async executeSearch(query: string, num = 5): Promise<SerperOrganicResult[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num }),
      });

      if (!response.ok) {
        console.error(`[SerperClient] HTTP error ${response.status}`);
        return [];
      }

      const data = (await response.json()) as SerperSearchResponse;
      return data.organic ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SerperClient] Error:', msg);
      return [];
    }
  }

  private getMostFrequent(items: string[]): string {
    const counts: Record<string, number> = {};
    items.forEach(i => {
      counts[i] = (counts[i] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0]!;
  }
}
