'use client';

/**
 * Official Tzolkin Brand System Logo Component for Lead Finder
 * 
 * Rules & Geometry (Grade 64):
 * - Tile: 64x64, rx=14, fill=#0A0A0A
 * - Ring (Varredura): cx=28, cy=30, r=14, stroke-width=2.4, stroke=#FAFAF7
 * - Solid Disc (Lead Localizado): cx=42, cy=42, r=7, fill=#FAFAF7
 */

export function TzolkinGlyph({ size = 32, color = '#FAFAF7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mark Lead Finder"
    >
      {/* Anel (Campo de Varredura) */}
      <circle cx="28" cy="30" r="14" fill="none" stroke={color} strokeWidth="2.4" />
      {/* Disco Sólido (Lead Localizado) */}
      <circle cx="42" cy="42" r="7" fill={color} />
    </svg>
  );
}

export function TzolkinTile({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mark Lead Finder Tile"
    >
      {/* Tile Fundo #0A0A0A com rx=14 */}
      <rect width="64" height="64" rx="14" fill="#0A0A0A" />
      {/* Anel #FAFAF7 */}
      <circle cx="28" cy="30" r="14" fill="none" stroke="#FAFAF7" strokeWidth="2.4" />
      {/* Disco Sólido #FAFAF7 */}
      <circle cx="42" cy="42" r="7" fill="#FAFAF7" />
    </svg>
  );
}

export function TzolkinLockup({ size = 40, theme = 'dark', className = '' }) {
  const isDark = theme === 'dark';
  const textColorPrimary = isDark ? '#FAFAF7' : '#0A0A0A';
  const textColorSecondary = isDark ? '#6E6E68' : '#6E6E68';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      }}
      className={className}
    >
      <TzolkinTile size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span
          style={{
            fontSize: size * 0.42,
            fontWeight: 650,
            color: textColorPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          Lead
        </span>
        <span
          style={{
            fontSize: size * 0.42,
            fontWeight: 400,
            color: textColorSecondary,
            letterSpacing: '-0.02em',
          }}
        >
          Finder
        </span>
      </div>
    </div>
  );
}
