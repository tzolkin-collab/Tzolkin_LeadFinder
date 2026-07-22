import path from 'node:path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
    experimental: {
        adapter: true,
    },
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),
    engine: 'js',
    async adapter() {
        const { Pool } = await import('pg');
        const { PrismaPg } = await import('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
        return new PrismaPg(pool);
    },
});
