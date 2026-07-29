import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

/**
 * Singleton instance of PrismaClient to prevent multiple connections in dev.
 */
export const prisma =
  globalThis.globalPrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}

export * from '@prisma/client';

// ─── Base master canônica ─────────────────────────────────────────────
// Só dado comercial público observado entra aqui. Análise calibrada no ICP do
// tenant fica em BusinessReport; conteúdo de chat é privado por tenant.
export {
  resolveCanonicalBusiness,
  linkTenantBusiness,
  type ResolveCanonicalInput,
} from './services/canonical.service.js';
export {
  recordObservation,
  latestObservations,
  observationAgeHours,
  hashPayload,
  type RecordObservationInput,
  type RecordObservationResult,
} from './services/observation.service.js';
export {
  recordField,
  bestValue,
  fieldsByKey,
  contestedKeys,
  computeConfidence,
  type RecordFieldInput,
} from './services/canonical-field.service.js';
export {
  listTenantBusinesses,
  aggregateNicheSignal,
  type ListTenantBusinessesInput,
  type ListTenantBusinessesResult,
  type NicheSignalBucket,
  type NicheSignalResult,
} from './services/tenant-business.service.js';
