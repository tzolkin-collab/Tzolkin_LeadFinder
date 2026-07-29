import { createHash } from 'node:crypto';
import { prisma } from '../index.js';
import type { ObservationSource } from '@prisma/client';

/**
 * Serializa de forma estável — chaves ordenadas em qualquer profundidade — para
 * que dois payloads com a mesma informação em ordem diferente gerem o mesmo
 * hash. Sem isto o dedup falha silenciosamente e a base incha.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);

  return `{${entries.join(',')}}`;
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

export interface RecordObservationInput {
  canonicalId: string;
  source: ObservationSource;
  payload: unknown;
  /** Quando a fonte diz que o fato aconteceu. Ausente = agora. */
  observedAt?: Date;
  /** Quem provocou a coleta. Usado para custo/billing — nunca sai da camada de dados. */
  triggeredByTenantId?: string | null;
}

export interface RecordObservationResult {
  /** false quando o payload era idêntico ao último e nada foi escrito. */
  created: boolean;
  observationId: string | null;
  payloadHash: string;
}

/**
 * Grava uma observação na base canônica.
 *
 * É append-only por contrato: nunca atualiza uma observação existente. Se o
 * payload for idêntico a um já registrado para o mesmo (canonical, source), a
 * constraint única do banco rejeita e nós tratamos como no-op — é o que mantém
 * a coleta barata e torna o diff trivial.
 */
export async function recordObservation(
  input: RecordObservationInput,
): Promise<RecordObservationResult> {
  const payloadHash = hashPayload(input.payload);

  const existing = await prisma.observation.findUnique({
    where: {
      canonicalId_source_payloadHash: {
        canonicalId: input.canonicalId,
        source: input.source,
        payloadHash,
      },
    },
    select: { id: true },
  });

  if (existing) {
    // Nada mudou desde a última vez. Ainda assim registramos que o negócio foi
    // visto agora — é o que alimenta a política de frescor sem inflar a tabela.
    await prisma.canonicalBusiness.update({
      where: { id: input.canonicalId },
      data: { lastObservedAt: new Date() },
    });
    return { created: false, observationId: null, payloadHash };
  }

  const observation = await prisma.observation.create({
    data: {
      canonicalId: input.canonicalId,
      source: input.source,
      payload: input.payload as never,
      payloadHash,
      observedAt: input.observedAt ?? new Date(),
      triggeredByTenantId: input.triggeredByTenantId ?? null,
    },
    select: { id: true },
  });

  await prisma.canonicalBusiness.update({
    where: { id: input.canonicalId },
    data: { lastObservedAt: new Date() },
  });

  return { created: true, observationId: observation.id, payloadHash };
}

/**
 * As duas observações mais recentes de uma fonte, da mais nova para a mais
 * antiga. É a entrada do motor de diff.
 */
export async function latestObservations(
  canonicalId: string,
  source: ObservationSource,
  take = 2,
) {
  return prisma.observation.findMany({
    where: { canonicalId, source },
    orderBy: { observedAt: 'desc' },
    take,
  });
}

/** Idade da observação mais recente, em horas. `null` se nunca foi observado. */
export async function observationAgeHours(
  canonicalId: string,
  source: ObservationSource,
): Promise<number | null> {
  const last = await prisma.observation.findFirst({
    where: { canonicalId, source },
    orderBy: { observedAt: 'desc' },
    select: { observedAt: true },
  });

  if (!last) return null;
  return (Date.now() - last.observedAt.getTime()) / 3_600_000;
}
