const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/businesses - List all businesses with pagination
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const skip = (page - 1) * limit;

        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.report = { status };
        }

        const [businesses, total] = await Promise.all([
            prisma.business.findMany({
                where,
                include: {
                    report: {
                        select: {
                            id: true,
                            status: true,
                            suitabilityScore: true,
                            instagramUrl: true,
                            aiSummary: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.business.count({ where }),
        ]);

        res.json({
            businesses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/businesses/stats - Get statistics
router.get('/stats', async (req, res, next) => {
    try {
        const [total, pending, reviewed, contacted] = await Promise.all([
            prisma.business.count(),
            prisma.businessReport.count({ where: { status: 'PENDING' } }),
            prisma.businessReport.count({ where: { status: 'REVIEWED' } }),
            prisma.businessReport.count({ where: { status: 'CONTACTED' } }),
        ]);

        const withoutReport = await prisma.business.count({
            where: { report: null },
        });

        res.json({
            total,
            pending,
            reviewed,
            contacted,
            withoutReport,
            withReport: total - withoutReport,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/businesses/:id - Get single business with full report
router.get('/:id', async (req, res, next) => {
    try {
        const business = await prisma.business.findUnique({
            where: { id: req.params.id },
            include: { report: true },
        });

        if (!business) {
            return res.status(404).json({ error: 'Negócio não encontrado' });
        }

        res.json(business);
    } catch (error) {
        next(error);
    }
});

// PATCH /api/businesses/:id/status - Update report status
router.patch('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['PENDING', 'REVIEWED', 'CONTACTED', 'REJECTED'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const business = await prisma.business.findUnique({
            where: { id: req.params.id },
            include: { report: true },
        });

        if (!business) {
            return res.status(404).json({ error: 'Negócio não encontrado' });
        }

        if (!business.report) {
            // Create a report if it doesn't exist
            await prisma.businessReport.create({
                data: {
                    businessId: business.id,
                    status,
                    reviewedAt: status !== 'PENDING' ? new Date() : null,
                },
            });
        } else {
            await prisma.businessReport.update({
                where: { businessId: business.id },
                data: {
                    status,
                    reviewedAt: status !== 'PENDING' ? new Date() : null,
                },
            });
        }

        const updated = await prisma.business.findUnique({
            where: { id: req.params.id },
            include: { report: true },
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/businesses/:id - Delete business
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.business.delete({
            where: { id: req.params.id },
        });

        res.json({ success: true, message: 'Negócio removido' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
