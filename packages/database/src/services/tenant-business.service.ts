import { prisma } from '../index.js';
import type { ReportStatus } from '@prisma/client';

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
  total: number;
  withoutWebsite: number;
  withoutWebsitePct: number;
}

export interface NicheSignalResult {
  buckets: NicheSignalBucket[];
  totalBusinesses: number;
}

/** Abaixo disto, uma % de "sem site" por categoria é ruído, não sinal. */
const MIN_CATEGORY_SAMPLE = 2;

/**
 * Distribuição real de "sem site" por categoria — só dos negócios que este
 * tenant já mapeou. Não é (e não pode ser) "demanda nacional por serviço": a
 * base não sabe qual serviço um negócio contratou, só observa presença
 * digital pública. Fonte #1 do widget de mercado na skill tracer-design —
 * agregação da própria base, zero integração nova.
 */
export async function aggregateNicheSignal(tenantId: string, topN = 4): Promise<NicheSignalResult> {
  const businesses = await prisma.business.findMany({
    where: { tenantId, category: { not: null } },
    select: { category: true, hasWebsite: true },
  });

  const grouped = new Map<string, { total: number; withoutWebsite: number }>();
  for (const b of businesses) {
    const category = b.category as string;
    const entry = grouped.get(category) ?? { total: 0, withoutWebsite: 0 };
    entry.total += 1;
    if (!b.hasWebsite) entry.withoutWebsite += 1;
    grouped.set(category, entry);
  }

  const buckets = Array.from(grouped.entries())
    .filter(([, v]) => v.total >= MIN_CATEGORY_SAMPLE)
    .map(([category, v]) => ({
      category,
      total: v.total,
      withoutWebsite: v.withoutWebsite,
      withoutWebsitePct: Math.round((v.withoutWebsite / v.total) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);

  return { buckets, totalBusinesses: businesses.length };
}
