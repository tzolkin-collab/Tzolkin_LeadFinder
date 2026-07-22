import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaAdsTool, MetaAdsInputSchema } from './meta-ads.tool.js';

describe('MetaAdsInputSchema', () => {
  it('accepts valid input and sets BR default country', () => {
    const result = MetaAdsInputSchema.safeParse({ businessName: 'Clínica Sorriso' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('BR');
    }
  });

  it('rejects businessName shorter than 2 chars', () => {
    const result = MetaAdsInputSchema.safeParse({ businessName: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('MetaAdsTool', () => {
  let tool: MetaAdsTool;

  beforeEach(() => {
    tool = new MetaAdsTool('fake-meta-access-token');
    vi.restoreAllMocks();
  });

  it('returns active ads when Meta API responds successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'ad_100', page_id: 'p_1', page_name: 'Clínica Sorriso', ad_snapshot_url: 'https://facebook.com/ads/100' },
            { id: 'ad_101', page_id: 'p_1', page_name: 'Clínica Sorriso', ad_snapshot_url: 'https://facebook.com/ads/101' },
          ],
        }),
      }),
    );

    const result = await tool.execute({ businessName: 'Clínica Sorriso' });

    expect(result.success).toBe(true);
    expect(result.data?.hasAds).toBe(true);
    expect(result.data?.count).toBe(2);
    expect(result.data?.ads[0]?.id).toBe('ad_100');
  });

  it('returns count 0 and hasAds false when no token configured', async () => {
    const unconfiguredTool = new MetaAdsTool(undefined);
    const result = await unconfiguredTool.execute({ businessName: 'Qualquer Negócio' });

    expect(result.success).toBe(true);
    expect(result.data?.hasAds).toBe(false);
    expect(result.data?.count).toBe(0);
  });

  it('does NOT leak access token in error message on API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const result = await tool.execute({ businessName: 'Empresa Teste' });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain('fake-meta-access-token');
    expect(result.error).toContain('401');
  });

  it('exports Anthropic and OpenAI tool definitions', () => {
    const anthropic = tool.toAnthropicTool();
    expect(anthropic.name).toBe('meta_ads_check');

    const openAI = tool.toOpenAITool();
    expect(openAI.function.name).toBe('meta_ads_check');
  });
});
