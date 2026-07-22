import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@tzolkin/database';
import { GooglePlacesTool } from '@tzolkin/core';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR`;
  const response = await fetch(url);
  const data = (await response.json()) as {
    status: string;
    results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
  };

  if (data.status !== 'OK') return null;
  const results = data.results;
  if (!results || results.length === 0) return null;
  const first = results[0];
  if (!first) return null;
  const loc = first.geometry.location;
  return { latitude: loc.lat, longitude: loc.lng };
}

const router: Router = Router();

router.use(authMiddleware);

const SearchRequestSchema = z.object({
  query: z.string().min(2),
  location: z
    .union([
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      z.string().min(2),
    ])
    .optional(),
  radiusMeters: z.number().optional().default(5000),
  onlyWithoutWebsite: z.boolean().optional().default(false),
});

// POST /api/v1/search - Search for local SMBs via Google Places and save to tenant
router.post('/', async (req, res, next) => {
  try {
    const input = SearchRequestSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    const apiKey = env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY não configurada no servidor' });
      return;
    }

    let locationCoords: GeocodeResult | undefined;
    if (input.location) {
      if (typeof input.location === 'string') {
        const coords = await geocodeAddress(input.location, apiKey);
        if (coords) locationCoords = coords;
      } else {
        locationCoords = input.location;
      }
    }

    const tool = new GooglePlacesTool(apiKey);
    const result = await tool.execute({
      query: input.query,
      location: locationCoords,
      radiusMeters: input.radiusMeters,
      onlyWithoutWebsite: input.onlyWithoutWebsite,
    });

    if (!result.success || !result.data) {
      res.status(500).json({ error: result.error ?? 'Falha na busca Google Places' });
      return;
    }

    const savedBusinesses = [];

    for (const biz of result.data.businesses) {
      const saved = await prisma.business.upsert({
        where: {
          tenantId_placeId: {
            tenantId,
            placeId: biz.placeId,
          },
        },
        update: {
          name: biz.name,
          address: biz.address,
          phone: biz.phone,
          category: biz.category,
          rating: biz.rating,
          reviewCount: biz.reviewCount,
          hasWebsite: biz.hasWebsite,
          websiteUrl: biz.websiteUrl,
          googleMapsUrl: biz.googleMapsUrl,
          latitude: biz.latitude,
          longitude: biz.longitude,
          openingHours: biz.openingHours,
          searchQuery: input.query,
        },
        create: {
          tenantId,
          placeId: biz.placeId,
          name: biz.name,
          address: biz.address,
          phone: biz.phone,
          category: biz.category,
          rating: biz.rating,
          reviewCount: biz.reviewCount,
          hasWebsite: biz.hasWebsite,
          websiteUrl: biz.websiteUrl,
          googleMapsUrl: biz.googleMapsUrl,
          latitude: biz.latitude,
          longitude: biz.longitude,
          openingHours: biz.openingHours,
          searchQuery: input.query,
        },
        include: { report: true },
      });
      savedBusinesses.push(saved);
    }

    res.json({
      message: `Busca concluída: ${result.data.total} encontrados, ${result.data.withoutWebsite} sem website`,
      totalFound: result.data.total,
      withoutWebsite: result.data.withoutWebsite,
      savedCount: savedBusinesses.length,
      businesses: savedBusinesses,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/search/leads - List all saved leads for tenant
router.get('/leads', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const businesses = await prisma.business.findMany({
      where: { tenantId },
      include: { report: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      total: businesses.length,
      businesses,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
