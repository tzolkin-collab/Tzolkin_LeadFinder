import { describe, expect, it } from 'vitest';
import {
  decideTaxonomyAction,
  normalizeSlug,
  similarity,
  TAXONOMY_LIMITS,
  type ExistingSubcategory,
  type TaxonomyAction,
  type DecideInput,
} from './service-taxonomy.service.js';

// ─── Helpers de simulação ─────────────────────────────────────────────────

let idSeq = 0;
function sub(partial: Partial<ExistingSubcategory> & { slug: string }): ExistingSubcategory {
  return {
    id: `sub-${++idSeq}`,
    label: partial.slug,
    aliases: [],
    status: 'ACTIVE',
    confirmations: 1,
    proposedByTenantIds: [],
    mergedIntoId: null,
    ...partial,
  };
}

/**
 * Aplica a decisão a um estado em memória — replica o que o resolver faz no
 * banco. Sem isto não é possível simular sequência e provar convergência.
 */
function applyAction(state: ExistingSubcategory[], action: TaxonomyAction, tenantId: string): void {
  switch (action.kind) {
    case 'CREATE_PENDING':
      state.push(
        sub({
          slug: action.slug,
          label: action.label,
          status: 'PENDING',
          confirmations: 1,
          proposedByTenantIds: [tenantId],
        }),
      );
      break;
    case 'PROMOTE': {
      const target = state.find((s) => s.id === action.subcategoryId);
      if (target) {
        target.status = 'ACTIVE';
        target.confirmations += 1;
        target.proposedByTenantIds.push(tenantId);
      }
      break;
    }
    case 'CONFIRM_PENDING': {
      const target = state.find((s) => s.id === action.subcategoryId);
      if (target && action.countsAsNewConfirmation) {
        target.confirmations += 1;
        target.proposedByTenantIds.push(tenantId);
      }
      break;
    }
    case 'ABSORB_AS_ALIAS': {
      const target = state.find((s) => s.id === action.subcategoryId);
      if (target) target.aliases.push(action.alias);
      break;
    }
    default:
      break; // LINKED_*, FOLLOW_MERGE e REJECT não mudam estado
  }
}

function propose(
  state: ExistingSubcategory[],
  rawLabel: string,
  tenantId: string,
  tenantProposalsInWindow = 0,
): TaxonomyAction {
  const input: DecideInput = { rawLabel, tenantId, existing: state, tenantProposalsInWindow };
  const action = decideTaxonomyAction(input);
  applyAction(state, action, tenantId);
  return action;
}

// ─── Normalização ─────────────────────────────────────────────────────────

describe('normalizeSlug', () => {
  it('remove acento, caixa e pontuação', () => {
    expect(normalizeSlug('Tráfego  Pago!')).toBe('trafego-pago');
  });

  it('é idempotente — normalizar duas vezes dá o mesmo', () => {
    const once = normalizeSlug('Gestão de Tráfego');
    expect(normalizeSlug(once)).toBe(once);
  });

  it('colapsa variações de escrita no mesmo slug', () => {
    // O caso que mais gera duplicata na prática.
    const forms = ['Tráfego Pago', 'trafego pago', 'TRAFEGO   PAGO', 'tráfego-pago'];
    const slugs = new Set(forms.map(normalizeSlug));
    expect(slugs.size).toBe(1);
  });
});

describe('similarity', () => {
  it('idêntico é 1', () => {
    expect(similarity('trafego-pago', 'trafego pago')).toBe(1);
  });

  it('typo fica acima do limiar de absorção', () => {
    expect(similarity('trafego pago', 'trafego pagoo')).toBeGreaterThanOrEqual(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
  });

  it('termos diferentes ficam abaixo do limiar', () => {
    expect(similarity('trafego pago', 'identidade visual')).toBeLessThan(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
  });

  it('é simétrica', () => {
    expect(similarity('a b c', 'a b d')).toBe(similarity('a b d', 'a b c'));
  });

  it('variante por contenção absorve — o falso-negativo que estava passando', () => {
    // Media 0,80 no Dice puro, logo abaixo do limiar de 0,82, e criava linha
    // duplicada. A regra de contenção resolve.
    expect(similarity('identidade visual', 'identidade visual completa')).toBeGreaterThanOrEqual(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
    expect(similarity('trafego pago', 'gestao de trafego pago')).toBeGreaterThanOrEqual(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
  });

  it('raiz curta NÃO engole termo específico', () => {
    // O abuso oposto da contenção: "seo" não pode virar dono de "seo local".
    // Razões medidas: 0,33 / 0,14 / 0,32 / 0,26 — todas abaixo do piso de 0,5.
    expect(similarity('seo', 'seo local')).toBeLessThan(TAXONOMY_LIMITS.ABSORB_SIMILARITY);
    expect(similarity('web', 'web design responsivo')).toBeLessThan(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
    expect(similarity('design', 'design de embalagem')).toBeLessThan(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
    expect(similarity('video', 'video institucional')).toBeLessThan(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
  });

  it('variante por nicho segue separada — é oferta própria', () => {
    // Razão 0,46, logo abaixo do piso: "social media para clínicas" é uma
    // oferta distinta o bastante para merecer linha própria. É a fronteira
    // mais delicada do piso de 0,5 — se este teste quebrar, o piso mudou.
    expect(similarity('social media', 'social media para clinicas')).toBeLessThan(
      TAXONOMY_LIMITS.ABSORB_SIMILARITY,
    );
  });

  it('contenção exige fronteira de palavra, não substring solta', () => {
    // "arte" está dentro de "cartel", mas não é variante disso.
    expect(similarity('arte', 'cartel')).toBeLessThan(TAXONOMY_LIMITS.ABSORB_SIMILARITY);
  });
});

// ─── Guardrails, um por um ────────────────────────────────────────────────

describe('decideTaxonomyAction — guardrails', () => {
  it('nunca cria ACTIVE direto: termo novo nasce em quarentena', () => {
    const state: ExistingSubcategory[] = [];
    const action = propose(state, 'Automação de inbound com IA', 'tenant-a');
    expect(action.kind).toBe('CREATE_PENDING');
    expect(state[0]!.status).toBe('PENDING');
  });

  it('label curto ou longo demais é recusado antes de qualquer coisa', () => {
    const state: ExistingSubcategory[] = [];
    expect(propose(state, 'ab', 'tenant-a').kind).toBe('REJECT');
    expect(propose(state, 'x'.repeat(61), 'tenant-a').kind).toBe('REJECT');
    expect(state).toHaveLength(0);
  });

  it('variação de escrita casa exato e não cria linha', () => {
    const state = [sub({ slug: 'trafego-pago', label: 'Tráfego pago' })];
    const action = propose(state, 'TRÁFEGO PAGO', 'tenant-a');
    expect(action.kind).toBe('LINKED_EXACT');
    expect(state).toHaveLength(1);
  });

  it('typo é absorvido como alias, não vira linha', () => {
    const state = [sub({ slug: 'trafego-pago', label: 'Tráfego pago' })];
    const action = propose(state, 'trafego pagoo', 'tenant-a');
    expect(action.kind).toBe('ABSORB_AS_ALIAS');
    expect(state).toHaveLength(1);
    expect(state[0]!.aliases).toContain('trafego pagoo');
  });

  it('alias já registrado resolve para a subcategoria dona', () => {
    const state = [
      sub({ slug: 'trafego-pago', label: 'Tráfego pago', aliases: ['mídia paga'] }),
    ];
    const action = propose(state, 'Mídia Paga', 'tenant-a');
    expect(action.kind).toBe('LINKED_ALIAS');
    expect(state).toHaveLength(1);
  });

  it('REJECTED é lembrado — re-propor é no-op, não linha nova', () => {
    // Esta é a garantia de convergência: sem ela, um termo recusado voltaria
    // a criar linha a cada tentativa e a tabela cresceria para sempre.
    const state = [sub({ slug: 'coisa-ruim', status: 'REJECTED' })];
    for (let i = 0; i < 50; i++) {
      const action = propose(state, 'coisa ruim', `tenant-${i}`);
      expect(action.kind).toBe('REJECT');
    }
    expect(state).toHaveLength(1);
  });

  it('MERGED redireciona para quem absorveu', () => {
    const winner = sub({ slug: 'trafego-pago' });
    const loser = sub({ slug: 'gestao-de-trafego', status: 'MERGED', mergedIntoId: winner.id });
    const state = [winner, loser];
    const action = propose(state, 'gestao de trafego', 'tenant-a');
    expect(action).toEqual({ kind: 'FOLLOW_MERGE', subcategoryId: winner.id });
  });

  it('o mesmo tenant propondo várias vezes não infla confirmações', () => {
    const state = [
      sub({ slug: 'novo-servico', status: 'PENDING', confirmations: 1, proposedByTenantIds: ['t1'] }),
    ];
    for (let i = 0; i < 10; i++) propose(state, 'novo servico', 't1');
    expect(state[0]!.confirmations).toBe(1);
    expect(state[0]!.status).toBe('PENDING');
  });

  it('promove só com confirmações independentes suficientes', () => {
    const state = [
      sub({ slug: 'novo-servico', status: 'PENDING', confirmations: 1, proposedByTenantIds: ['t1'] }),
    ];
    propose(state, 'novo servico', 't2');
    expect(state[0]!.status).toBe('PENDING'); // 2 de 3

    propose(state, 'novo servico', 't3');
    expect(state[0]!.status).toBe('ACTIVE'); // cruzou o limiar
  });

  it('rate limit barra criação de linha, mas não barra absorção', () => {
    const overQuota = TAXONOMY_LIMITS.MAX_PROPOSALS_PER_TENANT_PER_WINDOW;

    const fresh: ExistingSubcategory[] = [];
    expect(propose(fresh, 'servico totalmente novo', 't1', overQuota).kind).toBe('REJECT');
    expect(fresh).toHaveLength(0);

    // Mesmo estourado, casar com o que já existe continua funcionando —
    // absorver duplicata é bom e não cria linha.
    const withActive = [sub({ slug: 'trafego-pago', label: 'Tráfego pago' })];
    expect(propose(withActive, 'trafego pagoo', 't1', overQuota).kind).toBe('ABSORB_AS_ALIAS');
  });

  it('teto de PENDING barra nova quarentena', () => {
    const state: ExistingSubcategory[] = [];
    for (let i = 0; i < TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY; i++) {
      state.push(sub({ slug: `pendente-numero-${i}`, status: 'PENDING' }));
    }
    const action = propose(state, 'mais um servico diferente', 't1');
    expect(action).toEqual({ kind: 'REJECT', reason: 'PENDING_CAP_REACHED' });
  });

  it('no teto de ACTIVE, não promove nem com confirmações de sobra', () => {
    const state: ExistingSubcategory[] = [];
    for (let i = 0; i < TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY; i++) {
      state.push(sub({ slug: `ativo-numero-${i}` }));
    }
    state.push(
      sub({
        slug: 'quer-promover',
        status: 'PENDING',
        confirmations: 99,
        proposedByTenantIds: ['t1', 't2'],
      }),
    );

    const action = propose(state, 'quer promover', 't3');
    expect(action.kind).toBe('CONFIRM_PENDING');
    expect(state.filter((s) => s.status === 'ACTIVE')).toHaveLength(
      TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY,
    );
  });
});

// ─── A prova: ataque de volume ────────────────────────────────────────────

describe('convergência sob ataque', () => {
  it('mil propostas distintas de mil tenants NÃO passam do teto de ACTIVE', () => {
    const state: ExistingSubcategory[] = [];

    for (let i = 0; i < 1000; i++) {
      // Sem rate limit (tenant sempre novo) — o pior caso realista: mil
      // pessoas diferentes inventando nome de serviço no mesmo dia.
      propose(state, `servico inventado numero ${i}`, `tenant-${i}`, 0);
    }

    const active = state.filter((s) => s.status === 'ACTIVE');
    const pending = state.filter((s) => s.status === 'PENDING');

    expect(active.length).toBeLessThanOrEqual(TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY);
    expect(pending.length).toBeLessThanOrEqual(TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY);
    // Nada promoveu: cada termo teve 1 confirmação só, ninguém repetiu.
    expect(active).toHaveLength(0);
  });

  it('convergência com repetição: consenso promove, mas o teto continua valendo', () => {
    const state: ExistingSubcategory[] = [];
    const termos = Array.from({ length: 200 }, (_, i) => `servico consensual ${i}`);

    // 5 tenants concordando em cada termo — mais que o limiar de promoção.
    for (const termo of termos) {
      for (let t = 0; t < 5; t++) propose(state, termo, `tenant-${t}`, 0);
    }

    const active = state.filter((s) => s.status === 'ACTIVE');
    expect(active.length).toBeLessThanOrEqual(TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY);

    const total = state.length;
    expect(total).toBeLessThanOrEqual(
      TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY + TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY,
    );
  });

  it('repropor os mesmos termos indefinidamente não cria linha nova', () => {
    const state: ExistingSubcategory[] = [];
    const termos = ['trafego pago', 'landing page', 'identidade visual'];

    for (let round = 0; round < 100; round++) {
      for (const termo of termos) propose(state, termo, `tenant-${round % 7}`, 0);
    }

    // 3 termos → no máximo 3 linhas, não 300.
    expect(state).toHaveLength(3);
  });

  it('limite total do sistema é finito e conhecido', () => {
    // 5 categorias no enum ServiceCategory.
    const CATEGORIES = 5;
    const maxActive = CATEGORIES * TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY;
    const maxPending = CATEGORIES * TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY;

    expect(maxActive).toBe(120);
    expect(maxPending).toBe(250);
    // Se alguém afrouxar um teto sem pensar, este teste quebra e força a
    // decisão a ser explícita.
    expect(maxActive + maxPending).toBeLessThanOrEqual(500);
  });
});
