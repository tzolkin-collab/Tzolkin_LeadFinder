import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';
import { SerperClient } from '../clients/serper.client.js';
import { CoreLogger } from '../utils/logger.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const DecisionMakerInputSchema = z.object({
  businessName: z.string().min(2).describe('Nome do estabelecimento ou empresa'),
  location: z.string().optional().describe('Localização/Cidade para refinar busca'),
  category: z.string().optional().describe('Categoria do negócio'),
});

export type DecisionMakerInput = z.input<typeof DecisionMakerInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const PersonProfileSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  snippet: z.string().optional(),
});

export type PersonProfile = z.infer<typeof PersonProfileSchema>;

export const DecisionMakerOutputSchema = z.object({
  likelyRole: z.string().describe('Cargo provável do decisor (ex: Sócio-Proprietário, Gerente de Mkt)'),
  decisionMakerProfiles: z.array(PersonProfileSchema),
  personaType: z.enum(['OWNER_FOUNDER', 'MARKETING_MANAGER', 'COMMERCIAL_DIRECTOR', 'GENERAL_MANAGER']).describe('Tipo de perfil do decisor'),
  buyerPainPoints: z.array(z.string()).describe('Dores estratégicas que movem este decisor a contratar'),
});

export type DecisionMakerOutput = z.infer<typeof DecisionMakerOutputSchema>;

// ─── Tool Implementation ──────────────────────────────────────────────────────

export class DecisionMakerTool implements Tool<DecisionMakerInput, DecisionMakerOutput> {
  readonly name = 'decision_maker_discovery' as const;
  readonly description =
    'Mapeia os perfis de contato e possíveis decisores (Sócios, Donos, Gerentes) de uma PME no LinkedIn e Google, ' +
    'classificando o Perfil do Decisor (Buyer Persona) para personalizar a abordagem de venda de landing pages/sites.';
  readonly inputSchema = DecisionMakerInputSchema;

  private readonly serperClient: SerperClient;
  private readonly logger = new CoreLogger('DecisionMakerTool');

  constructor(serperApiKeyOrClient?: string | SerperClient) {
    if (serperApiKeyOrClient instanceof SerperClient) {
      this.serperClient = serperApiKeyOrClient;
    } else {
      this.serperClient = new SerperClient(serperApiKeyOrClient ? { apiKey: serperApiKeyOrClient } : {});
    }
  }

  async execute(input: DecisionMakerInput): Promise<ToolResult<DecisionMakerOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);
      const profiles: PersonProfile[] = [];

      if (this.serperClient.isConfigured) {
        const found = await this.serperClient.searchDecisionMakers(validated.businessName, validated.location);
        found.forEach(p =>
          profiles.push({
            name: p.name,
            ...(p.role ? { role: p.role } : {}),
            ...(p.linkedinUrl ? { linkedinUrl: p.linkedinUrl } : {}),
            ...(p.snippet ? { snippet: p.snippet } : {}),
          }),
        );
      }

      // Inferência da Buyer Persona padrão para PME Brasileira baseada na categoria
      const isRestaurantOrRetail = /restaurante|pizzaria|bar|loja|comércio|café|steak/i.test(validated.category ?? '');
      const likelyRole = isRestaurantOrRetail ? 'Sócio-Proprietário / Gerente de Operações' : 'Fundador / Diretor Comercial';
      const personaType: DecisionMakerOutput['personaType'] = isRestaurantOrRetail ? 'OWNER_FOUNDER' : 'COMMERCIAL_DIRECTOR';

      const buyerPainPoints = isRestaurantOrRetail
        ? [
            'Falta de tempo para gerenciar fornecedores de tecnologia',
            'Necessidade de retorno rápido (ROI) sem alto custo mensal',
            'Medo de dependência exclusiva de iFood/Rappi e comissões altas',
          ]
        : [
            'Custo de aquisição de clientes (CAC) elevado',
            'Lead caindo no WhatsApp sem qualificação prévia',
            'Falta de autoridade visual comparado aos concorrentes de grande porte',
          ];

      const durationMs = Date.now() - startedAt;
      this.logger.info(`Mapeamento de decisor concluído para "${validated.businessName}"`, { likelyRole }, durationMs);

      return {
        success: true,
        data: {
          likelyRole,
          decisionMakerProfiles: profiles,
          personaType,
          buyerPainPoints,
        },
        executedAt,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Falha no mapeamento de decisor', error, { durationMs });

      return {
        success: false,
        error: message,
        executedAt,
        durationMs,
      };
    }
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Nome da empresa' },
          category: { type: 'string', description: 'Categoria' },
        },
        required: ['businessName'],
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
