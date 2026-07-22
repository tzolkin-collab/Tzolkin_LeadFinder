'use client';

/**
 * Official Tzolkin Brand System Logo & Loader Component for Lead Finder
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
      <circle cx="28" cy="30" r="14" fill="none" stroke={color} strokeWidth="2.4" />
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
      <rect width="64" height="64" rx="14" fill="#0A0A0A" />
      <circle cx="28" cy="30" r="14" fill="none" stroke="#FAFAF7" strokeWidth="2.4" />
      <circle cx="42" cy="42" r="7" fill="#FAFAF7" />
    </svg>
  );
}

export function TzolkinLockup({ size = 32, theme = 'dark', className = '' }) {
  const isDark = theme === 'dark';
  const textColorPrimary = isDark ? '#FAFAF7' : '#0A0A0A';
  const textColorSecondary = '#6E6E68';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: '"Archivo", "Montserrat", "Geist", system-ui, -apple-system, sans-serif',
      }}
      className={className}
    >
      <TzolkinTile size={size} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, lineHeight: 1 }}>
        <span
          style={{
            fontSize: Math.max(14, size * 0.45),
            fontWeight: 700,
            color: textColorPrimary,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          TZOLKIN
        </span>
        <span
          style={{
            fontSize: Math.max(11, size * 0.32),
            fontWeight: 600,
            color: textColorSecondary,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          · LEAD FINDER
        </span>
      </div>
    </div>
  );
}

export function TzolkinLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div className="pulse-loader">
        <TzolkinLockup size={36} />
      </div>
    </div>
  );
}
