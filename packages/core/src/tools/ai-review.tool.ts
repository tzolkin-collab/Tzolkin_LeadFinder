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
  metaAdsData: z
    .object({
      hasAds: z.boolean(),
      count: z.number(),
      adsLibraryUrl: z.string().optional(),
      ads: z.array(z.object({ id: z.string().optional(), pageName: z.string().optional(), snapshotUrl: z.string().optional() })).optional(),
    })
    .optional()
    .describe('Dados detalhados da Meta Ads Library'),
  scrapedCodeSnippet: z.string().optional().describe('Trecho do código HTML/estilos extraído do site'),
  cnpjData: z
    .object({
      cnpj: z.string(),
      razaoSocial: z.string().optional(),
      nomeFantasia: z.string().nullable().optional(),
      situacaoCadastral: z.string().optional(),
      dataInicioAtividade: z.string().optional(),
      cnaeDescricao: z.string().optional(),
      capitalSocial: z.number().optional(),
      qsa: z.array(z.object({ nome: z.string(), qualificacao: z.string() })).optional(),
    })
    .optional()
    .describe('Dados oficiais da Receita Federal via Brasil API'),
  adsAuditData: z
    .object({
      hasAnyAds: z.boolean(),
      activeChannels: z.array(z.enum(['meta', 'google', 'tiktok'])),
      missedChannels: z.array(z.enum(['meta', 'google', 'tiktok'])),
      opportunityScore: z.number().int(),
      diagnosis: z.string(),
      opportunities: z.array(z.string()),
      pitch: z.string(),
      suggestedNextChannel: z.enum(['meta', 'google', 'tiktok']).optional(),
    })
    .optional()
    .describe('Auditoria em tempo real de Meta Ads, Google Ads e TikTok Ads'),
  targetIcp: z.string().optional().describe('Descrição genérica legada do ICP'),
  icpContext: z
    .object({
      niche: z.string().optional(),
      region: z.string().optional(),
      decisionMaker: z.string().optional(),
      painPoints: z.string().optional(),
    })
    .optional()
    .describe('ICP estruturado (Perfil do Cliente Ideal - QUEM)'),
  valuePropContext: z
    .object({
      headline: z.string().optional(),
      services: z.string().optional(),
      differentials: z.string().optional(),
    })
    .optional()
    .describe('Proposta de valor da agência (O QUE oferece e diferenciais)'),
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
                'Você é um consultor sênior de inteligência comercial e estrategista de vendas B2B especialista em PMEs brasileiras. ' +
                'Sua missão é gerar um DOSSIÊ COMERCIAL DE ALTO IMPACTO para abordagem de vendas da agência. ' +
                'Seja extremamente analítico, perspicaz, profundo e prático. Evite clichês e generalidades. Responda EXCLUSIVAMENTE em JSON válido.',
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
    if (input.metaAdsData && input.metaAdsData.hasAds) {
      prompt += `- Status: ANÚNCIOS ATIVOS ENCONTRADOS (${input.metaAdsData.count} resultados/anúncios)\n`;
      prompt += `- URL da Biblioteca: ${input.metaAdsData.adsLibraryUrl ?? 'N/A'}\n`;
      if (input.metaAdsData.ads && input.metaAdsData.ads.length > 0) {
        prompt += `- Detalhes dos Anúncios:\n`;
        input.metaAdsData.ads.forEach((ad, i) => {
          prompt += `  ${i + 1}. Page/Titulo: ${ad.pageName ?? 'N/A'} | Snapshot: ${ad.snapshotUrl ?? 'N/A'}\n`;
        });
      }
      prompt += `\n`;
    } else {
      prompt += `- Status: ${input.hasActiveAds ? 'SIM (Anúncios detectados)' : 'Sem anúncios ativos detectados (Oportunidade para oferecer tráfego pago + landing page)'}\n\n`;
    }

    if (input.scrapedCodeSnippet) {
      prompt += `## Esqueleto e Estilos do Site Atual (Scraped HTML/CSS)\n\`\`\`html\n${input.scrapedCodeSnippet.slice(0, 1500)}\n\`\`\`\n\n`;
    }

    if (input.cnpjData) {
      prompt += `## Dados Oficiais da Receita Federal (Brasil API)\n`;
      prompt += `- CNPJ: ${input.cnpjData.cnpj}\n`;
      prompt += `- Razão Social: ${input.cnpjData.razaoSocial ?? 'N/A'}\n`;
      prompt += `- Nome Fantasia: ${input.cnpjData.nomeFantasia ?? 'N/A'}\n`;
      prompt += `- Situação Cadastral: ${input.cnpjData.situacaoCadastral ?? 'N/A'}\n`;
      prompt += `- Data de Início: ${input.cnpjData.dataInicioAtividade ?? 'N/A'}\n`;
      prompt += `- CNAE: ${input.cnpjData.cnaeDescricao ?? 'N/A'}\n`;
      prompt += `- Capital Social: ${input.cnpjData.capitalSocial ? `R$ ${input.cnpjData.capitalSocial.toLocaleString('pt-BR')}` : 'N/A'}\n`;
      if (input.cnpjData.qsa && input.cnpjData.qsa.length > 0) {
        prompt += `- Sócios/Decisores: ${input.cnpjData.qsa.map(s => `${s.nome} (${s.qualificacao})`).join(', ')}\n`;
      }
      prompt += `\n`;
    }

    if (input.adsAuditData) {
      prompt += `## Auditoria em Tempo Real de Anúncios Pagos\n`;
      prompt += `- Anúncios ativos detectados: ${input.adsAuditData.hasAnyAds ? 'SIM' : 'NÃO'}\n`;
      prompt += `- Canais ativos: ${input.adsAuditData.activeChannels.join(', ') || 'Nenhum'}\n`;
      prompt += `- Canais não detectados: ${input.adsAuditData.missedChannels.join(', ') || 'Nenhum'}\n`;
      prompt += `- Score de oportunidade: ${input.adsAuditData.opportunityScore}/10\n`;
      prompt += `- Diagnóstico: ${input.adsAuditData.diagnosis}\n`;
      prompt += `- Oportunidades: ${input.adsAuditData.opportunities.join('; ')}\n`;
      prompt += `- Próximo canal sugerido: ${input.adsAuditData.suggestedNextChannel ?? 'Avaliar'}\n`;
      prompt += `\n`;
    }

    if (input.icpContext && (input.icpContext.niche || input.icpContext.painPoints || input.icpContext.decisionMaker || input.icpContext.region)) {
      prompt += `## PERFIL DE CLIENTE IDEAL (ICP DA AGÊNCIA - QUEM É O ALVO)\n`;
      if (input.icpContext.niche) prompt += `- Segmento/Nicho Alvo: ${input.icpContext.niche}\n`;
      if (input.icpContext.region) prompt += `- Região/Porte: ${input.icpContext.region}\n`;
      if (input.icpContext.decisionMaker) prompt += `- Cargo do Decisor Alvo: ${input.icpContext.decisionMaker}\n`;
      if (input.icpContext.painPoints) prompt += `- Dores e Objeções Principais: ${input.icpContext.painPoints}\n`;
      prompt += `\n`;
    }

    if (input.valuePropContext && (input.valuePropContext.headline || input.valuePropContext.services || input.valuePropContext.differentials)) {
      prompt += `## PROPOSTA DE VALOR DA AGÊNCIA (O QUE A AGÊNCIA OFERECE E RESOLVE)\n`;
      if (input.valuePropContext.headline) prompt += `- Promessa Principal de Valor: ${input.valuePropContext.headline}\n`;
      if (input.valuePropContext.services) prompt += `- Serviços / Soluções da Agência: ${input.valuePropContext.services}\n`;
      if (input.valuePropContext.differentials) prompt += `- Diferenciais Competitivos: ${input.valuePropContext.differentials}\n`;
      prompt += `\n`;
    }

    prompt += `## INSTRUÇÕES DE ANÁLISE COMERCIAL E ESTRATÉGICA
1. **Resumo Comercial (summary):** Faça uma análise crítica e aprofundada da presença digital atual. Aponte exatamente o que está impedindo esse negócio de faturar mais (ex: falta de oferta clara, dependência de WhatsApp sem qualificação, site desatualizado).
2. **Pontos Fortes (strengths):** Liste 3 a 5 ganchos reais e argumentos elogiosos para iniciar a conversa (ex: alta reputação no Google, volume de seguidores, autoridade).
3. **Desafios e Objeções (challenges):** Mapeie de 3 a 5 objeções que o decisor vai dar (ex: "já tenho site", "só uso Instagram", "está caro") e como contornar.
4. **Pitch de Abordagem (approachSuggestion):** Escreva uma sugestão de SCRIPT DE ABORDAGEM PRÁTICO (para WhatsApp/Email) pronto para envio, usando o tom certo e citando dados específicos do estabelecimento.
5. **Funcionalidades Recomendadas (suggestedFeatures):** Liste 4 a 6 elementos indispensáveis para a nova solução (ex: botão de WhatsApp flutuante, prova social dinâmica, cardápio digital interativo, cálculo de rotas).

## Retorne estritamente um JSON com a seguinte estrutura:
{
  "suitabilityScore": <número de 1 a 10>,
  "summary": "<análise detalhada e perspicaz de 3-5 frases>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "challenges": ["<objeção 1 com solução>", "<objeção 2 com solução>"],
  "approachSuggestion": "<script de abordagem detalhado e personalizado pronto para usar no WhatsApp>",
  "estimatedBudget": "<faixa estimada em R$ ex: R$ 2.500 - R$ 5.000>",
  "priority": "<alta|média|baixa>",
  "suggestedFeatures": ["<funcionalidade 1>", "<funcionalidade 2>", "<funcionalidade 3>"],
  "visualIdentitySuggestions": {
    "style": "<estilo visual detalhado ex: Rústico Premium / Sofisticado>",
    "colors": ["#HEX1", "#HEX2", "#HEX3"],
    "tone": "<tom de voz comercial>"
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
