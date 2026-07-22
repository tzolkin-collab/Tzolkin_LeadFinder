import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewPipeline } from './review.pipeline.js';
import type { Business } from '../tools/google-places.tool.js';

const mockBusiness: Business = {
  placeId: 'place_123',
  name: 'Salão Estilo & Beleza',
  address: 'Rua das Flores, 10, SP',
  phone: '+55 11 98888-7777',
  category: 'beauty_salon',
  rating: 4.9,
  reviewCount: 200,
  hasWebsite: false,
  websiteUrl: null,
  googleMapsUrl: 'https://maps.google.com/?cid=123',
  latitude: -23.55,
  longitude: -46.63,
  photoResourceNames: [],
  openingHours: 'Seg-Sáb: 9h-19h',
};

describe('ReviewPipeline', () => {
  let pipeline: ReviewPipeline;

  beforeEach(() => {
    pipeline = new ReviewPipeline({
      serperApiKey: 'fake-serper-key',
      metaAdsAccessToken: undefined,
      openAiApiKey: 'fake-openai-key',
    });
    vi.restoreAllMocks();
  });

  it('runs end-to-end enrichment pipeline smoothly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('serper.dev')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              organic: [{ link: 'https://www.instagram.com/salaoestilo/' }],
            }),
          });
        }
        if (url.includes('instagram.com/salaoestilo')) {
          return Promise.resolve({
            ok: true,
            text: async () => `
              <html>
                <head>
                  <meta property="og:description" content="2,000 Followers, 50 Posts - Salão Estilo" />
                </head>
              </html>
            `,
          });
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      suitabilityScore: 9,
                      summary: 'Excelente lead local.',
                      strengths: ['Reviews altos'],
                      challenges: ['Sem site'],
                      approachSuggestion: 'Oferecer site com agendamento.',
                      estimatedBudget: 'R$ 2.500',
                      priority: 'alta',
                      suggestedFeatures: ['Agendamento'],
                    }),
                  },
                },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: false });
      }),
    );

    const result = await pipeline.run({ business: mockBusiness });

    expect(result.business.name).toBe('Salão Estilo & Beleza');
    expect(result.instagram.handle).toBe('salaoestilo');
    expect(result.metaAds.adsLibraryUrl).toContain('facebook.com/ads/library');
    expect(result.aiReview.suitabilityScore).toBe(9);
    expect(result.reviewedAt).toBeInstanceOf(Date);
  });
});
