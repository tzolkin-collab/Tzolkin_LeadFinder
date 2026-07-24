import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CnpjTool } from './cnpj.tool.js';
import { SerperClient } from '../clients/serper.client.js';
import { InMemoryCacheService } from '../services/cache.service.js';

describe('CnpjTool', () => {
  let serperClient: SerperClient;
  let cache: InMemoryCacheService;
  let tool: CnpjTool;

  beforeEach(() => {
    serperClient = new SerperClient({ apiKey: 'fake-serper-key' });
    cache = new InMemoryCacheService();
    tool = new CnpjTool(serperClient, cache);
    vi.restoreAllMocks();
  });

  it('extracts CNPJ from website when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('brasilapi.com.br')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              cnpj: '12345678000190',
              razao_social: 'Salão Estilo Ltda',
              descricao_situacao_cadastral: 'ATIVA',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          text: async () => '<html><body>CNPJ 12.345.678/0001-90</body></html>',
        });
      }),
    );

    const result = await tool.execute({
      businessName: 'Salão Estilo',
      placeId: 'place_website',
      websiteUrl: 'https://salaestilo.com.br',
    });

    expect(result.success).toBe(true);
    expect(result.data?.cnpj).toBe('12345678000190');
    expect(result.data?.source).toBe('WEBSITE');
  });

  it('falls back to Serper search when website has no CNPJ', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('serper.dev')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              organic: [{ snippet: 'CNPJ 98.765.432/0001-10' }],
            }),
          });
        }
        if (url.includes('brasilapi.com.br')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              cnpj: '98765432000110',
              razao_social: 'Empresa Serper Ltda',
              descricao_situacao_cadastral: 'ATIVA',
            }),
          });
        }
        return Promise.resolve({ ok: false });
      }),
    );

    const result = await tool.execute({
      businessName: 'Empresa Serper',
      placeId: 'place_serper',
      city: 'São Paulo',
    });

    expect(result.success).toBe(true);
    expect(result.data?.cnpj).toBe('98765432000110');
    expect(result.data?.source).toBe('SERPER');
  });

  it('returns failure when CNPJ is not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      }),
    );

    const result = await tool.execute({
      businessName: 'Empresa Inexistente',
      placeId: 'place_notfound',
    });

    expect(result.success).toBe(false);
  });
});
