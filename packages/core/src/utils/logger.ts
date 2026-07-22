export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogPayload {
  module: string;
  message: string;
  durationMs?: number | undefined;
  error?: string | undefined;
  meta?: Record<string, unknown> | undefined;
}

/**
 * Lightweight, structured logger for Lead Finder core tools and pipelines.
 * Outputs JSON in production / CI and clean formatted text in dev.
 * Ensures API keys and sensitive tokens are never printed to stdout/stderr.
 */
export class CoreLogger {
  private readonly moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  info(message: string, meta?: Record<string, unknown>, durationMs?: number): void {
    this.emit('info', message, meta, durationMs);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.emit('warn', message, meta);
  }

  error(message: string, errorObj?: unknown, meta?: Record<string, unknown>): void {
    const errMessage =
      errorObj instanceof Error
        ? errorObj.message
        : typeof errorObj === 'string'
          ? errorObj
          : undefined;

    this.emit('error', message, meta, undefined, errMessage);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      this.emit('debug', message, meta);
    }
  }

  private emit(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    durationMs?: number,
    errorMsg?: string,
  ): void {
    const isJson = process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';
    const timestamp = new Date().toISOString();
    const sanitizedMeta = meta ? this.sanitizeMeta(meta) : undefined;
    const sanitizedError = errorMsg ? this.sanitizeString(errorMsg) : undefined;

    if (isJson) {
      const payload = {
        timestamp,
        level,
        module: this.moduleName,
        message: this.sanitizeString(message),
        ...(durationMs !== undefined ? { durationMs } : {}),
        ...(sanitizedError ? { error: sanitizedError } : {}),
        ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
      };
      console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
    } else {
      const durationTag = durationMs !== undefined ? ` (${durationMs}ms)` : '';
      const metaTag = sanitizedMeta ? ` ${JSON.stringify(sanitizedMeta)}` : '';
      const errorTag = sanitizedError ? ` | Error: ${sanitizedError}` : '';
      const tag = `[${timestamp}] [${level.toUpperCase()}] [${this.moduleName}]`;

      const formatted = `${tag} ${this.sanitizeString(message)}${durationTag}${metaTag}${errorTag}`;

      if (level === 'error') {
        console.error(formatted);
      } else if (level === 'warn') {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }
  }

  private sanitizeString(str: string): string {
    // Redact potential API keys or tokens (sk-..., AIzaSy..., bearer tokens)
    return str
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_OPENAI_KEY]')
      .replace(/AIzaSy[a-zA-Z0-9_-]{30,}/g, '[REDACTED_GOOGLE_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
  }

  private sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === 'string') {
        clean[key] = this.sanitizeString(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }
}
