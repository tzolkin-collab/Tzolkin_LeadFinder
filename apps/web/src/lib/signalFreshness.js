/**
 * Recência é física: sinal recente pulsa em amarelo, sinal antigo esmaece por
 * uma escala de cinza — nunca preto. Zero hex novo, só tokens que já existem
 * em globals.css. Ver .claude/skills/tracer-design.
 *
 * Faixas: <=1 dia pulsa (é o "agora" do feed); <=7 dias ainda é amarelo, mas
 * quieto; <=21 dias vira texto secundário; acima disso, terciário.
 */
export function getFreshnessStyle(ageDays) {
  if (ageDays <= 1) return { color: 'var(--tzolkin-yellow)', pulse: true };
  if (ageDays <= 7) return { color: 'var(--tzolkin-yellow)', pulse: false };
  if (ageDays <= 21) return { color: 'var(--text-secondary)', pulse: false };
  return { color: 'var(--text-tertiary)', pulse: false };
}
