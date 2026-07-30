import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CoreLogger } from '@tzolkin/core';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import searchRoutes from './routes/search.routes.js';
import reviewRoutes from './routes/review.routes.js';
import businessesRoutes from './routes/businesses.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import taxonomyRoutes from './routes/taxonomy.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import path from 'path';

const logger = new CoreLogger('Server');
const app = express();

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  }),
);
app.use(express.json());

// Static files for scraped assets
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// API Routes (v1)
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/businesses', businessesRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/taxonomy', taxonomyRoutes);
app.use('/api/v1', reviewRoutes);

// Legacy Route Aliases (for backwards compatibility with existing frontend builds)
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/businesses', businessesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api', reviewRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Express Server
const server = app.listen(env.PORT, () => {
  logger.info(`Lead Finder API v1 rodando na porta ${env.PORT} [${env.NODE_ENV}]`, {
    port: env.PORT,
    env: env.NODE_ENV,
  });
});

export default server;
