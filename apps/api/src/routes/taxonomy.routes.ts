import { Router } from 'express';
import { z } from 'zod';
import {
  listTaxonomyForAI,
  resolveServiceSubcategory,
  tenantServiceProfile,
  setTenantServices,
  taxonomyHealth,
} from '@tzolkin/database';
import { combineRelevance } from '@tzolkin/core';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authMiddleware);

const CategoryEnum = z.enum([
  'MARKETING_DIGITAL',
  'DESENVOLVIMENTO',
  'DESIGN',
  'AUTOMACAO_IA',
  'CONSULTORIA',
]);

// GET /api/taxonomy
// Catálogo de nichos e profissões utilizáveis — o que a UI oferece como
// escolha e o que a IA consulta antes de propor termo novo.
router.get('/', async (_req, res, next) => {
  try {
    const taxonomy = await listTaxonomyForAI();
    res.json(taxonomy);
  } catch (error) {
    next(error);
  }
});

// GET /api/taxonomy/health
// Folga de cada teto. Existe para acompanhar a taxonomia se aproximando do
// limite antes de ela travar, não depois.
router.get('/health', async (_req, res, next) => {
  try {
    res.json(await taxonomyHealth());
  } catch (error) {
    next(error);
  }
});

const ResolveSchema = z.object({
  rawLabel: z.string(),
  category: CategoryEnum,
});

// POST /api/taxonomy/resolve
// Resolve texto livre contra a taxonomia. Toda a proteção contra explosão de
// categoria mora no resolver — nada escreve na tabela por outro caminho.
//
// O caso que importa para a UI: quando devolve `suggestCategory`, o serviço
// existe mas está em OUTRO nicho, e o usuário precisa decidir se adiciona esse
// nicho ao perfil. Nunca duplicamos por conta própria.
router.post('/resolve', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const input = ResolveSchema.parse(req.body);

    const result = await resolveServiceSubcategory({
      rawLabel: input.rawLabel,
      category: input.category,
      tenantId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/taxonomy/profile
// Perfil de serviço do tenant: profissões, nichos e as especialidades
// DERIVADAS que alimentam o mapa de relevância.
router.get('/profile', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const profile = await tenantServiceProfile(tenantId);
    const relevance = combineRelevance(profile.specialties);

    res.json({
      ...profile,
      relevance: {
        primary: relevance.primary,
        secondary: relevance.secondary,
        noPrimaryCoverage: relevance.noPrimaryCoverage,
        gaps: relevance.gaps,
      },
    });
  } catch (error) {
    next(error);
  }
});

const SetProfileSchema = z.object({
  subcategoryIds: z.array(z.string()),
});

// PUT /api/taxonomy/profile
// Define o conjunto de profissões do tenant. Multi-nicho e multi-profissão por
// construção — a lista pode misturar nichos livremente.
router.put('/profile', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const { subcategoryIds } = SetProfileSchema.parse(req.body);

    const profile = await setTenantServices(tenantId, subcategoryIds);
    const relevance = combineRelevance(profile.specialties);

    // Quando o usuário manda id inválido ou em quarentena, ele é descartado —
    // dizer isso é melhor que salvar em silêncio um perfil diferente do pedido.
    const ignored = subcategoryIds.filter(
      (id) => !profile.services.some((s) => s.subcategoryId === id),
    );

    res.json({
      ...profile,
      ignoredSubcategoryIds: ignored,
      relevance: {
        primary: relevance.primary,
        secondary: relevance.secondary,
        noPrimaryCoverage: relevance.noPrimaryCoverage,
        gaps: relevance.gaps,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
