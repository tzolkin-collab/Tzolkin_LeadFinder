import { prisma } from '../index.js';
import type { CanonicalBusiness } from '@prisma/client';

export interface ResolveCanonicalInput {
  placeId?: string | null;
  cnpj?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  cnaeCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Raio, em graus, para considerar dois registros o mesmo ponto (~150 m). */
const GEO_TOLERANCE = 0.0015;

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function onlyDigits(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * Encontra o registro canônico de um negócio, criando-o se ainda não existir.
 *
 * A ordem de resolução importa: `placeId` é o identificador mais confiável
 * porque vem do Google; `cnpj` é confiável mas nem sempre está presente; a
 * busca por nome + geo é o último recurso e só aceita coincidência dentro de
 * ~150 m, para não fundir duas filiais da mesma rede num registro só.
 */
export async function resolveCanonicalBusiness(
  input: ResolveCanonicalInput,
): Promise<CanonicalBusiness> {
  const cnpj = onlyDigits(input.cnpj);

  if (input.placeId) {
    const byPlace = await prisma.canonicalBusiness.findUnique({
      where: { placeId: input.placeId },
    });
    if (byPlace) return enrichIfEmpty(byPlace, input, cnpj);
  }

  if (cnpj) {
    const byCnpj = await prisma.canonicalBusiness.findUnique({ where: { cnpj } });
    if (byCnpj) return enrichIfEmpty(byCnpj, input, cnpj);
  }

  if (input.latitude != null && input.longitude != null) {
    const nearby = await prisma.canonicalBusiness.findMany({
      where: {
        latitude: { gte: input.latitude - GEO_TOLERANCE, lte: input.latitude + GEO_TOLERANCE },
        longitude: { gte: input.longitude - GEO_TOLERANCE, lte: input.longitude + GEO_TOLERANCE },
      },
      take: 25,
    });

    const target = normalizeName(input.name);
    const match = nearby.find((candidate) => normalizeName(candidate.name) === target);
    if (match) return enrichIfEmpty(match, input, cnpj);
  }

  return prisma.canonicalBusiness.create({
    data: {
      placeId: input.placeId ?? null,
      cnpj,
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      category: input.category ?? null,
      cnaeCode: input.cnaeCode ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    },
  });
}

/**
 * Preenche apenas os campos de identidade que ainda estão vazios. Nunca
 * sobrescreve valor existente — divergência de valor é assunto do
 * canonical-field.service, que trata conferência e contradição.
 */
async function enrichIfEmpty(
  current: CanonicalBusiness,
  input: ResolveCanonicalInput,
  cnpj: string | null,
): Promise<CanonicalBusiness> {
  const patch: Record<string, unknown> = {};

  if (!current.placeId && input.placeId) patch.placeId = input.placeId;
  if (!current.cnpj && cnpj) patch.cnpj = cnpj;
  if (!current.address && input.address) patch.address = input.address;
  if (!current.city && input.city) patch.city = input.city;
  if (!current.state && input.state) patch.state = input.state;
  if (!current.category && input.category) patch.category = input.category;
  if (!current.cnaeCode && input.cnaeCode) patch.cnaeCode = input.cnaeCode;
  if (current.latitude == null && input.latitude != null) patch.latitude = input.latitude;
  if (current.longitude == null && input.longitude != null) patch.longitude = input.longitude;

  if (Object.keys(patch).length === 0) return current;

  return prisma.canonicalBusiness.update({
    where: { id: current.id },
    data: patch,
  });
}

/**
 * Liga o registro privado de um tenant ao canônico e incrementa
 * `observerCount` apenas na primeira vez que aquele tenant vê o negócio.
 *
 * `observerCount` alimenta a confiança agregada e NUNCA é exposto na interface.
 */
export async function linkTenantBusiness(
  businessId: string,
  canonicalId: string,
): Promise<void> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { canonicalId: true, tenantId: true },
  });

  if (!business || business.canonicalId === canonicalId) return;

  const tenantAlreadyObserved = await prisma.business.count({
    where: { tenantId: business.tenantId, canonicalId, id: { not: businessId } },
  });

  await prisma.$transaction([
    prisma.business.update({
      where: { id: businessId },
      data: { canonicalId },
    }),
    ...(tenantAlreadyObserved === 0
      ? [
          prisma.canonicalBusiness.update({
            where: { id: canonicalId },
            data: { observerCount: { increment: 1 } },
          }),
        ]
      : []),
  ]);
}
