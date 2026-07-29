'use client';

/**
 * Official Tzolkin Brand System Logo & Product Drawn Wordmark for Tzolkin Tracer
 * 
 * Rules & Geometry (Grade 64):
 * - Tile: 64x64, rx=14, fill=var(--bg-secondary)
 * - Tzolkin Mark: Ring (cx=28, cy=30, r=14) + Overlapping Disc (cx=42, cy=30, r=14)
 * - Tracer Mark: Ring (cx=28, cy=30, r=14) + Targeted Disc (cx=42, cy=42, r=7)
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
      aria-label="Mark Tracer"
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
      aria-label="Tzolkin Initial Mark (SVG 1)"
    >
      <rect width="64" height="64" rx="16" fill="var(--bg-secondary)" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1.2" />
      <circle cx="38" cy="26" r="13" fill="#B0B0B0" />
      <circle cx="26" cy="34" r="13" fill="none" stroke="#FFFFFF" strokeWidth="3.6" />
    </svg>
  );
}

/**
 * SVG 2: Final Lead Finder Scanner Tile Mark (Exact SVG from attached user screenshot)
 */
export function LeadFinderScannerTile({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tracer Scanner Mark (SVG 2)"
    >
      <rect width="64" height="64" rx="16" fill="var(--bg-secondary)" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1.2" />
      <circle cx="38" cy="26" r="13" fill="#B0B0B0" />
      <circle cx="26" cy="26" r="13" fill="none" stroke="#FFFFFF" strokeWidth="3.8" />
      <path d="M 18 21 A 9 9 0 0 1 24 15" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="34" y1="34" x2="48" y2="48" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 6 26 H 26" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 26 26 C 34 26 36 18 44 14" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 26 26 C 34 26 36 34 44 38" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="44" cy="14" r="2.2" fill="var(--tzolkin-yellow, #FFD400)" />
      <circle cx="44" cy="38" r="2.2" fill="var(--tzolkin-yellow, #FFD400)" />
    </svg>
  );
}

/**
 * Interactive Vector Morphing Tile (Transitions smoothly between Tzolkin Mark and Lead Finder Scanner Mark on Hover)
 * 
 * Choreography:
 * 1. Grey disc spins 180deg, splits apart into dashed arc and collapses/vanishes BEFORE lens forms.
 * 2. Main ring slides up into magnifying glass lens position.
 * 3. Magnifying handle pops out diagonally with spring elasticity.
 * 4. Inner glare arc illuminates.
 * 5. Yellow tracer signal ray enters from left and bifurcates into twin signal dots!
 */
export function TzolkinMorphingTile({ size = 40, className = '' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        cursor: 'pointer',
      }}
      className={`tzolkin-morphing-tile-container ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Interactive Vector Morphing Mark"
        style={{ width: '100%', height: '100%' }}
      >
        <style>{`
          .morph-tile-rect {
            transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .tzolkin-morphing-tile-container:hover .morph-tile-rect {
            stroke: rgba(255, 255, 255, 0.4);
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.12));
          }

          /* 1. Grey Disc Spins & Splits Apart before vanishing */
          .morph-disc-group {
            transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease;
            transform-origin: 38px 26px;
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
          .tzolkin-morphing-tile-container:hover .morph-disc-group {
            transform: rotate(180deg) scale(0);
            opacity: 0;
          }

          /* 2. Main Ring slides up into magnifying lens */
          .morph-ring {
            transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1) 120ms, stroke-width 450ms ease 120ms;
          }
          .tzolkin-morphing-tile-container:hover .morph-ring {
            transform: translateY(-8px);
            stroke-width: 3.8;
          }

          /* 3. Handle pops out with spring elasticity */
          .morph-handle {
            transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 220ms, opacity 250ms ease 220ms;
            transform-origin: 34px 34px;
            transform: scale(0);
            opacity: 0;
          }
          .tzolkin-morphing-tile-container:hover .morph-handle {
            transform: scale(1);
            opacity: 1;
          }

          /* 4. Glare arc illuminates */
          .morph-glare {
            transition: opacity 300ms ease 300ms;
            opacity: 0;
          }
          .tzolkin-morphing-tile-container:hover .morph-glare {
            opacity: 1;
          }

          /* 5. Input Radar Ray from Left */
          .morph-signal-input {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            transition: stroke-dashoffset 350ms cubic-bezier(0.16, 1, 0.3, 1) 280ms, opacity 200ms ease 280ms;
            opacity: 0;
          }
          .tzolkin-morphing-tile-container:hover .morph-signal-input {
            stroke-dashoffset: 0;
            opacity: 1;
          }

          /* 6. Yellow Bifurcated Line Drawing Animation */
          .morph-bifurcated-line {
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            transition: stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1) 360ms, opacity 250ms ease 360ms;
            opacity: 0;
          }
          .tzolkin-morphing-tile-container:hover .morph-bifurcated-line {
            stroke-dashoffset: 0;
            opacity: 1;
          }

          .morph-bifurcated-dot {
            transform-origin: 44px 26px;
            transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1) 450ms, opacity 200ms ease 450ms;
            transform: scale(0);
            opacity: 0;
          }
          .tzolkin-morphing-tile-container:hover .morph-bifurcated-dot {
            transform: scale(1);
            opacity: 1;
          }
        `}</style>

        <rect className="morph-tile-rect" width="64" height="64" rx="16" fill="var(--bg-secondary)" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1.2" />

        {/* Grey Disc Group */}
        <g className="morph-disc-group">
          <circle cx="38" cy="26" r="13" fill="#B0B0B0" />
        </g>

        {/* Main Ring */}
        <circle className="morph-ring" cx="26" cy="34" r="13" fill="none" stroke="#FFFFFF" strokeWidth="3.6" />

        {/* Lens Glare */}
        <path className="morph-glare" d="M 18 21 A 9 9 0 0 1 24 15" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />

        {/* Magnifying Handle */}
        <line className="morph-handle" x1="34" y1="34" x2="48" y2="48" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />

        {/* Yellow Tracer Signal Line & Dots */}
        <path className="morph-signal-input" d="M 6 26 H 26" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
        <path className="morph-bifurcated-line" d="M 26 26 C 34 26 36 18 44 14" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
        <path className="morph-bifurcated-line" d="M 26 26 C 34 26 36 34 44 38" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="morph-bifurcated-dot" cx="44" cy="14" r="2.2" fill="var(--tzolkin-yellow, #FFD400)" />
        <circle className="morph-bifurcated-dot" cx="44" cy="38" r="2.2" fill="var(--tzolkin-yellow, #FFD400)" />
      </svg>
    </div>
  );
}

/**
 * Continuous Animated Loader Tile (Loops the exact same motion sequence)
 */
export function TzolkinAnimatedTile({ size = 56, className = '' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-block',
      }}
      className={`tzolkin-animated-loader-tile ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Tzolkin Continuous Vector Loader Mark"
        style={{ width: '100%', height: '100%' }}
      >
        <style>{`
          .loader-tile-rect {
            animation: loaderPulseGlow 2.4s infinite ease-in-out;
          }
          @keyframes loaderPulseGlow {
            0%, 100% { stroke: rgba(255, 255, 255, 0.16); }
            50% { stroke: rgba(255, 255, 255, 0.4); }
          }

          /* 1. Grey Disc Spin & Dissolve */
          .loader-disc-group {
            animation: loaderDiscSpinDissolve 2.4s infinite cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: 38px 26px;
          }
          @keyframes loaderDiscSpinDissolve {
            0%, 10% { transform: rotate(0deg) scale(1); opacity: 1; }
            30%, 70% { transform: rotate(180deg) scale(0); opacity: 0; }
            90%, 100% { transform: rotate(360deg) scale(1); opacity: 1; }
          }

          /* 2. Main Ring Morph to Lens */
          .loader-ring {
            animation: loaderRingMorph 2.4s infinite cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes loaderRingMorph {
            0%, 15% { transform: translateY(0); stroke-width: 3.6px; }
            35%, 65% { transform: translateY(-8px); stroke-width: 3.8px; }
            85%, 100% { transform: translateY(0); stroke-width: 3.6px; }
          }

          /* 3. Handle Pop */
          .loader-handle {
            animation: loaderHandlePop 2.4s infinite cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-origin: 34px 34px;
          }
          @keyframes loaderHandlePop {
            0%, 22% { transform: scale(0); opacity: 0; }
            38%, 62% { transform: scale(1); opacity: 1; }
            78%, 100% { transform: scale(0); opacity: 0; }
          }

          /* 4. Glare Arc */
          .loader-glare {
            animation: loaderGlareFade 2.4s infinite ease;
          }
          @keyframes loaderGlareFade {
            0%, 25% { opacity: 0; }
            40%, 60% { opacity: 1; }
            75%, 100% { opacity: 0; }
          }

          /* 5. Input Radar Ray coming from left */
          .loader-signal-input {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: loaderInputDraw 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          @keyframes loaderInputDraw {
            0%, 30% { stroke-dashoffset: 20; opacity: 0; }
            40%, 65% { stroke-dashoffset: 0; opacity: 1; }
            78%, 100% { stroke-dashoffset: 20; opacity: 0; }
          }

          /* 6. Yellow Bifurcated Line Animation */
          .loader-bifurcated-line {
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            animation: loaderBifurcatedDraw 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          @keyframes loaderBifurcatedDraw {
            0%, 38% { stroke-dashoffset: 24; opacity: 0; }
            50%, 65% { stroke-dashoffset: 0; opacity: 1; }
            78%, 100% { stroke-dashoffset: 24; opacity: 0; }
          }

          .loader-bifurcated-dot {
            transform-origin: 44px 26px;
            animation: loaderBifurcatedDotPop 2.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
          }
          @keyframes loaderBifurcatedDotPop {
            0%, 46% { transform: scale(0); opacity: 0; }
            54%, 65% { transform: scale(1); opacity: 1; }
            78%, 100% { transform: scale(0); opacity: 0; }
          }
        `}</style>

        <rect className="loader-tile-rect" width="64" height="64" rx="16" fill="var(--bg-secondary)" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1.2" />

        {/* Grey Disc Group */}
        <g className="loader-disc-group">
          <circle cx="38" cy="26" r="13" fill="#B0B0B0" />
        </g>

        {/* Main Ring */}
        <circle className="loader-ring" cx="26" cy="34" r="13" fill="none" stroke="#FFFFFF" strokeWidth="3.6" />

        {/* Lens Glare */}
        <path className="loader-glare" d="M 18 21 A 9 9 0 0 1 24 15" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />

        {/* Magnifying Handle */}
        <line className="loader-handle" x1="34" y1="34" x2="48" y2="48" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />

        {/* Yellow Tracer Signal Line & Dots */}
        <path className="loader-signal-input" d="M 6 26 H 26" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
        <path className="loader-bifurcated-line" d="M 26 26 C 34 26 36 18 44 14" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
        <path className="loader-bifurcated-line" d="M 26 26 C 34 26 36 34 44 38" fill="none" stroke="var(--tzolkin-yellow, #FFD400)" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="loader-bifurcated-dot" cx="44" cy="14" r="2.2" fill="var(--tzolkin-yellow, #FFD400)" />
        <circle className="loader-bifurcated-dot" cx="44" cy="38" r="2.2" fill="var(--tzolkin-yellow, #FFD400)" />
      </svg>
    </div>
  );
}

export function TzolkinHeroVideo({ width = '100%', maxWidth = 640, className = '' }) {
  return (
    <div style={{ width, maxWidth, margin: '0 auto', display: 'flex', justifyContent: 'center' }} className={className}>
      <LeadFinderLockup height={64} />
    </div>
  );
}

/**
 * LeadFinderLockup with Vector Morphing Animation for Headers / Hero
 */
export function LeadFinderLockup({ height = 36, animated = false, className = '' }) {
  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      className={`lead-finder-lockup ${className}`}
    >
      <TzolkinMorphingTile size={height} />
      <svg height={height} viewBox="0 0 264 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Tzolkin Tracer Wordmark">
        <text x="0" y="44" fontFamily="'Inter', system-ui, sans-serif" fontSize="34" letterSpacing="-0.04em">
          <tspan fontWeight="800" fill="#FAFAF7">Tzolkin</tspan>
          <tspan fontWeight="300" fill="#9A9A92"> Tracer</tspan>
        </text>
        <circle cx="248" cy="22" r="3" fill="#FAFAF7" />
        <circle cx="248" cy="22" r="7" fill="none" stroke="#FAFAF7" strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>
    </div>
  );
}

// Alias for backwards compatibility
export function TzolkinLockup({ size = 36, animated = false, className = '' }) {
  return <LeadFinderLockup height={size} animated={animated} className={className} />;
}

/**
 * Clean Vertically Centered Loading Screen (NO TEXT)
 */
export function TzolkinLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <TzolkinAnimatedTile size={56} />
    </div>
  );
}

export function TzolkinFloatingWidget() {
  return (
    <a
      href="https://site-tzolkin.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      title="TZOLKIN — Software de alto padrão"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 14px 6px 8px',
        borderRadius: 100,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(250, 250, 247, 0.08)',
        color: '#FAFAF7',
        textDecoration: 'none',
        transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
        e.currentTarget.style.borderColor = 'rgba(250, 250, 247, 0.6)';
        e.currentTarget.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(250, 250, 247, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.borderColor = 'rgba(250, 250, 247, 0.25)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(250, 250, 247, 0.08)';
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0,
          textTransform: 'none',
          color: 'var(--text-primary)',
        }}
      >
        Tzolkin ↗
      </span>
    </a>
  );
}
