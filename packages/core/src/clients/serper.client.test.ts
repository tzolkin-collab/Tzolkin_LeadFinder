import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SerperClient } from './serper.client.js';

describe('SerperClient', () => {
  let client: SerperClient;

  beforeEach(() => {
    client = new SerperClient('test-serper-key');
    vi.restoreAllMocks();
  });

  it('detects unconfigured client', () => {
    const unconfigured = new SerperClient('');
    expect(unconfigured.isConfigured).toBe(false);
  });

  it('searches Instagram handle successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { link: 'https://www.instagram.com/clinicasorriso/' },
            { link: 'https://www.instagram.com/clinicasorriso/' },
          ],
        }),
      }),
    );

    const handle = await client.searchInstagramHandle('Clínica Sorriso', 'SP');
    expect(handle).toBe('clinicasorriso');
  });

  it('searches Meta Ads Library successfully via Google SERP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { link: 'https://www.facebook.com/ads/library/?id=123456789' },
          ],
        }),
      }),
    );

    const result = await client.searchMetaAdsLibrary('Clínica Sorriso');
    expect(result.hasAds).toBe(true);
    expect(result.adsLibraryUrl).toBe('https://www.facebook.com/ads/library/?id=123456789');
    expect(result.foundLinks).toHaveLength(1);
  });

  it('provides clean fallback Meta Ads Library URL when no ads found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      }),
    );

    const result = await client.searchMetaAdsLibrary('Padaria do Zé');
    expect(result.hasAds).toBe(false);
    expect(result.adsLibraryUrl).toContain('facebook.com/ads/library');
    expect(result.adsLibraryUrl).toContain('Padaria%20do%20Z%C3%A9');
  });
});
