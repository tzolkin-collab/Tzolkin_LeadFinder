import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';
import { CoreLogger } from '../utils/logger.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';


// ─── Input Schema ─────────────────────────────────────────────────────────────

export const AdsAuditInputSchema = z.object({
  businessName: z.string().min(2).describe('Nome da empresa para auditar anúncios'),
  websiteUrl: z.string().url().optional().describe('Website do negócio, se houver'),
  hasWebsite: z.boolean().describe('Se o negócio possui website ativo'),
  instagramHandle: z.string().optional().describe('Handle do Instagram, se disponível'),
  metaAds: z
    .object({
      hasAds: z.boolean(),
      count: z.number().int(),
      adsLibraryUrl: z.string(),
    })
    .optional(),
  googleAds: z
    .object({
      hasGoogleAds: z.boolean(),
      adsUrl: z.string(),
    })
    .optional(),
  tiktokAds: z
    .object({
      hasTikTokAds: z.boolean(),
      adsUrl: z.string(),
    })
    .optional(),
});

export type AdsAuditInput = z.input<typeof AdsAuditInputSchema>;
export type AdsAuditParsedInput = z.output<typeof AdsAuditInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const AdsAuditOutputSchema = z.object({
  hasAnyAds: z.boolean().describe('Se há anúncios ativos em qualquer canal'),
  activeChannels: z.array(z.enum(['meta', 'google', 'tiktok'])).describe('Canais com anúncios ativos'),
  missedChannels: z.array(z.enum(['meta', 'google', 'tiktok'])).describe('Canais sem anúncios detectados'),
  opportunityScore: z.number().int().min(1).max(10).describe('Score de oportunidade comercial (1-10)'),
  diagnosis: z.string().describe('Diagnóstico executivo em 2-3 frases'),
  opportunities: z.array(z.string()).describe('Pontos de dor para prospecção fria'),
  pitch: z.string().describe('Pitch pronto para WhatsApp/email de prospecção fria'),
  suggestedNextChannel: z.enum(['meta', 'google', 'tiktok']).optional().describe('Próximo canal mais estratégico para oferecer'),
});

export type AdsAuditOutput = z.infer<typeof AdsAuditOutputSchema>;

// ─── Tool Implementation ──────────────────────────────────────────────────────

export class AdsAuditTool implements Tool<AdsAuditInput, AdsAuditOutput> {
  readonly name = 'ads_audit' as const;
  readonly description =
    'Auditoria em tempo real de Meta Ads, Google Ads e TikTok Ads. ' +
    'Gera diagnóstico comercial e pitch pronto para prospecção fria de PMEs.';
  readonly inputSchema = AdsAuditInputSchema;

  private readonly openAiApiKey?: string | undefined;
  private readonly modelName: string;
  private readonly logger = new CoreLogger('AdsAuditTool');

  constructor(openAiApiKey?: string, modelName = 'gpt-4o-mini') {
    this.openAiApiKey = openAiApiKey;
    this.modelName = modelName;
  }

  async execute(input: AdsAuditInput): Promise<ToolResult<AdsAuditOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);

      const activeChannels: AdsAuditOutput['activeChannels'] = [];
      if (validated.metaAds?.hasAds) activeChannels.push('meta');
      if (validated.googleAds?.hasGoogleAds) activeChannels.push('google');
      if (validated.tiktokAds?.hasTikTokAds) activeChannels.push('tiktok');

      const missedChannels: AdsAuditOutput['missedChannels'] = [];
      if (!validated.metaAds?.hasAds) missedChannels.push('meta');
      if (!validated.googleAds?.hasGoogleAds) missedChannels.push('google');
      if (!validated.tiktokAds?.hasTikTokAds) missedChannels.push('tiktok');

      const hasAnyAds = activeChannels.length > 0;

      // Heuristic score: high opportunity when they advertise but have no website,
      // or when they miss channels where competitors likely are.
      let opportunityScore = 5;
      if (hasAnyAds && !validated.hasWebsite) opportunityScore += 3;
      if (activeChannels.length >= 2) opportunityScore += 1;
      if (missedChannels.length === 3 && !validated.hasWebsite) opportunityScore += 1;
      if (activeChannels.includes('meta') && missedChannels.includes('google')) opportunityScore += 1;
      opportunityScore = Math.min(10, Math.max(1, opportunityScore));

      if (!this.openAiApiKey || this.openAiApiKey === 'your_openai_key_here') {
        const heuristicOutput = this.buildHeuristicOutput(validated, activeChannels, missedChannels, hasAnyAds, opportunityScore);
        return {
          success: true,
          data: heuristicOutput,
          executedAt,
          durationMs: Date.now() - startedAt,
        };
      }

      const prompt = this.buildPrompt(validated, activeChannels, missedChannels, hasAnyAds, opportunityScore);

      const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
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
                'Você é um estrategista de vendas B2B para agências digitais no Brasil. ' +
                'Analise a presença de anúncios pagos de uma PME e gere um diagnóstico comercial + pitch de prospecção fria. ' +
                'Responda EXCLUSIVAMENTE em JSON válido.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
        timeoutMs: 15000,
        maxRetries: 2,
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
      const output = AdsAuditOutputSchema.parse({
        hasAnyAds,
        activeChannels,
        missedChannels,
        opportunityScore: parsed.opportunityScore ?? opportunityScore,
        diagnosis: parsed.diagnosis ?? this.fallbackDiagnosis(validated, activeChannels, missedChannels),
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : this.fallbackOpportunities(validated, activeChannels, missedChannels),
        pitch: parsed.pitch ?? this.fallbackPitch(validated, activeChannels, missedChannels),
        suggestedNextChannel: parsed.suggestedNextChannel ?? this.fallbackNextChannel(activeChannels, missedChannels),
      });

      const durationMs = Date.now() - startedAt;
      this.logger.info(`Ads Audit concluído para "${validated.businessName}"`, { opportunityScore: output.opportunityScore, activeChannels }, durationMs);

      return { success: true, data: output, executedAt, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Falha no Ads Audit', error, { durationMs });

      return { success: false, error: message, executedAt, durationMs };
    }
  }

  private buildHeuristicOutput(
    input: AdsAuditParsedInput,
    activeChannels: AdsAuditOutput['activeChannels'],
    missedChannels: AdsAuditOutput['missedChannels'],
    hasAnyAds: boolean,
    opportunityScore: number,
  ): AdsAuditOutput {
    return {
      hasAnyAds,
      activeChannels,
      missedChannels,
      opportunityScore,
      diagnosis: this.fallbackDiagnosis(input, activeChannels, missedChannels),
      opportunities: this.fallbackOpportunities(input, activeChannels, missedChannels),
      pitch: this.fallbackPitch(input, activeChannels, missedChannels),
      suggestedNextChannel: this.fallbackNextChannel(activeChannels, missedChannels),
    };
  }

  private buildPrompt(
    input: AdsAuditParsedInput,
    activeChannels: AdsAuditOutput['activeChannels'],
    missedChannels: AdsAuditOutput['missedChannels'],
    hasAnyAds: boolean,
    opportunityScore: number,
  ): string {
    void missedChannels;
    let prompt = `Auditoria de anúncios pagos para prospecção fria para ${input.businessName}.\n\n`;
    prompt += `- Canais ativos: ${activeChannels.join(', ') || 'nenhum'}\n`;
    prompt += `- Há anúncios detectados: ${hasAnyAds ? 'SIM' : 'NÃO'}\n`;
    prompt += `## Empresa\n`;
    prompt += `- Nome: ${input.businessName}\n`;
    prompt += `- Possui website: ${input.hasWebsite ? 'Sim' : 'Não'}\n`;
    prompt += `- Instagram: ${input.instagramHandle ? `@${input.instagramHandle}` : 'N/A'}\n\n`;

    prompt += `## Anúncios Detectados\n`;
    prompt += `- Meta Ads: ${input.metaAds?.hasAds ? `SIM (${input.metaAds.count}) — ${input.metaAds.adsLibraryUrl}` : 'Não detectado'}\n`;
    prompt += `- Google Ads: ${input.googleAds?.hasGoogleAds ? `SIM — ${input.googleAds.adsUrl}` : 'Não detectado'}\n`;
    prompt += `- TikTok Ads: ${input.tiktokAds?.hasTikTokAds ? `SIM — ${input.tiktokAds.adsUrl}` : 'Não detectado'}\n\n`;

    prompt += `## Score heurístico inicial de oportunidade: ${opportunityScore}/10\n\n`;

    prompt += `## INSTRUÇÕES\n`;
    prompt += `1. **diagnosis**: Resumo executivo em 2-3 frases sobre a maturidade em anúncios pagos.\n`;
    prompt += `2. **opportunities**: Lista de 3 a 5 pontos de dor ou oportunidades claras para prospecção fria.\n`;
    prompt += `3. **pitch**: Um parágrafo pronto para enviar no WhatsApp ou email de prospecção fria, personalizado e direto.\n`;
    prompt += `4. **suggestedNextChannel**: Qual canal de anúncios a empresa deveria começar ou expandir ('meta', 'google' ou 'tiktok')?\n\n`;

    prompt += `## Retorne estritamente JSON:\n`;
    prompt += `{\n`;
    prompt += `  "diagnosis": "...",\n`;
    prompt += `  "opportunities": ["...", "..."],\n`;
    prompt += `  "pitch": "...",\n`;
    prompt += `  "suggestedNextChannel": "meta|google|tiktok"\n`;
    prompt += `}`;

    return prompt;
  }

  private fallbackDiagnosis(
    input: AdsAuditParsedInput,
    activeChannels: AdsAuditOutput['activeChannels'],
    missedChannels: AdsAuditOutput['missedChannels'],
  ): string {
    if (activeChannels.length === 0) {
      return `${input.businessName} não possui anúncios pagos detectados nos principais canais. É uma oportunidade de capturar demanda antes dos concorrentes.`;
    }
    if (!input.hasWebsite && activeChannels.length > 0) {
      return `${input.businessName} investe em anúncios pagos (${activeChannels.join(', ')}) mas não tem website próprio. Dinheiro de marketing pode estar sendo desperdiçado em páginas sem controle de conversão.`;
    }
    if (activeChannels.length === 1 && missedChannels.length > 0) {
      return `${input.businessName} anuncia apenas em ${activeChannels[0]}, deixando de fora ${missedChannels.join(' e ')}. Há espaço para diversificação de canais.`;
    }
    return `${input.businessName} tem presença em ${activeChannels.length} canal(is) de anúncios pagos. Avalie a qualidade das páginas de destino e a captação de leads.`;
  }

  private fallbackOpportunities(
    input: AdsAuditParsedInput,
    activeChannels: AdsAuditOutput['activeChannels'],
    missedChannels: AdsAuditOutput['missedChannels'],
  ): string[] {
    const ops: string[] = [];
    if (!input.hasWebsite && activeChannels.length > 0) {
      ops.push('Anuncia sem website próprio: provável desperdício de budget e baixa conversão.');
    }
    if (activeChannels.length === 0) {
      ops.push('Não aparece em nenhuma biblioteca de anúncios: provavelmente depende só de indicação ou Instagram orgânico.');
      ops.push('Concorrentes podem estar capturando demanda de busca paga enquanto esta PME fica de fora.');
    }
    if (activeChannels.includes('meta') && missedChannels.includes('google')) {
      ops.push('Anuncia no Meta Ads mas não no Google Ads: perde intenção de busca ativa.');
    }
    if (!activeChannels.includes('meta') && activeChannels.includes('google')) {
      ops.push('Anuncia no Google Ads mas não no Meta Ads: perde descoberta e remarketing no maior canal social do Brasil.');
    }
    if (!activeChannels.includes('tiktok') && (activeChannels.includes('meta') || activeChannels.includes('google'))) {
      ops.push('TikTok Ads ainda não explorado: canal de baixo CPM e alto engajamento para PMEs visuais.');
    }
    if (ops.length === 0) {
      ops.push('Presença paga detectada, mas vale avaliar otimização de landing pages e custo de aquisição.');
    }
    return ops;
  }

  private fallbackPitch(
    input: AdsAuditParsedInput,
    activeChannels: AdsAuditOutput['activeChannels'],
    missedChannels: AdsAuditOutput['missedChannels'],
  ): string {
    if (!input.hasWebsite && activeChannels.length > 0) {
      return `Olá, vi que ${input.businessName} está investindo em anúncios, o que mostra que vocês entendem de marketing. Percebi que ainda não têm um site próprio para direcionar esse tráfego — isso costuma diminuir a conversão e dificulta medir o retorno do investimento. Posso mostrar como uma landing page otimizada para os seus anúncios pode capturar mais leads e baratear o custo por aquisição. Topo?`;
    }
    if (activeChannels.length === 0) {
      return `Olá, estou mapeando empresas de ${input.businessName.includes(' ') ? input.businessName.split(' ')[0] : input.businessName} na região e notei que vocês ainda não aparecem em anúncios pagos. Enquanto isso, clientes que buscam pelo seu serviço no Google e Instagram estão caindo nos concorrentes. Posso mostrar como começar com um investimento pequeno e direcionado para testar em 7 dias. Vamos conversar?`;
    }
    return `Olá, vi que ${input.businessName} já anuncia em ${activeChannels.join('/')}. Excelente sinal de maturidade! Identifiquei que ainda dá para expandir para ${missedChannels.slice(0, 2).join(' e ')}, capturando clientes em momentos diferentes da jornada de compra. Posso apresentar uma proposta rápida de como diversificar sem aumentar o risco?`;
  }

  private fallbackNextChannel(
    _activeChannels: AdsAuditOutput['activeChannels'],
    missedChannels: AdsAuditOutput['missedChannels'],
  ): AdsAuditOutput['suggestedNextChannel'] {
    if (missedChannels.includes('google')) return 'google';
    if (missedChannels.includes('meta')) return 'meta';
    if (missedChannels.includes('tiktok')) return 'tiktok';
    return 'google';
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Nome da empresa' },
          hasWebsite: { type: 'boolean', description: 'Se possui website' },
          metaAds: { type: 'object', description: 'Dados de Meta Ads' },
          googleAds: { type: 'object', description: 'Dados de Google Ads' },
          tiktokAds: { type: 'object', description: 'Dados de TikTok Ads' },
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
