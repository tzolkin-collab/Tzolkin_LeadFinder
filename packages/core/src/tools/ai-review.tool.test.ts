import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiReviewTool, AiReviewInputSchema } from './ai-review.tool.js';

describe('AiReviewInputSchema', () => {
  it('validates minimal required fields', () => {
    const result = AiReviewInputSchema.safeParse({
      businessName: 'Salão Estilo',
      hasWebsite: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing hasWebsite boolean', () => {
    const result = AiReviewInputSchema.safeParse({
      businessName: 'Salão Estilo',
    });
    expect(result.success).toBe(false);
  });
});

describe('AiReviewTool', () => {
  let tool: AiReviewTool;

  beforeEach(() => {
    tool = new AiReviewTool('fake-openai-key');
    vi.restoreAllMocks();
  });

  it('parses valid AI JSON response and formats output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suitabilityScore: 9,
                  summary: 'Negócio consolidado com alta dor digital.',
                  strengths: ['Possui mais de 100 avaliações no Google', 'Anuncia no Meta Ads'],
                  challenges: ['Pode hesitar em gastar com domínio'],
                  approachSuggestion: 'Destacar aumento de conversão pelo WhatsApp.',
                  estimatedBudget: 'R$ 2.000 - R$ 4.000',
                  priority: 'alta',
                  suggestedFeatures: ['Agendamento online', 'Galeria de fotos'],
                  visualIdentitySuggestions: {
                    style: 'Moderno & Elegante',
                    colors: ['#FF0055', '#111111'],
                    tone: 'Profissional e Acolhedor',
                  },
                }),
              },
            },
          ],
        }),
      }),
    );

    const result = await tool.execute({
      businessName: 'Salão Estilo',
      hasWebsite: false,
      rating: 4.8,
      reviewCount: 120,
      hasActiveAds: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.suitabilityScore).toBe(9);
    expect(result.data?.priority).toBe('alta');
    expect(result.data?.strengths).toHaveLength(2);
    expect(result.data?.visualIdentitySuggestions?.colors[0]).toBe('#FF0055');
  });

  it('returns failure result when OpenAI key is missing', async () => {
    const unconfiguredTool = new AiReviewTool(undefined);
    const result = await unconfiguredTool.execute({
      businessName: 'Salão Estilo',
      hasWebsite: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('OPENAI_API_KEY');
  });

  it('does NOT leak API key on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const result = await tool.execute({
      businessName: 'Salão Estilo',
      hasWebsite: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain('fake-openai-key');
    expect(result.error).toContain('429');
  });

  it('exports Anthropic and OpenAI tool definitions', () => {
    const anthropic = tool.toAnthropicTool();
    expect(anthropic.name).toBe('ai_lead_review');

    const openAI = tool.toOpenAITool();
    expect(openAI.function.name).toBe('ai_lead_review');
  });
});
