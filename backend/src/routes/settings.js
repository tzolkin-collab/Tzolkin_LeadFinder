const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// ============================================================
// USERS CRUD
// ============================================================

// GET /api/settings/users - List all users
router.get('/users', async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json({ users });
    } catch (error) {
        next(error);
    }
});

// POST /api/settings/users - Create user
router.post('/users', async (req, res, next) => {
    try {
        const { name, email, role } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e email são obrigatórios' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                role: role || 'viewer',
            },
        });

        res.status(201).json({ user });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/settings/users/:id - Update user
router.patch('/users/:id', async (req, res, next) => {
    try {
        const { name, email, role, active } = req.body;

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(role !== undefined && { role }),
                ...(active !== undefined && { active }),
            },
        });

        res.json({ user });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        next(error);
    }
});

// DELETE /api/settings/users/:id - Delete user
router.delete('/users/:id', async (req, res, next) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: 'Usuário removido' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        next(error);
    }
});

// ============================================================
// COSTS / USAGE STATS
// ============================================================

// GET /api/settings/costs - Get AI & API cost estimates
router.get('/costs', async (req, res, next) => {
    try {
        // Count AI analyses
        const totalAnalyses = await prisma.businessReport.count({
            where: { aiAnalysis: { not: null } },
        });

        // Count total businesses (= Google Places API calls)
        const totalBusinesses = await prisma.business.count();

        // Count Instagram lookups (reports with instagramUrl)
        const instagramLookups = await prisma.businessReport.count({
            where: { instagramUrl: { not: null } },
        });

        // Cost estimates (approximate)
        const costs = {
            ai: {
                label: 'Análises com IA (OpenAI)',
                count: totalAnalyses,
                costPerUnit: 0.03, // ~$0.03 per GPT-4o-mini analysis
                totalCost: (totalAnalyses * 0.03).toFixed(2),
                currency: 'USD',
            },
            googlePlaces: {
                label: 'Buscas Google Places',
                count: totalBusinesses,
                costPerUnit: 0.032, // ~$0.032 per Places call
                totalCost: (totalBusinesses * 0.032).toFixed(2),
                currency: 'USD',
            },
            serper: {
                label: 'Buscas Instagram (Serper)',
                count: instagramLookups,
                costPerUnit: 0.001, // ~$0.001 per Serper search
                totalCost: (instagramLookups * 0.001).toFixed(2),
                currency: 'USD',
            },
        };

        const totalCostUSD = (
            parseFloat(costs.ai.totalCost) +
            parseFloat(costs.googlePlaces.totalCost) +
            parseFloat(costs.serper.totalCost)
        ).toFixed(2);

        res.json({ costs, totalCostUSD });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
