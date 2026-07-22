import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { CoreLogger } from '@tzolkin/core';

const logger = new CoreLogger('APIErrorHandler');

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados de requisição inválidos',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Erro interno do servidor';
  logger.error('Erro não tratado na API', err);

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : message,
  });
}
