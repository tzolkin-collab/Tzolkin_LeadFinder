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
