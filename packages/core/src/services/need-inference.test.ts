import { describe, expect, it } from 'vitest';
import {
  inferNeeds,
  matchNeedsToProvider,
  NEED_RULES,
} from './need-inference.service.js';

/**
 * Slugs semeados por `seedServiceTaxonomy` em packages/database. Duplicado aqui
 * de propósito: se uma regra apontar para um slug que a semente não cria, a
 * regra dispara e o matching nunca acha o serviço. O teste no fim trava isso.
 */
const SEEDED_SLUGS = [
  'trafego-pago',
  'social-media',
  'seo',
  'email-marketing',
  'site-institucional',
  'landing-page',
  'loja-virtual',
  'sistema-web',
  'identidade-visual',
  'material-grafico',
  'ui-ux',
  'audiovisual',
  'chatbot-atendimento',
  'agente-de-ia',
  'automacao-de-processo',
  'estrategia-comercial',
  'posicionamento-de-marca',
  'dados-e-bi',
];

describe('inferNeeds', () => {
  it('sem sinal nenhum não inventa necessidade', () => {
    expect(inferNeeds([])).toEqual([]);
  });

  it('anuncia + sem site = landing page, por investimento com lacuna', () => {
    const needs = inferNeeds(['COMECOU_A_ANUNCIAR', 'SEM_SITE']);
    const lp = needs.find((n) => n.needsSubcategorySlug === 'landing-page');
    expect(lp).toBeDefined();
    expect(lp!.mechanism).toBe('INVESTIMENTO_COM_LACUNA');
    expect(lp!.evidence).toEqual(['COMECOU_A_ANUNCIAR', 'SEM_SITE']);
  });

  it('só sem site = site institucional, por ausência', () => {
    const needs = inferNeeds(['SEM_SITE']);
    expect(needs).toHaveLength(1);
    expect(needs[0]!.needsSubcategorySlug).toBe('site-institucional');
    expect(needs[0]!.mechanism).toBe('AUSENCIA');
  });

  it('quem anuncia NÃO dispara também a regra de site institucional', () => {
    // Sem a exclusão, todo lead sem site casaria com as duas e o dossiê
    // ficaria repetitivo dizendo a mesma coisa de dois jeitos.
    const needs = inferNeeds(['COMECOU_A_ANUNCIAR', 'SEM_SITE']);
    expect(needs.some((n) => n.ruleId === 'sem-site-nenhum')).toBe(false);
  });

  it('ordena por força comercial: investimento com lacuna vem primeiro', () => {
    const needs = inferNeeds([
      'CNPJ_RECENTE', // ausência
      'COMECOU_A_ANUNCIAR',
      'SEM_SITE', // investimento com lacuna
      'WHATSAPP_COMERCIAL', // saturação (com o anúncio)
    ]);
    expect(needs[0]!.mechanism).toBe('INVESTIMENTO_COM_LACUNA');
    const mechanisms = needs.map((n) => n.mechanism);
    expect(mechanisms.indexOf('SATURACAO')).toBeLessThan(mechanisms.indexOf('AUSENCIA'));
  });

  it('salto de avaliações + whatsapp = saturação de atendimento', () => {
    const needs = inferNeeds(['SALTO_DE_REVIEWS', 'WHATSAPP_COMERCIAL']);
    const chat = needs.find((n) => n.needsSubcategorySlug === 'chatbot-atendimento');
    expect(chat).toBeDefined();
    expect(chat!.mechanism).toBe('SATURACAO');
  });

  it('CNPJ recente dá ao designer a única regra que o serve hoje', () => {
    // A lacuna de sinal visual está declarada em specialty-relevance; esta
    // regra não a substitui, só evita que DESIGN fique sem nada.
    const needs = inferNeeds(['CNPJ_RECENTE']);
    expect(needs[0]!.needsSubcategorySlug).toBe('identidade-visual');
  });

  it('toda tese é fato observado, não adjetivo de venda', () => {
    const proibidos = [
      'alto potencial',
      'grande oportunidade',
      'excelente',
      'ideal',
      'perfeito',
    ];
    for (const rule of NEED_RULES) {
      const lower = rule.thesis.toLowerCase();
      for (const termo of proibidos) {
        expect(lower).not.toContain(termo);
      }
    }
  });

  it('toda regra aponta para um slug que a semente da taxonomia cria', () => {
    // Se isto quebrar, a regra dispara e o matching não encontra o serviço.
    for (const rule of NEED_RULES) {
      expect(SEEDED_SLUGS).toContain(rule.needsSubcategorySlug);
    }
  });
});

describe('matchNeedsToProvider', () => {
  const ANUNCIA_SEM_SITE = ['COMECOU_A_ANUNCIAR', 'SEM_SITE'] as const;

  it('sem perfil configurado não afirma encaixe nem descarte', () => {
    const r = matchNeedsToProvider({
      signals: [...ANUNCIA_SEM_SITE],
      providerSubcategorySlugs: [],
    });
    expect(r.matched).toEqual([]);
    expect(r.unmatched.length).toBeGreaterThan(0);
    expect(r.needsOtherService).toBe(false); // não sabemos, então não afirmamos
    expect(r.strongestMechanism).toBeNull();
  });

  it('quem vende landing page recebe o lead que anuncia sem página', () => {
    const r = matchNeedsToProvider({
      signals: [...ANUNCIA_SEM_SITE],
      providerSubcategorySlugs: ['landing-page'],
    });
    expect(r.matched.map((m) => m.needsSubcategorySlug)).toContain('landing-page');
    expect(r.strongestMechanism).toBe('INVESTIMENTO_COM_LACUNA');
    expect(r.needsOtherService).toBe(false);
  });

  it('designer NÃO recebe esse mesmo lead — e o produto diz por quê', () => {
    // O caso que motivou o Pilar A inteiro: o mesmo negócio não serve pra todo
    // mundo, e fingir que serve é o defeito que estamos corrigindo.
    const r = matchNeedsToProvider({
      signals: [...ANUNCIA_SEM_SITE],
      providerSubcategorySlugs: ['identidade-visual'],
    });
    expect(r.matched).toEqual([]);
    expect(r.needsOtherService).toBe(true);
    expect(r.unmatched.map((u) => u.needsSubcategorySlug)).toContain('landing-page');
  });

  it('designer recebe o lead de CNPJ recente', () => {
    const r = matchNeedsToProvider({
      signals: ['CNPJ_RECENTE', 'SEM_SITE'],
      providerSubcategorySlugs: ['identidade-visual'],
    });
    expect(r.matched.map((m) => m.needsSubcategorySlug)).toContain('identidade-visual');
  });

  it('multi-serviço casa em mais de uma frente', () => {
    const r = matchNeedsToProvider({
      signals: ['COMECOU_A_ANUNCIAR', 'SEM_SITE', 'WHATSAPP_COMERCIAL'],
      providerSubcategorySlugs: ['landing-page', 'chatbot-atendimento'],
    });
    const slugs = r.matched.map((m) => m.needsSubcategorySlug);
    expect(slugs).toContain('landing-page');
    expect(slugs).toContain('chatbot-atendimento');
    // O mais forte lidera o ranking.
    expect(r.strongestMechanism).toBe('INVESTIMENTO_COM_LACUNA');
  });

  it('negócio sem sinal não vira lead pra ninguém', () => {
    const r = matchNeedsToProvider({
      signals: [],
      providerSubcategorySlugs: ['landing-page'],
    });
    expect(r.matched).toEqual([]);
    expect(r.unmatched).toEqual([]);
    expect(r.needsOtherService).toBe(false);
  });
});
