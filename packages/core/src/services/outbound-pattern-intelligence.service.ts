import {
  prisma,
  type GatekeeperBypassStrategy,
  type PainPointCategory,
  type ObjectionHandlingType,
} from '@tzolkin/database';
import { CoreLogger } from '../utils/logger.js';

/** Abaixo disto, mostrar uma taxa é mais enganoso do que não mostrar nada. */
const MIN_SAMPLE_SIZE = 5;

export interface PitchAuditResult {
  wordCount: number;
  pitchScore: number;
  detectedGatekeeperStrategy: GatekeeperBypassStrategy | null;
  detectedPainPoint: PainPointCategory | null;
  detectedObjectionType: ObjectionHandlingType | null;
  suggestions: string[];
  /** null quando não há amostra real suficiente — nunca um palpite disfarçado de dado. */
  benchmarkResponseRate: number | null;
  /** Quantas tentativas reais sustentam benchmarkResponseRate. 0 quando é null. */
  benchmarkSampleSize: number;
}

export interface RecordPatternOutcomeInput {
  niche: string;
  gatekeeperStrategy: GatekeeperBypassStrategy;
  painPoint: PainPointCategory;
  objectionStrategy: ObjectionHandlingType;
  outcome: 'RESPONDED' | 'MEETING_SET' | 'REJECTED';
  wordCount?: number;
}

export class OutboundPatternIntelligenceService {
  private readonly logger = new CoreLogger('OutboundPatternIntelligenceService');

  /**
   * Avalia a qualidade do pitch de outbound em tempo real contra as 5 camadas taxonômicas.
   */
  async auditPitch(
    pitchText: string,
    context?: { niche?: string; hasWebsite?: boolean; hasAds?: boolean },
  ): Promise<PitchAuditResult> {
    if (!pitchText || !pitchText.trim()) {
      return {
        wordCount: 0,
        pitchScore: 0,
        detectedGatekeeperStrategy: null,
        detectedPainPoint: null,
        detectedObjectionType: null,
        suggestions: ['Digite ou selecione uma minuta de pitch para iniciar a auditoria do copiloto.'],
        benchmarkResponseRate: null,
        benchmarkSampleSize: 0,
      };
    }

    const words = pitchText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const lower = pitchText.toLowerCase();

    // 1. Detecção da estratégia de Gatekeeper Bypass
    let detectedGatekeeperStrategy: GatekeeperBypassStrategy | null = null;
    if (lower.includes('reunião') || lower.includes('pediu') || lower.includes('marcelled') || lower.includes('alexandre')) {
      detectedGatekeeperStrategy = 'GK_DIRECT_DECISION_MAKER';
    } else if (lower.includes('aviso técnico') || lower.includes('link quebrado') || lower.includes('não é vendas') || lower.includes('relatório')) {
      detectedGatekeeperStrategy = 'GK_TECHNICAL_PARTNER';
    } else if (lower.includes('orçamento') || lower.includes('quem responde') || lower.includes('proprietário')) {
      detectedGatekeeperStrategy = 'GK_LOW_FRICTION_QUESTION';
    } else {
      detectedGatekeeperStrategy = 'GK_SCHEDULED_REASON';
    }

    // 2. Detecção de Dores (Pain Points)
    let detectedPainPoint: PainPointCategory | null = null;
    if (lower.includes('anúncio') || lower.includes('verba') || lower.includes('tráfego') || lower.includes('meta ads')) {
      detectedPainPoint = 'PAIN_WASTED_AD_SPEND';
    } else if (lower.includes('indicação') || lower.includes('boca a boca') || lower.includes('previsibilidade')) {
      detectedPainPoint = 'PAIN_REFERRAL_DEPENDENCY';
    } else if (lower.includes('concorrente') || lower.includes('google maps') || lower.includes('avaliações')) {
      detectedPainPoint = 'PAIN_COMPETITOR_DOMINANCE';
    } else if (lower.includes('site') || lower.includes('autoridade') || lower.includes('presença')) {
      detectedPainPoint = 'PAIN_POOR_DIGITAL_AUTHORITY';
    } else {
      detectedPainPoint = 'PAIN_LOW_CONVERSION_LEADS';
    }

    // 3. Detecção de Contorno de Objeções
    let detectedObjectionType: ObjectionHandlingType | null = null;
    if (lower.includes('brechas') || lower.includes('auditoria') || lower.includes('teste')) {
      detectedObjectionType = 'AUDIT_GAP_PROOF';
    } else if (lower.includes('vídeo') || lower.includes('2 minutos') || lower.includes('link')) {
      detectedObjectionType = 'ASYNC_MICRO_DEMO';
    } else if (lower.includes('custa') || lower.includes('roi') || lower.includes('15 dias')) {
      detectedObjectionType = 'ROI_WASTE_CALCULATION';
    } else {
      detectedObjectionType = 'METHOD_DIFFERENTIATION';
    }

    // 4. Cálculo de Score & Sugestões
    const suggestions: string[] = [];
    let score = 70;

    // Checagem de Tamanho do Texto (Ideal 45 - 85 palavras para WhatsApp B2B)
    if (wordCount < 20) {
      score -= 15;
      suggestions.push('Mensagem muito curta. Adicione um contexto de dor mais claro.');
    } else if (wordCount > 100) {
      score -= 20;
      suggestions.push(`Mensagem longa (${wordCount} palavras). No WhatsApp B2B, textos entre 45 e 85 palavras possuem +65% de resposta.`);
    } else {
      score += 15;
      suggestions.push('Tamanho de mensagem ideal para engajamento em WhatsApp comercial.');
    }

    // Checagem de Ganchos de Sinais
    if (context?.hasAds && !lower.includes('anúncio') && !lower.includes('meta')) {
      suggestions.push('💡 Dica do Copiloto: O lead tem anúncios ativos no Meta Ads. Mencionar esse fato aumenta a autoridade do pitch.');
    }
    if (context?.hasWebsite === false && !lower.includes('site') && !lower.includes('página')) {
      suggestions.push('💡 Dica do Copiloto: O lead não possui site oficial registrado. Endereçar a falta de landing page é o maior gatilho para este perfil.');
    }

    // Benchmark de resposta: só sai do Cérebro Global (OutboundPatternIntelligence),
    // nunca de um palpite fixo. Sem nicho ou sem amostra suficiente, é null.
    let benchmarkResponseRate: number | null = null;
    let benchmarkSampleSize = 0;

    if (context?.niche) {
      const pattern = await prisma.outboundPatternIntelligence.findUnique({
        where: {
          niche_gatekeeperStrategy_painPoint_objectionStrategy: {
            niche: context.niche,
            gatekeeperStrategy: detectedGatekeeperStrategy,
            painPoint: detectedPainPoint,
            objectionStrategy: detectedObjectionType,
          },
        },
      });

      benchmarkSampleSize = pattern?.attemptsCount ?? 0;
      if (pattern && pattern.attemptsCount >= MIN_SAMPLE_SIZE) {
        benchmarkResponseRate = pattern.responseRate;
      } else {
        suggestions.push(
          benchmarkSampleSize > 0
            ? `Ainda sem dados suficientes para esse padrão em "${context.niche}" (${benchmarkSampleSize} tentativa${benchmarkSampleSize === 1 ? '' : 's'} registrada${benchmarkSampleSize === 1 ? '' : 's'}, mínimo ${MIN_SAMPLE_SIZE}). Os próximos envios alimentam esse número.`
            : `Sem histórico ainda para esse padrão em "${context.niche}". Este será o primeiro registro.`,
        );
      }
    } else {
      suggestions.push('Informe o nicho do lead para comparar com o histórico real de resposta.');
    }

    return {
      wordCount,
      pitchScore: Math.min(100, Math.max(10, score)),
      detectedGatekeeperStrategy,
      detectedPainPoint,
      detectedObjectionType,
      suggestions,
      benchmarkResponseRate,
      benchmarkSampleSize,
    };
  }

  /**
   * Grava e atualiza anonimamente o aprendizado global de conversão de padrões de outbound.
   */
  async recordOutcome(input: RecordPatternOutcomeInput): Promise<void> {
    try {
      const existing = await prisma.outboundPatternIntelligence.findUnique({
        where: {
          niche_gatekeeperStrategy_painPoint_objectionStrategy: {
            niche: input.niche,
            gatekeeperStrategy: input.gatekeeperStrategy,
            painPoint: input.painPoint,
            objectionStrategy: input.objectionStrategy,
          },
        },
      });

      const isSuccess = input.outcome === 'RESPONDED' || input.outcome === 'MEETING_SET';
      const isMeeting = input.outcome === 'MEETING_SET';

      if (existing) {
        const newAttempts = existing.attemptsCount + 1;
        const newResponseRate = (existing.responseRate * existing.attemptsCount + (isSuccess ? 100 : 0)) / newAttempts;
        const newMeetingRate = (existing.meetingConversionRate * existing.attemptsCount + (isMeeting ? 100 : 0)) / newAttempts;

        await prisma.outboundPatternIntelligence.update({
          where: { id: existing.id },
          data: {
            attemptsCount: newAttempts,
            responseRate: parseFloat(newResponseRate.toFixed(2)),
            meetingConversionRate: parseFloat(newMeetingRate.toFixed(2)),
          },
        });
      } else {
        await prisma.outboundPatternIntelligence.create({
          data: {
            niche: input.niche,
            gatekeeperStrategy: input.gatekeeperStrategy,
            painPoint: input.painPoint,
            objectionStrategy: input.objectionStrategy,
            attemptsCount: 1,
            responseRate: isSuccess ? 100 : 0,
            meetingConversionRate: isMeeting ? 100 : 0,
            optimalWordCount: input.wordCount || 65,
          },
        });
      }

      this.logger.info(`Padrão de outbound atualizado no Cérebro Global para nicho ${input.niche}`);
    } catch (err) {
      this.logger.error(`Erro ao gravar resultado no Cérebro Global:`, err);
    }
  }
}
