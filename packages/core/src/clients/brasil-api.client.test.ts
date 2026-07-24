import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrasilApiClient } from './brasil-api.client.js';
import { InMemoryCacheService } from '../services/cache.service.js';

describe('BrasilApiClient', () => {
  let client: BrasilApiClient;

  beforeEach(() => {
    client = new BrasilApiClient();
    vi.restoreAllMocks();
  });

  it('returns null for invalid CNPJ length', async () => {
    const result = await client.getCnpj('123');
    expect(result).toBeNull();
  });

  it('fetches and caches CNPJ data', async () => {
    const cache = new InMemoryCacheService();
    const cachedClient = new BrasilApiClient({ cacheService: cache });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cnpj: '12345678000190',
        razao_social: 'Empresa Teste Ltda',
        nome_fantasia: 'Empresa Teste',
        descricao_situacao_cadastral: 'ATIVA',
        cnae_fiscal_descricao: 'Comércio varejista',
        capital_social: 50000,
        qsa: [{ nome_socio: 'João Silva', qualificacao_socio: 'Sócio-Administrador' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await cachedClient.getCnpj('12.345.678/0001-90');
    expect(first?.razao_social).toBe('Empresa Teste Ltda');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await cachedClient.getCnpj('12.345.678/0001-90');
    expect(second?.razao_social).toBe('Empresa Teste Ltda');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const result = await client.getCnpj('12345678000190');
    expect(result).toBeNull();
  });
});
