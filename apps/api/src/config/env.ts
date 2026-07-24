import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// ⚠️ AVISO DE SEGURANÇA: os defaults abaixo são as chaves de desenvolvimento do projeto
// (fonte: .env.example). Em produção, sempre sobrescreva via variáveis de ambiente reais.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('3001'),
  JWT_SECRET: z.string().min(16).default('tzolkin_super_secret_jwt_key_lead_finder_2026'),
  DATABASE_URL: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional().default(process.env.GOOGLE_PLACES_API_KEY ?? ''),
  SERPER_API_KEY: z.string().optional().default(process.env.SERPER_API_KEY ?? ''),
  META_ADS_TOKEN: z.string().optional().default(process.env.META_ADS_TOKEN ?? ''),
  SCRAPINGBEE_API_KEY: z.string().optional().default(process.env.SCRAPINGBEE_API_KEY ?? ''),
  APIFY_API_TOKEN: z.string().optional().default(process.env.APIFY_API_TOKEN ?? ''),
  OPENAI_API_KEY: z.string().optional().default(process.env.OPENAI_API_KEY ?? ''),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_TTL_SECONDS: z.string().transform(val => parseInt(val, 10)).default('604800'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
