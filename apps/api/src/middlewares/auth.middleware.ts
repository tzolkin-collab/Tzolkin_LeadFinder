import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface UserPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface AdminPayload {
  adminId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'AUDITOR';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload | undefined;
      admin?: AdminPayload | undefined;
    }
  }
}

/**
 * Authentication middleware for Tenant Users.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    if (!decoded.userId || !decoded.tenantId) {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Authentication middleware for Platform Admins (Tzolkin Governance).
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de administrador não fornecido' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminPayload;
    if (!decoded.adminId || !decoded.role) {
      res.status(403).json({ error: 'Acesso negado: Requer privilégios de plataforma' });
      return;
    }

    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token de administrador inválido ou expirado' });
  }
}
