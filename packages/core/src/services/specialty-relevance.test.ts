import { describe, it, expect } from 'vitest';
import {
  relevanceFor,
  combineRelevance,
  isSignalRelevant,
  SPECIALTY_LABELS,
} from './specialty-relevance.service.js';

describe('specialty-relevance', () => {
  it('dá sinal primário de site para quem vende site', () => {
    const rel = relevanceFor('DESENVOLVIMENTO_WEB');
    expect(rel.primary).toContain('SEM_SITE');
    expect(rel.poorlyCovered).toBe(false);
  });

  it('para tráfego pago, SEM_SITE é agravante e não a oferta principal', () => {
    const rel = relevanceFor('TRAFEGO_PAGO');
    expect(rel.primary).toContain('COMECOU_A_ANUNCIAR');
    expect(rel.primary).not.toContain('SEM_SITE');
    expect(rel.secondary).toContain('SEM_SITE');
  });

  it('declara a lacuna de design em vez de fingir cobertura', () => {
    const rel = relevanceFor('DESIGN_BRANDING');
    expect(rel.primary).toHaveLength(0);
    expect(rel.poorlyCovered).toBe(true);
    expect(rel.coverageGap).toBeTruthy();
  });

  it('une especialidades sem perder primário de nenhuma', () => {
    const combined = combineRelevance(['DESENVOLVIMENTO_WEB', 'TRAFEGO_PAGO']);
    expect(combined.primary).toContain('SEM_SITE'); // primário do dev
    expect(combined.primary).toContain('COMECOU_A_ANUNCIAR'); // primário do tráfego
    expect(combined.noPrimaryCoverage).toBe(false);
  });

  it('promove a primário o sinal que é secundário em outra especialidade', () => {
    // SEM_SITE é primário em DESENVOLVIMENTO_WEB e secundário em TRAFEGO_PAGO.
    const combined = combineRelevance(['DESENVOLVIMENTO_WEB', 'TRAFEGO_PAGO']);
    expect(combined.primary).toContain('SEM_SITE');
    expect(combined.secondary).not.toContain('SEM_SITE');
  });

  it('acumula as lacunas de cada especialidade escolhida', () => {
    const combined = combineRelevance(['DESIGN_BRANDING', 'AUTOMACAO_IA']);
    expect(combined.gaps).toHaveLength(2);
    expect(combined.gaps.map((g) => g.specialty)).toEqual(
      expect.arrayContaining(['DESIGN_BRANDING', 'AUTOMACAO_IA']),
    );
  });

  it('sinaliza ausência total de cobertura primária, sem inventar default', () => {
    const combined = combineRelevance(['DESIGN_BRANDING']);
    expect(combined.primary).toHaveLength(0);
    expect(combined.noPrimaryCoverage).toBe(true);
    // Ainda oferece secundário — é o que dá pra fazer honestamente hoje.
    expect(combined.secondary.length).toBeGreaterThan(0);
  });

  it('lista vazia não filtra nada (usuário sem perfil configurado)', () => {
    const combined = combineRelevance([]);
    expect(combined.all).toHaveLength(0);
    expect(combined.noPrimaryCoverage).toBe(true);
    expect(isSignalRelevant('SEM_SITE', [])).toBe(true);
  });

  it('filtra sinal irrelevante para a especialidade', () => {
    // Quem só faz automação não se importa com "publicou site".
    expect(isSignalRelevant('PUBLICOU_SITE', ['AUTOMACAO_IA'])).toBe(false);
    expect(isSignalRelevant('WHATSAPP_COMERCIAL', ['AUTOMACAO_IA'])).toBe(true);
  });

  it('todo valor do enum tem rótulo e entrada de relevância', () => {
    const specialties = Object.keys(SPECIALTY_LABELS) as Array<keyof typeof SPECIALTY_LABELS>;
    expect(specialties).toHaveLength(8);
    for (const s of specialties) {
      expect(SPECIALTY_LABELS[s]).toBeTruthy();
      expect(relevanceFor(s)).toBeDefined();
    }
  });
});
