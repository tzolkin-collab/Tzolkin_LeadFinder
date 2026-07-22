import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const GooglePlacesInputSchema = z.object({
  query: z
    .string()
    .min(2)
    .describe('Termo de busca de texto (ex: "Salão de beleza", "Clínica veterinária")'),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional()
    .describe('Coordenadas geográficas para bias de localização'),
  radiusMeters: z
    .number()
    .int()
    .positive()
    .max(50_000)
    .default(5_000)
    .describe('Raio de busca em metros (padrão: 5000m = 5km)'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Número máximo de resultados a retornar'),
  onlyWithoutWebsite: z
    .boolean()
    .default(false)
    .describe('Se true, filtra apenas negócios SEM website (leads com dor digital)'),
});

export type GooglePlacesInput = z.input<typeof GooglePlacesInputSchema>;
export type GooglePlacesParsedInput = z.output<typeof GooglePlacesInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const BusinessSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  category: z.string().nullable(),
  rating: z.number().nullable(),
  reviewCount: z.number().int().nullable(),
  hasWebsite: z.boolean(),
  websiteUrl: z.string().url().nullable(),
  googleMapsUrl: z.string().url().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  photoResourceNames: z.array(z.string()),
  openingHours: z.string().nullable(),
});

export type Business = z.infer<typeof BusinessSchema>;

export const GooglePlacesOutputSchema = z.object({
  total: z.number().int(),
  withoutWebsite: z.number().int(),
  businesses: z.array(BusinessSchema),
});

export type GooglePlacesOutput = z.infer<typeof GooglePlacesOutputSchema>;

// ─── Google Places API raw types ──────────────────────────────────────────────

interface PlacePhoto {
  name: string;
}

interface PlaceOpeningHours {
  weekdayDescriptions?: string[];
}

interface PlaceLocation {
  latitude?: number;
  longitude?: number;
}

interface PlaceDisplayName {
  text?: string;
}

interface RawPlace {
  id: string;
  displayName?: PlaceDisplayName;
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryType?: string;
  photos?: PlacePhoto[];
  location?: PlaceLocation;
  currentOpeningHours?: PlaceOpeningHours;
}

interface GooglePlacesApiResponse {
  places?: RawPlace[];
}

// ─── Tool Implementation ──────────────────────────────────────────────────────

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.photos',
  'places.location',
  'places.currentOpeningHours',
  'places.primaryType',
].join(',');

function mapRawPlaceToBusiness(place: RawPlace): Business {
  return {
    placeId: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
    category: place.primaryType ?? (place.types?.[0] ?? null),
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    hasWebsite: !!place.websiteUri,
    websiteUrl: place.websiteUri ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    // NOTE: Photo resource names are returned; actual URLs must be resolved
    // via a backend proxy endpoint to avoid leaking API keys to the client.
    photoResourceNames: place.photos?.slice(0, 5).map(p => p.name) ?? [],
    openingHours: place.currentOpeningHours?.weekdayDescriptions?.join(' | ') ?? null,
  };
}

import { CoreLogger } from '../utils/logger.js';

export class GooglePlacesTool implements Tool<GooglePlacesInput, GooglePlacesOutput> {
  readonly name = 'google_places_search' as const;
  readonly description =
    'Busca negócios locais brasileiros via Google Places API. ' +
    'Retorna o catálogo completo de estabelecimentos numa área geográfica, ' +
    'incluindo indicação se possuem website (hasWebsite). ' +
    'Use onlyWithoutWebsite=true para filtrar apenas leads com dor digital óbvia (sem site). ' +
    'Indispensável para o topo do funil de descoberta de leads.';
  readonly inputSchema = GooglePlacesInputSchema;

  private readonly apiKey: string;
  private readonly baseUrl = 'https://places.googleapis.com/v1/places:searchText';
  private readonly logger = new CoreLogger('GooglePlacesTool');

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('[GooglePlacesTool] GOOGLE_PLACES_API_KEY não configurada.');
    this.apiKey = apiKey;
  }

  async execute(input: GooglePlacesInput): Promise<ToolResult<GooglePlacesOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);
      const places = await this.fetchPlaces(validated);

      const businesses = places.map(mapRawPlaceToBusiness);
      const withoutWebsite = businesses.filter(b => !b.hasWebsite).length;

      const result: GooglePlacesOutput = {
        total: businesses.length,
        withoutWebsite,
        businesses: validated.onlyWithoutWebsite
          ? businesses.filter(b => !b.hasWebsite)
          : businesses,
      };

      const durationMs = Date.now() - startedAt;
      this.logger.info(
        `Busca concluída: query="${validated.query}"`,
        { total: businesses.length, withoutWebsite },
        durationMs,
      );

      return {
        success: true,
        data: result,
        executedAt,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Falha na busca Google Places', error, { durationMs });

      return {
        success: false,
        error: message,
        executedAt,
        durationMs,
      };
    }
  }

  private async fetchPlaces(input: GooglePlacesParsedInput): Promise<RawPlace[]> {
    const body: Record<string, unknown> = {
      textQuery: input.query,
      languageCode: 'pt-BR',
    };

    if (input.location) {
      body['locationBias'] = {
        circle: {
          center: {
            latitude: input.location.latitude,
            longitude: input.location.longitude,
          },
          radius: input.radiusMeters,
        },
      };
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Sanitised error: never forward API keys or full Google error bodies
      const status = response.status;
      throw new Error(`Google Places API falhou com status ${status}`);
    }

    const data = (await response.json()) as GooglePlacesApiResponse;
    return data.places ?? [];
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termo de busca (ex: "Salão de beleza SP")' },
          location: {
            type: 'object',
            description: 'Coordenadas para bias de localização',
            properties: {
              latitude: { type: 'number' },
              longitude: { type: 'number' },
            },
          },
          radiusMeters: {
            type: 'number',
            description: 'Raio de busca em metros (padrão: 5000)',
          },
          maxResults: {
            type: 'number',
            description: 'Máximo de resultados (padrão: 20, máx: 50)',
          },
          onlyWithoutWebsite: {
            type: 'boolean',
            description: 'Filtrar apenas negócios SEM website',
          },
        },
        required: ['query'],
      },
    };
  }

  toOpenAITool(): OpenAIToolDefinition {
    const anthropic = this.toAnthropicTool();
    return {
      type: 'function',
      function: {
        name: anthropic.name,
        description: anthropic.description,
        parameters: anthropic.input_schema,
      },
    };
  }
}
