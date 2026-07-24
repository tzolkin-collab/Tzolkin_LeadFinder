import { CoreLogger } from './logger.js';

export interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  retryOn?: (response: Response | null, error: unknown) => boolean;
}

const logger = new CoreLogger('FetchWithRetry');

function isTransientError(response: Response | null, error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true; // network errors
  if (!response) return true;
  const status = response.status;
  if (status >= 500) return true;
  if (status === 429) return true;
  return false;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const { timeoutMs = 10000, maxRetries = 3, baseDelayMs = 300, retryOn = isTransientError, ...fetchOptions } = options;

  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      lastResponse = response;

      if (attempt < maxRetries && retryOn(response, null)) {
        const delay = baseDelayMs * 2 ** attempt;
        logger.warn(`Transient HTTP error, retrying`, { url, status: response.status, attempt, delay });
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && retryOn(null, error)) {
        const delay = baseDelayMs * 2 ** attempt;
        logger.warn(`Fetch error, retrying`, { url, attempt, delay, error: error instanceof Error ? error.message : String(error) });
        await sleep(delay);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
