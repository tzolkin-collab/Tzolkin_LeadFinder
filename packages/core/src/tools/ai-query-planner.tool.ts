import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';
import { CoreLogger } from '../utils/logger.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const AiQueryPlannerInputSchema = z.object({
  rawQuery: z.string().min(1).describe('Termo de busca bruto digitado pelo usuário'),
  rawLocation: z.string().optional().describe('Localização ou cidade informada (opcional)'),
});

export type AiQueryPlannerInput = z.infer<typeof AiQueryPlannerInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const AiQueryPlannerOutputSchema = z.object({
  searchIntent: z.enum(['SNIPER_SINGLE_TARGET', 'NICHE_BATCH_MINING']),
  extractedBrand: z.string(),
  optimizedPlacesQuery: z.string(),
  nicheCategory: z.string().optional(),
  suggestedCity: z.string().optional(),
  searchVariations: z.array(z.string()),
  reasoning: z.string(),
});

export type AiQueryPlannerOutput = z.infer<typeof AiQueryPlannerOutputSchema>;

// ─── Tool Implementation ──────────────────────────────────────────────────────

export class AiQueryPlannerTool implements Tool<AiQueryPlannerInput, AiQueryPlannerOutput> {
  readonly name = 'ai_query_planner' as const;
  readonly description =
    'Agente de Inteligência Comercial que analisa e refina termos de busca usando IA (LLM). ' +
    'Desambígua nomes de empresas, remove ruídos de marca parceira/distribuidora e gera queries cirúrgicas.';
  readonly inputSchema = AiQueryPlannerInputSchema;

  private readonly openAiApiKey?: string | undefined;
  private readonly modelName: string;
  private readonly logger = new CoreLogger('AiQueryPlannerTool');

  constructor(openAiApiKey?: string, modelName = 'gpt-4o-mini') {
    this.openAiApiKey = openAiApiKey;
    this.modelName = modelName;
  }

  async execute(input: AiQueryPlannerInput): Promise<ToolResult<AiQueryPlannerOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);

      // Fallback gracioso se a chave OpenAI não estiver configurada
      if (!this.openAiApiKey) {
        const fallback = this.heuristicFallback(validated.rawQuery, validated.rawLocation);
        return {
          success: true,
          data: fallback,
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      const prompt = `Analise este termo de busca de prospecção comercial B2B no Brasil:
Termo digitado: "${validated.rawQuery}"
Localização digitada: "${validated.rawLocation ?? 'Não informada'}"

Sua missão como Agente Inteligente de Busca é:
1. Classificar a intenção: SNIPER_SINGLE_TARGET (se o usuário está buscando uma empresa específica exata como "Rufino Baterias" ou "Clínica Dra Julia") ou NICHE_BATCH_MINING (se busca uma categoria genérica como "Pizzarias", "Clínicas Estéticas").
2. Extrair a MARCA PRINCIPAL limpa (ex: se o usuário digitou "Rufino Baterias comercio de baterias moura", a marca principal é "Rufino Baterias").
3. Gerar a query otimizada para o Google Places API (sem palavras ruído).
4. Gerar variações de busca para o Serper/CNPJ.

Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
{
  "searchIntent": "SNIPER_SINGLE_TARGET" | "NICHE_BATCH_MINING",
  "extractedBrand": "Nome Limpo da Empresa ou Categoria",
  "optimizedPlacesQuery": "Query limpa ideal para o Google Maps",
  "nicheCategory": "Categoria de negócio provável",
  "suggestedCity": "Cidade identificada ou null",
  "searchVariations": ["var1", "var2"],
  "reasoning": "Breve justificativa da desambiguação realizada"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content:
                'Você é um Agente IA especialista em NLP, desambiguação de entidades comerciais B2B e otimização de busca geoespacial no Brasil. Responda APENAS em JSON válido.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI Query Planner HTTP ${response.status}. Usando fallback heurístico.`);
        const fallback = this.heuristicFallback(validated.rawQuery, validated.rawLocation);
        return { success: true, data: fallback, executedAt, durationMs: Date.now() - startedAt };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawJson = data.choices?.[0]?.message?.content;
      if (!rawJson) {
        const fallback = this.heuristicFallback(validated.rawQuery, validated.rawLocation);
        return { success: true, data: fallback, executedAt, durationMs: Date.now() - startedAt };
      }

      const parsed = JSON.parse(rawJson) as AiQueryPlannerOutput;
      const validatedOutput = AiQueryPlannerOutputSchema.parse(parsed);

      const durationMs = Date.now() - startedAt;
      this.logger.info(`Busca otimizada pela IA: "${validated.rawQuery}" ➔ "${validatedOutput.extractedBrand}"`, {
        intent: validatedOutput.searchIntent,
      }, durationMs);

      return {
        success: true,
        data: validatedOutput,
        executedAt,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger.warn('Falha no AI Query Planner, usando fallback heurístico.', {
        error: error instanceof Error ? error.message : String(error),
      });
      const fallback = this.heuristicFallback(input.rawQuery, input.rawLocation);

      return {
        success: true,
        data: fallback,
        executedAt,
        durationMs,
      };
    }
  }

  private heuristicFallback(rawQuery: string, rawLocation?: string): AiQueryPlannerOutput {
    // Isolamento de marca principal por heurística
    let clean = rawQuery;
    const parts = rawQuery.split(/\s*[\-\|\–\:\/]\s*/);
    if (parts.length > 1 && parts[0] && parts[0].trim().length >= 3) {
      clean = parts[0].trim();
    }

    const isSniper = !['clinica', 'restaurante', 'bar', 'lanchonete', 'pizzaria', 'padaria', 'academia', 'escritorio', 'estetica'].includes(clean.toLowerCase());

    return {
      searchIntent: isSniper ? 'SNIPER_SINGLE_TARGET' : 'NICHE_BATCH_MINING',
      extractedBrand: clean,
      optimizedPlacesQuery: rawLocation ? `${clean} ${rawLocation}` : clean,
      searchVariations: [clean, rawQuery],
      reasoning: 'Fallback de otimização por heurística de delimitadores.',
    };
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          rawQuery: { type: 'string', description: 'Termo de busca' },
          rawLocation: { type: 'string', description: 'Localização' },
        },
        required: ['rawQuery'],
      },
    };
  }

  toOpenAITool(): OpenAIToolDefinition {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            rawQuery: { type: 'string', description: 'Termo de busca' },
            rawLocation: { type: 'string', description: 'Localização' },
          },
          required: ['rawQuery'],
        },
      },
    };
  }
}
