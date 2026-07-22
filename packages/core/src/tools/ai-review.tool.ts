import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const AiReviewInputSchema = z.object({
  businessName: z.string().min(2).describe('Nome do estabelecimento'),
  category: z.string().optional().describe('Categoria do negócio (ex: "Salão de beleza")'),
  address: z.string().optional().describe('Endereço completo'),
  phone: z.string().optional().describe('Telefone de contato'),
  rating: z.number().optional().describe('Nota média de avaliação (1-5)'),
  reviewCount: z.number().int().optional().describe('Quantidade total de avaliações'),
  hasWebsite: z.boolean().describe('Indica se já possui website ativo'),
  googleMapsUrl: z.string().optional().describe('URL no Google Maps'),
  openingHours: z.string().optional().describe('Horário de funcionamento'),
  instagramData: z
    .object({
      handle: z.string(),
      bio: z.string().nullable().optional(),
      followers: z.string().nullable().optional(),
      posts: z.number().nullable().optional(),
    })
    .optional()
    .describe('Dados enriquecidos do Instagram'),
  hasActiveAds: z.boolean().optional().describe('Indica se possui anúncios ativos no Meta Ads'),
  targetIcp: z.string().optional().describe('Descrição do perfil de cliente ideal (ICP) do tenant'),
});

export type AiReviewInput = z.input<typeof AiReviewInputSchema>;
export type AiReviewParsedInput = z.output<typeof AiReviewInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const VisualIdentitySchema = z.object({
  style: z.string(),
  colors: z.array(z.string()),
  tone: z.string(),
});

export const AiReviewOutputSchema = z.object({
  suitabilityScore: z
    .number()
    .min(1)
    .max(10)
    .describe('Score de aderência do lead (1-10)'),
  summary: z.string().describe('Resumo do potencial e da dor digital do negócio'),
  strengths: z.array(z.string()).describe('Pontos fortes para usar na abordagem'),
  challenges: z.array(z.string()).describe('Objeções ou desafios previstos'),
  approachSuggestion: z.string().describe('Sugestão detalhada de abordagem/pitch inicial'),
  estimatedBudget: z.string().describe('Faixa estimada de orçamento'),
  priority: z.enum(['alta', 'média', 'baixa']).describe('Nível de prioridade comercial'),
  suggestedFeatures: z.array(z.string()).describe('Funcionalidades sugeridas para o site/landing page'),
  visualIdentitySuggestions: VisualIdentitySchema.optional(),
});

export type AiReviewOutput = z.infer<typeof AiReviewOutputSchema>;

// ─── Tool Implementation ──────────────────────────────────────────────────────

import { CoreLogger } from '../utils/logger.js';

export class AiReviewTool implements Tool<AiReviewInput, AiReviewOutput> {
  readonly name = 'ai_lead_review' as const;
  readonly description =
    'Analisa um lead PME brasileira combinando dados do Google Places, Instagram e Meta Ads. ' +
    'Gera pontuação de aderência (suitabilityScore 1-10), dossiê comercial, ' +
    'objeções previstas e pitch de abordagem personalizado via IA.';
  readonly inputSchema = AiReviewInputSchema;

  private readonly openAiApiKey?: string | undefined;
  private readonly modelName: string;
  private readonly logger = new CoreLogger('AiReviewTool');

  constructor(openAiApiKey?: string, modelName = 'gpt-4o-mini') {
    this.openAiApiKey = openAiApiKey;
    this.modelName = modelName;
  }

  async execute(input: AiReviewInput): Promise<ToolResult<AiReviewOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);

      if (!this.openAiApiKey) {
        throw new Error('[AiReviewTool] OPENAI_API_KEY não configurada.');
      }

      const prompt = this.buildPrompt(validated);

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
                'Você é um analista especialista em inteligência comercial B2B para PMEs brasileiras. ' +
                'Avalie o potencial do negócio como cliente para serviços de landing page/sites e responda EXCLUSIVAMENTE em JSON válido.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API falhou com status HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawJson = data.choices?.[0]?.message?.content;
      if (!rawJson) {
        throw new Error('OpenAI retornou resposta vazia.');
      }

      const parsed = JSON.parse(rawJson);
      const output = AiReviewOutputSchema.parse({
        suitabilityScore: Math.min(10, Math.max(1, Number(parsed.suitabilityScore) || 5)),
        summary: parsed.summary ?? '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
        approachSuggestion: parsed.approachSuggestion ?? '',
        estimatedBudget: parsed.estimatedBudget ?? 'A avaliar',
        priority: ['alta', 'média', 'baixa'].includes(parsed.priority) ? parsed.priority : 'média',
        suggestedFeatures: Array.isArray(parsed.suggestedFeatures) ? parsed.suggestedFeatures : [],
        visualIdentitySuggestions: parsed.visualIdentitySuggestions,
      });

      const durationMs = Date.now() - startedAt;
      this.logger.info(
        `AI Review concluído para "${validated.businessName}"`,
        { suitabilityScore: output.suitabilityScore, priority: output.priority },
        durationMs,
      );

      return {
        success: true,
        data: output,
        executedAt,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Falha no AI Review', error, { durationMs });

      return {
        success: false,
        error: message,
        executedAt,
        durationMs,
      };
    }
  }

  private buildPrompt(input: AiReviewParsedInput): string {
    let prompt = `Analise o seguinte negócio como potencial cliente para criação de landing page/site:\n\n`;

    prompt += `## Dados do Google Places\n`;
    prompt += `- Nome: ${input.businessName}\n`;
    prompt += `- Categoria: ${input.category ?? 'N/A'}\n`;
    prompt += `- Endereço: ${input.address ?? 'N/A'}\n`;
    prompt += `- Telefone: ${input.phone ?? 'N/A'}\n`;
    prompt += `- Avaliação: ${input.rating ? `${input.rating}/5 (${input.reviewCount ?? 0} avaliações)` : 'N/A'}\n`;
    prompt += `- Possui Website: ${input.hasWebsite ? 'Sim' : 'Não (DOR DIGITAL CRÍTICA)'}\n\n`;

    if (input.instagramData) {
      prompt += `## Dados do Instagram\n`;
      prompt += `- Perfil: @${input.instagramData.handle}\n`;
      prompt += `- Bio: ${input.instagramData.bio ?? 'N/A'}\n`;
      prompt += `- Seguidores: ${input.instagramData.followers ?? 'N/A'}\n`;
      prompt += `- Posts: ${input.instagramData.posts ?? 'N/A'}\n\n`;
    } else {
      prompt += `## Instagram\nNenhum perfil encontrado.\n\n`;
    }

    prompt += `## Anúncios Meta Ads\n`;
    prompt += `- Anúncios Ativos: ${input.hasActiveAds ? 'SIM (ORÇAMENTO DE MARKETING COMPROVADO)' : 'Não informado / Não detectado'}\n\n`;

    if (input.targetIcp) {
      prompt += `## Perfil de Cliente Ideal (ICP) do Consultor\n${input.targetIcp}\n\n`;
    }

    prompt += `## Retorne estritamente um JSON com a seguinte estrutura:
{
  "suitabilityScore": <número de 1 a 10>,
  "summary": "<resumo conciso de 2-3 frases>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "challenges": ["<objeção prevista 1>"],
  "approachSuggestion": "<sugestão de pitch de abordagem de 1 parágrafo>",
  "estimatedBudget": "<faixa estimada em R$>",
  "priority": "<alta|média|baixa>",
  "suggestedFeatures": ["<funcionalidade 1>", "<funcionalidade 2>"],
  "visualIdentitySuggestions": {
    "style": "<estilo visual>",
    "colors": ["#HEX1", "#HEX2"],
    "tone": "<tom da comunicação>"
  }
}`;

    return prompt;
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Nome do estabelecimento' },
          hasWebsite: { type: 'boolean', description: 'Se possui website' },
          category: { type: 'string', description: 'Categoria' },
          rating: { type: 'number', description: 'Nota no Google' },
          hasActiveAds: { type: 'boolean', description: 'Se possui anúncios ativos' },
        },
        required: ['businessName', 'hasWebsite'],
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
