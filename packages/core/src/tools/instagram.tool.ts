import { z } from 'zod';
import * as cheerio from 'cheerio';
import type { Tool, AnthropicToolDefinition, OpenAIToolDefinition, ToolResult } from './types.js';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const InstagramInputSchema = z.object({
  businessName: z.string().min(2).describe('Nome do negócio a ser buscado no Instagram'),
  location: z.string().optional().describe('Cidade/UF ou localização para refinar a busca'),
  directHandle: z
    .string()
    .optional()
    .describe('Handle direto do Instagram (sem @), se já for conhecido previamente'),
});

export type InstagramInput = z.input<typeof InstagramInputSchema>;
export type InstagramParsedInput = z.output<typeof InstagramInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const LinktreeItemSchema = z.object({
  text: z.string(),
  url: z.string().url(),
  type: z.enum(['whatsapp', 'website', 'portfolio', 'calendar', 'other']),
});

export type LinktreeItem = z.infer<typeof LinktreeItemSchema>;

export const InstagramProfileSchema = z.object({
  handle: z.string().nullable(),
  url: z.string().nullable(),
  bio: z.string().nullable(),
  followers: z.string().nullable(),
  posts: z.number().int().nullable(),
  profilePicUrl: z.string().nullable(),
  website: z.string().nullable(),
  extraLinks: z.array(LinktreeItemSchema).nullable(),
});

export type InstagramProfile = z.infer<typeof InstagramProfileSchema>;

// ─── Tool Implementation ──────────────────────────────────────────────────────

import { SerperClient } from '../clients/serper.client.js';

export class InstagramTool implements Tool<InstagramInput, InstagramProfile> {
  readonly name = 'instagram_profile_search' as const;
  readonly description =
    'Localiza o perfil público no Instagram de uma PME brasileira, extrai bio, ' +
    'número de seguidores, posts e links externos (Linktree, WhatsApp, Website). ' +
    'Indispensável para enriquecer dados de presença digital e contato do decisor.';
  readonly inputSchema = InstagramInputSchema;

  private readonly serperClient: SerperClient;

  constructor(serperApiKeyOrClient?: string | SerperClient) {
    if (serperApiKeyOrClient instanceof SerperClient) {
      this.serperClient = serperApiKeyOrClient;
    } else {
      this.serperClient = new SerperClient(serperApiKeyOrClient);
    }
  }

  async execute(input: InstagramInput): Promise<ToolResult<InstagramProfile>> {
    const startedAt = Date.now();
    const executedAt = new Date();

    try {
      const validated = this.inputSchema.parse(input);
      let profile: InstagramProfile | null = null;

      if (validated.directHandle) {
        const scraped = await this.scrapeProfile(validated.directHandle);
        profile = {
          handle: validated.directHandle,
          url: `https://www.instagram.com/${validated.directHandle}/`,
          ...scraped,
          extraLinks: scraped.website ? await this.scrapeLandingPageLinks(scraped.website) : null,
        };
      } else if (this.serperClient.isConfigured) {
        const handle = await this.serperClient.searchInstagramHandle(
          validated.businessName,
          validated.location,
        );
        if (handle) {
          const scraped = await this.scrapeProfile(handle);
          const extraLinks = scraped.website
            ? await this.scrapeLandingPageLinks(scraped.website)
            : null;
          profile = {
            handle,
            url: `https://www.instagram.com/${handle}/`,
            ...scraped,
            extraLinks,
          };
        }
      } else {
        profile = await this.findProfileWithScraping(validated.businessName, validated.location);
      }

      if (!profile) {
        profile = {
          handle: null,
          url: null,
          bio: null,
          followers: null,
          posts: null,
          profilePicUrl: null,
          website: null,
          extraLinks: null,
        };
      }

      return {
        success: true,
        data: profile,
        executedAt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[InstagramTool] Error:', message);

      return {
        success: false,
        error: message,
        executedAt,
        durationMs: Date.now() - startedAt,
      };
    }
  }



  private async findProfileWithScraping(
    businessName: string,
    location?: string,
  ): Promise<InstagramProfile | null> {
    const query = `${businessName} ${location ?? ''} instagram`.trim();
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('a').each((_i: number, el: unknown) => {
      const href = $(el as Parameters<typeof $>[0]).attr('href');
      if (href?.includes('instagram.com/')) {
        const match = href.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
        if (
          match?.[1] &&
          !['accounts', 'explore', 'p', 'reel', 'stories', 'about', 'legal', 'developer'].includes(
            match[1],
          )
        ) {
          links.push(match[1]);
        }
      }
    });

    if (links.length === 0) return null;

    const bestHandle = this.getMostFrequent(links);
    const scraped = await this.scrapeProfile(bestHandle);
    const extraLinks = scraped.website
      ? await this.scrapeLandingPageLinks(scraped.website)
      : null;

    return {
      handle: bestHandle,
      url: `https://www.instagram.com/${bestHandle}/`,
      ...scraped,
      extraLinks,
    };
  }

  private async scrapeProfile(handle: string): Promise<Omit<InstagramProfile, 'handle' | 'url' | 'extraLinks'>> {
    try {
      const response = await fetch(`https://www.instagram.com/${handle}/`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        return { bio: null, followers: null, posts: null, profilePicUrl: null, website: null };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const description = $('meta[property="og:description"]').attr('content') ?? '';
      const profilePic = $('meta[property="og:image"]').attr('content') ?? null;

      let followers: string | null = null;
      let posts: number | null = null;

      const followersMatch = description.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      if (followersMatch?.[1]) followers = followersMatch[1];

      const postsMatch = description.match(/([\d,.]+)\s*Posts/i);
      if (postsMatch?.[1]) {
        posts = parseInt(postsMatch[1].replace(/,/g, ''), 10);
      }

      let bio: string | null = null;
      let website: string | null = null;
      const bioParts = description.split(' - ');
      if (bioParts.length > 1) {
        bio = bioParts.slice(1).join(' - ').trim().replace(/^[""]|[""]$/g, '');
        if (bio) {
          const urlMatch = bio.match(/(https?:\/\/[^\s]+)/i);
          if (urlMatch?.[1]) website = urlMatch[1];
        }
      }

      return { bio, followers, posts, profilePicUrl: profilePic, website };
    } catch {
      return { bio: null, followers: null, posts: null, profilePicUrl: null, website: null };
    }
  }

  private async scrapeLandingPageLinks(url: string): Promise<LinktreeItem[] | null> {
    const isLandingPage = /linktr\.ee|beacons\.ai|bio\.site|link\.bio/i.test(url);
    if (!isLandingPage) return null;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) return null;

      const html = await response.text();
      const $ = cheerio.load(html);
      const items: LinktreeItem[] = [];

      $('a').each((_i: number, el: unknown) => {
        const href = $(el as Parameters<typeof $>[0]).attr('href');
        const text = $(el as Parameters<typeof $>[0]).text().trim();


        if (href?.startsWith('http')) {
          const lowerText = text.toLowerCase();
          const lowerHref = href.toLowerCase();
          let type: LinktreeItem['type'] = 'other';

          if (
            lowerText.includes('whatsapp') ||
            lowerText.includes('contato') ||
            lowerHref.includes('wa.me')
          ) {
            type = 'whatsapp';
          } else if (
            lowerText.includes('site') ||
            lowerText.includes('web') ||
            lowerText.includes('página')
          ) {
            type = 'website';
          } else if (
            lowerText.includes('portfólio') ||
            lowerText.includes('trabalhos') ||
            lowerText.includes('fotos')
          ) {
            type = 'portfolio';
          } else if (
            lowerText.includes('agenda') ||
            lowerText.includes('calendário') ||
            lowerText.includes('marcar')
          ) {
            type = 'calendar';
          }

          items.push({ text, url: href, type });
        }
      });

      return items.length > 0 ? items : null;
    } catch {
      return null;
    }
  }

  private getMostFrequent(items: string[]): string {
    const counts: Record<string, number> = {};
    items.forEach(i => {
      counts[i] = (counts[i] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0]!;
  }

  toAnthropicTool(): AnthropicToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Nome do negócio' },
          location: { type: 'string', description: 'Localização/Cidade' },
          directHandle: { type: 'string', description: 'Handle direto do Instagram (sem @)' },
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
