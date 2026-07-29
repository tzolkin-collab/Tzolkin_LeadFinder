import { describe, expect, it } from 'vitest';
import { hashPayload } from './observation.service.js';
import { computeConfidence } from './canonical-field.service.js';

describe('hashPayload', () => {
  it('ignora a ordem das chaves', () => {
    // Se isto falhar, o dedup para de funcionar e a tabela de observações
    // incha com snapshots idênticos vindos em ordem diferente.
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });

  it('ignora a ordem em objetos aninhados', () => {
    expect(hashPayload({ x: { p: 1, q: 2 } })).toBe(hashPayload({ x: { q: 2, p: 1 } }));
  });

  it('preserva a ordem de arrays', () => {
    // Ordem de array é informação: 3 criativos numa ordem não é o mesmo
    // conjunto que os mesmos 3 noutra, quando a ordem vem da fonte.
    expect(hashPayload([1, 2])).not.toBe(hashPayload([2, 1]));
  });

  it('distingue payloads diferentes', () => {
    expect(hashPayload({ ads: 6 })).not.toBe(hashPayload({ ads: 7 }));
  });

  it('trata undefined e ausência como equivalentes', () => {
    expect(hashPayload({ a: 1, b: undefined })).toBe(hashPayload({ a: 1 }));
  });

  it('distingue null de ausente', () => {
    expect(hashPayload({ a: 1, b: null })).not.toBe(hashPayload({ a: 1 }));
  });
});

describe('computeConfidence', () => {
  it('uma confirmação isolada vale meia confiança', () => {
    expect(computeConfidence(1, 0)).toBe(0.5);
  });

  it('cresce com confirmações independentes', () => {
    expect(computeConfidence(3, 0)).toBe(0.75);
    expect(computeConfidence(9, 0)).toBe(0.9);
  });

  it('nunca chega a 1 — nenhum dado observado é certeza', () => {
    expect(computeConfidence(1000, 0)).toBeLessThan(1);
  });

  it('contradição derruba a confiança', () => {
    expect(computeConfidence(1, 1)).toBeLessThan(computeConfidence(1, 0));
  });

  it('valor confirmado duas vezes ganha de valor desmentido', () => {
    // O caso que importa na prática: dois telefones concorrentes para o mesmo
    // negócio. O que foi visto duas vezes tem que ficar na frente.
    expect(computeConfidence(2, 0)).toBeGreaterThan(computeConfidence(1, 1));
  });

  it('sem confirmação nenhuma a confiança é zero', () => {
    expect(computeConfidence(0, 2)).toBe(0);
  });
});
