import { prisma } from '../index.js';
import type { CanonicalField, ObservationSource } from '@prisma/client';

/**
 * Confiança de um valor, entre 0 e 1.
 *
 * Assintótica: uma confirmação isolada vale 0,5; três valem 0,75; nunca chega a
 * 1, porque nenhum dado observado é certeza. Contradição pesa igual a uma
 * confirmação a menos — telefone visto uma vez e desmentido uma vez cai para
 * 0,33 e sai da frente de um valor confirmado duas vezes.
 */
export function computeConfidence(confirmations: number, contradictions: number): number {
  const total = confirmations + contradictions + 1;
  return Number((confirmations / total).toFixed(4));
}

export interface RecordFieldInput {
  canonicalId: string;
  /** Nome do campo: `phone`, `whatsapp`, `instagram`, `website`, `email`. */
  key: string;
  value: string;
  source: ObservationSource;
}

/**
 * Registra a observação de um valor de campo e aplica a conferência.
 *
 * Valor igual ao que já existe sobe `confirmations`. Valor diferente para a
 * mesma chave marca `contradictions` nos concorrentes — nenhum é apagado, para
 * que a divergência fique visível e possa ser resolvida por nova coleta.
 */
export async function recordField(input: RecordFieldInput): Promise<CanonicalField> {
  const value = input.value.trim();
  if (!value) throw new Error('recordField: valor vazio');

  const existing = await prisma.canonicalField.findUnique({
    where: {
      canonicalId_key_value: {
        canonicalId: input.canonicalId,
        key: input.key,
        value,
      },
    },
  });

  if (existing) {
    const confirmations = existing.confirmations + 1;
    return prisma.canonicalField.update({
      where: { id: existing.id },
      data: {
        confirmations,
        confidence: computeConfidence(confirmations, existing.contradictions),
        lastConfirmedAt: new Date(),
        source: input.source,
      },
    });
  }

  // Valor novo para uma chave que já tinha outro valor: os anteriores passam a
  // carregar uma contradição. Não apagamos nenhum — a divergência é informação.
  const rivals = await prisma.canonicalField.findMany({
    where: { canonicalId: input.canonicalId, key: input.key },
  });

  const created = await prisma.$transaction(async (tx) => {
    for (const rival of rivals) {
      const contradictions = rival.contradictions + 1;
      await tx.canonicalField.update({
        where: { id: rival.id },
        data: {
          contradictions,
          confidence: computeConfidence(rival.confirmations, contradictions),
        },
      });
    }

    return tx.canonicalField.create({
      data: {
        canonicalId: input.canonicalId,
        key: input.key,
        value,
        source: input.source,
        confirmations: 1,
        contradictions: 0,
        confidence: computeConfidence(1, 0),
      },
    });
  });

  return created;
}

/**
 * O valor mais confiável de uma chave. Empate desempata pela confirmação mais
 * recente — dado igualmente confiável, o mais novo ganha.
 */
export async function bestValue(
  canonicalId: string,
  key: string,
): Promise<CanonicalField | null> {
  const [best] = await prisma.canonicalField.findMany({
    where: { canonicalId, key },
    orderBy: [{ confidence: 'desc' }, { lastConfirmedAt: 'desc' }],
    take: 1,
  });
  return best ?? null;
}

/** Todos os campos de um negócio, agrupados por chave e ordenados por confiança. */
export async function fieldsByKey(
  canonicalId: string,
): Promise<Record<string, CanonicalField[]>> {
  const rows = await prisma.canonicalField.findMany({
    where: { canonicalId },
    orderBy: [{ confidence: 'desc' }, { lastConfirmedAt: 'desc' }],
  });

  return rows.reduce<Record<string, CanonicalField[]>>((acc, row) => {
    (acc[row.key] ??= []).push(row);
    return acc;
  }, {});
}

/** Chaves com mais de um valor vivo — candidatas a re-coleta. */
export async function contestedKeys(canonicalId: string): Promise<string[]> {
  const grouped = await prisma.canonicalField.groupBy({
    by: ['key'],
    where: { canonicalId },
    _count: { value: true },
    having: { value: { _count: { gt: 1 } } },
  });

  return grouped.map((row) => row.key);
}
