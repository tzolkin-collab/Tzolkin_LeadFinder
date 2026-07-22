import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('3001'),
  JWT_SECRET: z.string().min(16).default('tzolkin_super_secret_jwt_key_lead_finder_2026'),
  DATABASE_URL: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  META_ADS_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
