import { z } from 'zod';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';
import { CoreLogger } from '../utils/logger.js';
import * as tls from 'tls';
import { URL } from 'url';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const WebsiteAuditInputSchema = z.object({
  websiteUrl: z.string().url().describe('URL completa do site a ser auditado'),
});

export type WebsiteAuditInput = z.infer<typeof WebsiteAuditInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const WebsiteAuditOutputSchema = z.object({
  url: z.string(),
  isReachable: z.boolean(),
  loadTimeMs: z.number().nullable(),
  performanceScore: z.number().nullable().describe('Score do PageSpeed Insights (0 a 100)'),
  ssl: z.object({
    valid: z.boolean(),
    issuer: z.string().nullable(),
    expiresAt: z.string().nullable(),
    daysUntilExpiration: z.number().nullable(),
  }),
});

export type WebsiteAuditOutput = z.infer<typeof WebsiteAuditOutputSchema>;

// ─── Tool Implementation ──────────────────────────────────────────────────────

export class WebsiteAuditTool implements Tool<WebsiteAuditInput, WebsiteAuditOutput> {
  readonly name = 'website_audit' as const;
  readonly description = 'Audita a performance e a segurança básica de um site (PageSpeed e SSL).';
  readonly inputSchema = WebsiteAuditInputSchema;

  private readonly logger = new CoreLogger('WebsiteAuditTool');
  private readonly pageSpeedApiKey: string | undefined;

  constructor(pageSpeedApiKey?: string | undefined) {
    this.pageSpeedApiKey = pageSpeedApiKey;
  }

  async execute(input: WebsiteAuditInput): Promise<ToolResult<WebsiteAuditOutput>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);
      const url = new URL(validated.websiteUrl);

      // 1. SSL Check
      const sslResult = await this.checkSSL(url.hostname);

      // 2. PageSpeed API / Basic Reachability
      let performanceScore: number | null = null;
      let loadTimeMs: number | null = null;
      let isReachable = false;

      // Se temos chave, usamos a API do PageSpeed. Se não, fazemos um fetch rápido
      if (this.pageSpeedApiKey) {
        try {
          const pspUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
            validated.websiteUrl
          )}&key=${this.pageSpeedApiKey}&category=PERFORMANCE&strategy=MOBILE`;
          
          const pspResponse = await fetch(pspUrl);
          if (pspResponse.ok) {
            const pspData = await pspResponse.json();
            const score = pspData?.lighthouseResult?.categories?.performance?.score;
            if (typeof score === 'number') {
              performanceScore = Math.round(score * 100);
            }
            isReachable = true;
          }
        } catch (err) {
          this.logger.warn(`Falha no PageSpeed para ${validated.websiteUrl}`, { error: String(err) });
        }
      }

      // Se não temos score, medimos o ping básico
      if (!isReachable) {
        try {
          const fetchStart = Date.now();
          const res = await fetch(validated.websiteUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            isReachable = true;
            loadTimeMs = Date.now() - fetchStart;
          }
        } catch {
          isReachable = false;
        }
      }

      const output: WebsiteAuditOutput = {
        url: validated.websiteUrl,
        isReachable,
        performanceScore,
        loadTimeMs,
        ssl: sslResult,
      };

      const durationMs = Date.now() - startedAt;
      return { success: true, data: output, executedAt, durationMs };

    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Erro desconhecido na auditoria do site';
      this.logger.error('Falha na auditoria', error, { durationMs });
      
      return {
        success: false,
        error: message,
        executedAt,
        durationMs,
      };
    }
  }

  private checkSSL(hostname: string): Promise<WebsiteAuditOutput['ssl']> {
    return new Promise((resolve) => {
      try {
        const socket = tls.connect({
          host: hostname,
          port: 443,
          servername: hostname,
          rejectUnauthorized: false,
        });

        socket.setTimeout(3000);

        socket.on('secureConnect', () => {
          const cert = socket.getPeerCertificate();
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy();
            resolve({ valid: false, issuer: null, expiresAt: null, daysUntilExpiration: null });
            return;
          }

          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiration = Math.round((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isValid = socket.authorized && daysUntilExpiration > 0;

          socket.destroy();
          const issuerO = Array.isArray(cert.issuer.O) ? cert.issuer.O[0] : cert.issuer.O;
          const issuerCN = Array.isArray(cert.issuer.CN) ? cert.issuer.CN[0] : cert.issuer.CN;

          resolve({
            valid: isValid,
            issuer: issuerO ?? issuerCN ?? 'Unknown',
            expiresAt: validTo.toISOString(),
            daysUntilExpiration,
          });
        });

        socket.on('error', () => {
          resolve({ valid: false, issuer: null, expiresAt: null, daysUntilExpiration: null });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({ valid: false, issuer: null, expiresAt: null, daysUntilExpiration: null });
        });

      } catch {
        resolve({ valid: false, issuer: null, expiresAt: null, daysUntilExpiration: null });
      }
    });
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          websiteUrl: { type: 'string', description: 'URL do site' },
        },
        required: ['websiteUrl'],
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
            websiteUrl: { type: 'string', description: 'URL do site' },
          },
          required: ['websiteUrl'],
        },
      },
    };
  }
}
