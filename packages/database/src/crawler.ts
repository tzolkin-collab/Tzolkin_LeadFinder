import { prisma } from './index.js';
import { recordObservation } from './services/observation.service.js';

/**
 * Crawler de enriquecimento por busca: CNPJ na Brasil API e sinais de momento
 * (contratação, expansão, investimento) via Serper.
 *
 * ⚠️ Reescrito em 30/07 depois de uma auditoria. A versão anterior:
 *   1. Executava sozinha no import (`runCrawler()` no escopo do módulo) — num
 *      pacote de biblioteca, então qualquer import disparava a coleta.
 *   2. Quando faltava `SERPER_API_KEY`, devolvia texto MOCKADO escrito no
 *      próprio código, que virava Signal real com `source: GOOGLE_SEARCH_NEWS`
 *      e eixo DINHEIRO. Chegou a gravar "Empresa levanta rodada Série A de
 *      R$ 10 milhões" na base canônica compartilhada, sem nenhuma busca ter
 *      acontecido.
 *   3. Criava um negócio fictício ("Tech Corp S.A") na base quando não achava
 *      empresa pendente.
 *   4. Gravava observação com `payloadHash: rf_<cnpj>_<Date.now()>`, o que
 *      anula o dedup: todo run criava linha nova e o motor de diff passava a
 *      comparar duplicatas.
 *
 * As quatro coisas foram removidas. O princípio do projeto vale aqui como em
 * todo o resto: **sem fonte, não se inventa dado**. Faltando chave, o crawler
 * falha explicitamente em vez de fabricar.
 */

// ─── Tipos das respostas externas ─────────────────────────────────────────

interface BrasilApiCnpjResponse {
  cnpj?: string;
  cnae_fiscal?: number;
  municipio?: string;
  uf?: string;
  razao_social?: string;
  descricao_situacao_cadastral?: string;
}

interface SerperResult {
  title?: string;
  snippet?: string;
  link?: string;
}

interface SerperResponse {
  organic?: SerperResult[];
  news?: SerperResult[];
}

export class MissingCrawlerCredentialError extends Error {
  constructor(key: string) {
    super(
      `${key} não configurada. O crawler não roda sem fonte — inventar resultado ` +
        `colocaria dado falso na base canônica compartilhada.`,
    );
    this.name = 'MissingCrawlerCredentialError';
  }
}

// ─── Fontes ───────────────────────────────────────────────────────────────

async function fetchBrasilApi(cnpj: string): Promise<BrasilApiCnpjResponse | null> {
  const cleanCnpj = cnpj.replace(/\D/g, '');

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: { 'User-Agent': 'TzolkinTracer/1.0 (contato@tzolkin.com)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BrasilApiCnpjResponse;
  } catch (err) {
    console.error('Falha ao buscar Brasil API:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function searchGoogle(query: string, apiKey: string): Promise<SerperResponse> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SerperResponse;
  } catch (err) {
    console.error('Falha ao buscar Serper:', err instanceof Error ? err.message : String(err));
    // Falha de rede devolve vazio — que significa "não sabemos", e não gera
    // sinal. Diferente de devolver mock, que significaria "sabemos que sim".
    return {};
  }
}

// ─── Sinais ───────────────────────────────────────────────────────────────

/**
 * ⚠️ Estes tipos ainda NÃO estão no mapa de relevância
 * (`specialty-relevance.service.ts`) nem nas regras de necessidade
 * (`need-inference.service.ts`). Enquanto não estiverem, o sinal é gravado
 * mas não chega a nenhuma tela nem gera lead casado — é write-only.
 *
 * Convertidos para MAIUSCULO_COM_UNDERLINE (eram "Contratando", "Rodada de
 * Investimento", "Expansão") para pelo menos seguir a convenção do resto.
 * Ligar na relevância depende da decisão sobre o contrato de sinal dinâmico.
 */
const CRAWLER_SIGNALS = {
  CONTRATANDO: { type: 'CONTRATANDO', axis: 'MOMENTO' },
  RODADA_DE_INVESTIMENTO: { type: 'RODADA_DE_INVESTIMENTO', axis: 'DINHEIRO' },
  EXPANSAO: { type: 'EXPANSAO', axis: 'MOMENTO' },
} as const;

interface DetectedSignal {
  type: string;
  axis: 'DOR' | 'DINHEIRO' | 'MOMENTO' | 'ALCANCE';
  source: 'GOOGLE_SEARCH_JOBS' | 'GOOGLE_SEARCH_NEWS';
  evidence: Record<string, unknown>;
}

function textOf(results: SerperResult[] | undefined): string {
  return (results ?? [])
    .map((r) => `${r.title ?? ''} ${r.snippet ?? ''}`)
    .join(' ')
    .toLowerCase();
}

async function detectSignals(businessName: string, apiKey: string): Promise<DetectedSignal[]> {
  const detected: DetectedSignal[] = [];

  const jobsSearch = await searchGoogle(`"${businessName}" vagas`, apiKey);
  const jobsText = textOf(jobsSearch.organic);
  if (/\b(vaga|contratando|oportunidade)\b/.test(jobsText)) {
    detected.push({
      ...CRAWLER_SIGNALS.CONTRATANDO,
      source: 'GOOGLE_SEARCH_JOBS',
      evidence: { searchResults: (jobsSearch.organic ?? []).slice(0, 2) },
    });
  }

  const newsSearch = await searchGoogle(`"${businessName}" investimento OR expansão`, apiKey);
  const newsText = textOf([...(newsSearch.news ?? []), ...(newsSearch.organic ?? [])]);

  if (/\b(série a|série b|investimento|aporte)\b/.test(newsText)) {
    detected.push({
      ...CRAWLER_SIGNALS.RODADA_DE_INVESTIMENTO,
      source: 'GOOGLE_SEARCH_NEWS',
      evidence: { searchResults: (newsSearch.news ?? []).slice(0, 2) },
    });
  }

  if (/\b(expansão|crescimento)\b/.test(newsText)) {
    detected.push({
      ...CRAWLER_SIGNALS.EXPANSAO,
      source: 'GOOGLE_SEARCH_NEWS',
      evidence: { searchResults: (newsSearch.organic ?? []).slice(0, 2) },
    });
  }

  return detected;
}

// ─── Execução ─────────────────────────────────────────────────────────────

export interface RunCrawlerOptions {
  /** Quantos negócios processar por rodada. */
  batchSize?: number;
  /** Pausa entre negócios, em ms — respeito a rate limit das fontes. */
  delayMs?: number;
}

export interface RunCrawlerResult {
  processed: number;
  signalsCreated: number;
  observationsRecorded: number;
}

/**
 * Enriquece negócios canônicos que têm CNPJ mas ainda não têm CNAE.
 *
 * NÃO cria negócio de teste: se não há nada pendente, retorna zerado. A base
 * canônica é compartilhada entre tenants — não é lugar de dado de exercício.
 */
export async function runCrawler(options: RunCrawlerOptions = {}): Promise<RunCrawlerResult> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new MissingCrawlerCredentialError('SERPER_API_KEY');

  const batchSize = options.batchSize ?? 5;
  const delayMs = options.delayMs ?? 2000;

  const pending = await prisma.canonicalBusiness.findMany({
    where: { cnpj: { not: null }, cnaeCode: null },
    take: batchSize,
  });

  if (pending.length === 0) {
    console.log('Nenhum negócio pendente de enriquecimento.');
    return { processed: 0, signalsCreated: 0, observationsRecorded: 0 };
  }

  let signalsCreated = 0;
  let observationsRecorded = 0;

  for (const business of pending) {
    console.log(`\nProcessando: ${business.name} (CNPJ: ${business.cnpj})`);

    const rfData = business.cnpj ? await fetchBrasilApi(business.cnpj) : null;

    if (rfData) {
      // Via recordObservation: hash estável de conteúdo, dedup real e
      // atualização de lastObservedAt. A versão anterior gravava direto com
      // payloadHash contendo Date.now(), o que garantia zero dedup.
      const result = await recordObservation({
        canonicalId: business.id,
        source: 'BRASIL_API_CNPJ',
        payload: rfData as unknown,
      });
      if (result.created) observationsRecorded++;
      console.log(
        `  BrasilAPI: CNAE=${rfData.cnae_fiscal ?? '—'}, ${rfData.municipio ?? '—'}/${rfData.uf ?? '—'}` +
          (result.created ? '' : ' (sem mudança desde a última coleta)'),
      );
    }

    const detected = await detectSignals(business.name, apiKey);
    for (const sig of detected) {
      await prisma.signal.create({
        data: {
          canonicalId: business.id,
          type: sig.type,
          axis: sig.axis,
          source: sig.source,
          evidence: sig.evidence as never,
          observedAt: new Date(),
        },
      });
      signalsCreated++;
      console.log(`  Sinal: [${sig.type}] via ${sig.source}`);
    }

    // Só escreve campo que a fonte realmente trouxe — `undefined` sobrescreveria
    // com nulo um dado que outra coleta já tinha preenchido.
    const patch: { cnaeCode?: string; city?: string; state?: string; lastObservedAt: Date } = {
      lastObservedAt: new Date(),
    };
    if (rfData?.cnae_fiscal != null) patch.cnaeCode = String(rfData.cnae_fiscal);
    if (rfData?.municipio) patch.city = rfData.municipio;
    if (rfData?.uf) patch.state = rfData.uf;

    await prisma.canonicalBusiness.update({ where: { id: business.id }, data: patch });

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { processed: pending.length, signalsCreated, observationsRecorded };
}
