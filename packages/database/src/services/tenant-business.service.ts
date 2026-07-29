import { prisma } from '../index.js';
import type { ReportStatus, SignalType } from '@prisma/client';

export interface ListTenantBusinessesInput {
  search?: string | undefined;
  status?: ReportStatus | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ListTenantBusinessesResult {
  businesses: Awaited<ReturnType<typeof prisma.business.findMany>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Única fonte de verdade para "listar negócios do tenant". Antes desta
 * função, `search.routes.ts` e `businesses.routes.ts` reimplementavam a
 * mesma query cada um do seu jeito, com contratos diferentes (uma paginava,
 * a outra não). Feed, tools do Tracer (`consultar_base`) e uma futura
 * página Pipeline devem chamar esta função, não o Prisma direto.
 */
export async function listTenantBusinesses(
  tenantId: string,
  input: ListTenantBusinessesInput = {},
): Promise<ListTenantBusinessesResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = { tenantId };

  if (input.search) {
    whereClause.name = { contains: input.search, mode: 'insensitive' };
  }

  if (input.status) {
    whereClause.report = { is: { status: input.status } };
  }

  const [total, businesses] = await Promise.all([
    prisma.business.count({ where: whereClause }),
    prisma.business.findMany({
      where: whereClause,
      include: { report: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    businesses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export interface NicheSignalBucket {
  category: string;
  /** Negócios deste tenant nesta categoria. */
  total: number;
  /** Quantos têm ao menos um sinal relevante para a especialidade do usuário. */
  withRelevantSignal: number;
  withRelevantSignalPct: number;
  /** Quantas vezes cada tipo de sinal relevante apareceu nesta categoria. */
  signalCounts: Record<string, number>;
}

export interface NicheSignalResult {
  buckets: NicheSignalBucket[];
  totalBusinesses: number;
  /** Sinais que a agregação considerou — eco do que o chamador pediu. */
  signalTypesConsidered: SignalType[];
}

/** Abaixo disto, uma % por categoria é ruído, não sinal. */
const MIN_CATEGORY_SAMPLE = 2;

export interface AggregateNicheSignalInput {
  /**
   * Tipos de sinal que importam para este usuário. Vem de fora de propósito:
   * quem traduz "especialidade → sinal relevante" é
   * `packages/core/specialty-relevance.service.ts`, e esta camada não pode
   * importar de `core` (a dependência é core → database, não o contrário).
   * Lista vazia = nenhum sinal relevante; devolve buckets vazios em vez de
   * cair num default arbitrário.
   */
  signalTypes: SignalType[];
  topN?: number;
}

/**
 * Distribuição de sinal por categoria, só dos negócios que este tenant já
 * mapeou — e só dos sinais que importam para a especialidade dele.
 *
 * A primeira versão disto agregava apenas `hasWebsite`, o que era inútil para
 * quem não vende site: um designer não tem o que fazer com "50% não tem site".
 * Ver ADR de perfil de usuário. Não é (e não pode ser) "demanda nacional por
 * serviço" — a base observa presença digital pública, nunca qual serviço um
 * negócio contratou.
 */
export async function aggregateNicheSignal(
  tenantId: string,
  input: AggregateNicheSignalInput,
): Promise<NicheSignalResult> {
  const topN = input.topN ?? 4;

  const businesses = await prisma.business.findMany({
    where: { tenantId, category: { not: null } },
    select: { category: true, canonicalId: true },
  });

  if (input.signalTypes.length === 0) {
    return { buckets: [], totalBusinesses: businesses.length, signalTypesConsidered: [] };
  }

  const canonicalIds = businesses
    .map((b) => b.canonicalId)
    .filter((id): id is string => id !== null);

  const signals =
    canonicalIds.length > 0
      ? await prisma.signal.findMany({
          where: { canonicalId: { in: canonicalIds }, type: { in: input.signalTypes } },
          select: { canonicalId: true, type: true },
        })
      : [];

  // canonicalId → tipos de sinal relevantes encontrados nele.
  const signalsByCanonical = new Map<string, Set<SignalType>>();
  for (const s of signals) {
    const set = signalsByCanonical.get(s.canonicalId) ?? new Set<SignalType>();
    set.add(s.type);
    signalsByCanonical.set(s.canonicalId, set);
  }

  const grouped = new Map<
    string,
    { total: number; withRelevantSignal: number; signalCounts: Record<string, number> }
  >();

  for (const b of businesses) {
    const category = b.category as string;
    const entry =
      grouped.get(category) ?? { total: 0, withRelevantSignal: 0, signalCounts: {} };
    entry.total += 1;

    const found = b.canonicalId ? signalsByCanonical.get(b.canonicalId) : undefined;
    if (found && found.size > 0) {
      entry.withRelevantSignal += 1;
      for (const type of found) {
        entry.signalCounts[type] = (entry.signalCounts[type] ?? 0) + 1;
      }
    }

    grouped.set(category, entry);
  }

  const buckets = Array.from(grouped.entries())
    .filter(([, v]) => v.total >= MIN_CATEGORY_SAMPLE)
    .map(([category, v]) => ({
      category,
      total: v.total,
      withRelevantSignal: v.withRelevantSignal,
      withRelevantSignalPct: Math.round((v.withRelevantSignal / v.total) * 100),
      signalCounts: v.signalCounts,
    }))
    // Categoria com mais negócios com sinal relevante primeiro — é onde há
    // mais o que fazer, não onde há mais cadastro.
    .sort((a, b) => b.withRelevantSignal - a.withRelevantSignal || b.total - a.total)
    .slice(0, topN);

  return {
    buckets,
    totalBusinesses: businesses.length,
    signalTypesConsidered: input.signalTypes,
  };
}
