import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GooglePlacesTool, GooglePlacesInputSchema } from './google-places.tool.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockPlacesResponse = {
  places: [
    {
      id: 'ChIJ_fake_1',
      displayName: { text: 'Salão Beleza Total' },
      formattedAddress: 'Rua das Flores, 100, São Paulo - SP',
      internationalPhoneNumber: '+55 11 99999-0001',
      websiteUri: undefined,
      googleMapsUri: 'https://maps.google.com/?cid=1',
      rating: 4.8,
      userRatingCount: 312,
      primaryType: 'beauty_salon',
      location: { latitude: -23.55, longitude: -46.63 },
      photos: [{ name: 'places/ChIJ_fake_1/photos/photo1' }],
      currentOpeningHours: { weekdayDescriptions: ['Segunda: 9h–18h', 'Terça: 9h–18h'] },
    },
    {
      id: 'ChIJ_fake_2',
      displayName: { text: 'Clínica Saúde Viva' },
      formattedAddress: 'Av. Paulista, 1000, São Paulo - SP',
      internationalPhoneNumber: '+55 11 3000-1234',
      websiteUri: 'https://clinicasaudiviva.com.br',
      googleMapsUri: 'https://maps.google.com/?cid=2',
      rating: 4.5,
      userRatingCount: 87,
      primaryType: 'clinic',
      location: { latitude: -23.56, longitude: -46.64 },
      photos: [],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GooglePlacesInputSchema', () => {
  it('accepts valid minimal input', () => {
    const result = GooglePlacesInputSchema.safeParse({ query: 'salão sp' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radiusMeters).toBe(5_000);
      expect(result.data.onlyWithoutWebsite).toBe(false);
    }
  });

  it('rejects query shorter than 2 chars', () => {
    const result = GooglePlacesInputSchema.safeParse({ query: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects radiusMeters above 50000', () => {
    const result = GooglePlacesInputSchema.safeParse({ query: 'test', radiusMeters: 99_999 });
    expect(result.success).toBe(false);
  });
});

describe('GooglePlacesTool', () => {
  let tool: GooglePlacesTool;

  beforeEach(() => {
    tool = new GooglePlacesTool('test-api-key-fake');
    vi.restoreAllMocks();
  });

  it('throws on missing API key', () => {
    expect(() => new GooglePlacesTool('')).toThrowError('GOOGLE_PLACES_API_KEY');
  });

  it('returns correct ToolResult on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPlacesResponse,
      }),
    );

    const result = await tool.execute({ query: 'Salão São Paulo' });

    expect(result.success).toBe(true);
    expect(result.data?.total).toBe(2);
    expect(result.data?.withoutWebsite).toBe(1);
    expect(result.data?.businesses[0]?.name).toBe('Salão Beleza Total');
    expect(result.data?.businesses[0]?.hasWebsite).toBe(false);
    expect(result.data?.businesses[1]?.hasWebsite).toBe(true);
  });

  it('filters onlyWithoutWebsite correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPlacesResponse,
      }),
    );

    const result = await tool.execute({ query: 'Salão SP', onlyWithoutWebsite: true });

    expect(result.success).toBe(true);
    expect(result.data?.businesses).toHaveLength(1);
    expect(result.data?.businesses[0]?.name).toBe('Salão Beleza Total');
  });

  it('does NOT leak API key in error on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    const result = await tool.execute({ query: 'Salão SP' });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain('test-api-key-fake');
    expect(result.error).toContain('403');
  });

  it('photoResourceNames do not contain API key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPlacesResponse,
      }),
    );

    const result = await tool.execute({ query: 'Salão SP' });
    const photoNames = result.data?.businesses[0]?.photoResourceNames ?? [];

    photoNames.forEach(name => {
      expect(name).not.toContain('test-api-key-fake');
    });
  });

  it('produces valid Anthropic tool definition', () => {
    const def = tool.toAnthropicTool();
    expect(def.name).toBe('google_places_search');
    expect(def.input_schema.type).toBe('object');
    expect(def.input_schema.required).toContain('query');
  });

  it('produces valid OpenAI tool definition', () => {
    const def = tool.toOpenAITool();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('google_places_search');
  });

  it('includes executedAt and durationMs in result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ places: [] }),
      }),
    );

    const result = await tool.execute({ query: 'test query' });

    expect(result.executedAt).toBeInstanceOf(Date);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
