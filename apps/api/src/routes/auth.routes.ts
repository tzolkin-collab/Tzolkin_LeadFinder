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

    // MASTER TEST BYPASS: dev-only convenience; never exposed in the UI or available in production
    if (env.NODE_ENV === 'development' && password === 'admin123') {
      const masterEmail = 'admin@tzolkin.com.br';
      // Deterministic lookup: always use the master admin user so the tenantId is stable across sessions.
      let testUser = await prisma.user.findFirst({
        where: { email: masterEmail },
        orderBy: { createdAt: 'asc' },
        include: { tenant: true },
      });
      if (!testUser) {
        const defaultTenant = await prisma.tenant.create({
          data: { slug: 'tzolkin-hq', name: 'Tzolkin HQ', plan: 'ENTERPRISE', status: 'ACTIVE' },
        });
        const hash = await bcrypt.hash('admin123', 10);
        testUser = await prisma.user.create({
          data: { tenantId: defaultTenant.id, email: masterEmail, name: 'Gustavo (Tzolkin)', passwordHash: hash, role: 'OWNER', isActive: true },
          include: { tenant: true },
        });
      }

      const token = jwt.sign(
        { userId: testUser.id, tenantId: testUser.tenantId, email: testUser.email, role: testUser.role },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login realizado com sucesso (Modo Teste Master)',
        token,
        user: { id: testUser.id, name: testUser.name, email: testUser.email, role: testUser.role },
        tenant: { id: testUser.tenant.id, name: testUser.tenant.name, slug: testUser.tenant.slug, plan: testUser.tenant.plan },
      });
      return;
    }

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

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  document: z.string().optional(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

// POST /register & POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = RegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Este e-mail já está cadastrado' });
      return;
    }

    const tenant = await prisma.tenant.create({
      data: {
        slug: `org-${Date.now().toString(36)}`,
        name: `${name} (Organização)`,
        plan: 'PRO',
        status: 'ACTIVE',
      },
    });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name,
        passwordHash: hash,
        role: 'OWNER',
        isActive: true,
      },
      include: { tenant: true },
    });

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

    res.status(201).json({
      message: 'Conta criada com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
