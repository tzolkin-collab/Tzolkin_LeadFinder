import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstagramTool, InstagramInputSchema } from './instagram.tool.js';

describe('InstagramInputSchema', () => {
  it('accepts valid input', () => {
    const result = InstagramInputSchema.safeParse({ businessName: 'Salão Beleza' });
    expect(result.success).toBe(true);
  });

  it('rejects short businessName', () => {
    const result = InstagramInputSchema.safeParse({ businessName: 'a' });
    expect(result.success).toBe(false);
  });
});

describe('InstagramTool', () => {
  let tool: InstagramTool;

  beforeEach(() => {
    tool = new InstagramTool('fake-serper-key');
    vi.restoreAllMocks();
  });

  it('uses Serper API when key is available and extracts handle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('serper.dev')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              organic: [
                { link: 'https://www.instagram.com/salaobelezatom/' },
                { link: 'https://www.instagram.com/salaobelezatom/' },
              ],
            }),
          });
        }
        if (url.includes('instagram.com/salaobelezatom')) {
          return Promise.resolve({
            ok: true,
            text: async () => `
              <html>
                <head>
                  <meta property="og:description" content="1,500 Followers, 200 Following, 45 Posts - Salão Beleza - https://linktr.ee/salaobeleza" />
                  <meta property="og:image" content="https://instagram.com/pic.jpg" />
                </head>
              </html>
            `,
          });
        }
        if (url.includes('linktr.ee')) {
          return Promise.resolve({
            ok: true,
            text: async () => `
              <html>
                <body>
                  <a href="https://wa.me/5511999998888">Fale pelo WhatsApp</a>
                  <a href="https://salaobeleza.com.br">Nosso Site</a>
                </body>
              </html>
            `,
          });
        }
        return Promise.resolve({ ok: false });
      }),
    );

    const result = await tool.execute({ businessName: 'Salão Beleza', location: 'SP' });

    expect(result.success).toBe(true);
    expect(result.data?.handle).toBe('salaobelezatom');
    expect(result.data?.followers).toBe('1,500');
    expect(result.data?.posts).toBe(45);
    expect(result.data?.website).toBe('https://linktr.ee/salaobeleza');
    expect(result.data?.extraLinks).toHaveLength(2);
    expect(result.data?.extraLinks?.[0]?.type).toBe('whatsapp');
    expect(result.data?.extraLinks?.[1]?.type).toBe('website');
  });

  it('returns empty profile data gracefully when no handle found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      }),
    );

    const result = await tool.execute({ businessName: 'Inexistente Empresa XYZ 9999' });

    expect(result.success).toBe(true);
    expect(result.data?.handle).toBeNull();
    expect(result.data?.followers).toBeNull();
  });

  it('produces valid Anthropic and OpenAI tool definitions', () => {
    const anthropic = tool.toAnthropicTool();
    expect(anthropic.name).toBe('instagram_profile_search');
    expect(anthropic.input_schema.required).toContain('businessName');

    const openAI = tool.toOpenAITool();
    expect(openAI.function.name).toBe('instagram_profile_search');
  });
});
