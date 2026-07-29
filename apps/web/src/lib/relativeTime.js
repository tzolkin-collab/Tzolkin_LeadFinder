const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const UNITS = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * "agora", "há 2 h", "há 16 dias" — sempre no passado, nunca projeta futuro
 * (um sinal já observado não tem "daqui a" sentido nenhum aqui).
 */
export function formatRelativeTime(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const diffMs = date.getTime() - Date.now();

  for (const [unit, ms] of UNITS) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return 'agora';
}

/** Idade em dias, sempre >= 0. Base para as faixas de frescor. */
export function getAgeDays(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return Math.max(0, (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}
