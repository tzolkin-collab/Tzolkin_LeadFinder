import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@tzolkin/database';
import { env } from '../config/env.js';

const router: Router = Router();

const LoginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1),
});

// POST /login & POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email: rawEmail, password } = LoginSchema.parse(req.body);
    const email = rawEmail ?? 'admin@tzolkin.com.br';

    // Auto-provision default tenant and seed user only if the database is empty.
    // In all other cases, credentials must match an existing active user.
    const existingUserCount = await prisma.user.count();

    let user = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      if (existingUserCount > 0) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const defaultTenant = await prisma.tenant.create({
        data: {
          slug: 'tzolkin-hq',
          name: 'Tzolkin HQ',
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
        },
      });

      const hash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          tenantId: defaultTenant.id,
          email,
          name: 'Gustavo (Tzolkin)',
          passwordHash: hash,
          role: 'OWNER',
          isActive: true,
        },
        include: { tenant: true },
      });
    } else {
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Usuário desativado' });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
