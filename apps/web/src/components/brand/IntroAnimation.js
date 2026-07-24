'use client';

import { useState, useEffect } from 'react';

export function IntroAnimation({ onComplete, durationMs = 3400 }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, durationMs - 400);

    const endTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [durationMs, onComplete]);

  if (!visible) return null;

  const leadLetters = ['L', 'e', 'a', 'd'];
  const finderLetters = ['F', 'i', 'n', 'd', 'e', 'r'];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fading ? 'none' : 'auto',
      }}
      onClick={() => {
        setFading(true);
        setTimeout(() => {
          setVisible(false);
          if (onComplete) onComplete();
        }, 200);
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          width="390"
          height="90"
          viewBox="0 0 390 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Lead Finder Kinetic Motion Intro"
        >
          <style>{`
            /* 1. Tile Pop & Glow */
            .intro-tile {
              animation: introTilePop 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
              transform-origin: 40px 45px;
            }
            @keyframes introTilePop {
              0% { transform: scale(0.5) rotate(-6deg); opacity: 0; filter: blur(8px); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0px); }
            }

            /* 1.5. Grey Disc Spins 180deg & Splits Apart before vanishing */
            .intro-disc-group {
              animation: introDiscSpinDissolve 480ms cubic-bezier(0.4, 0, 0.2, 1) 220ms forwards;
              transform-origin: 48px 32px;
            }
            @keyframes introDiscSpinDissolve {
              0% { transform: rotate(0deg) scale(1); opacity: 1; }
              60% { opacity: 0.8; }
              100% { transform: rotate(180deg) scale(0); opacity: 0; }
            }

            /* 2. Vector Morphing: Ring slides up into Magnifying Lens */
            .intro-ring {
              animation: introRingMorph 700ms cubic-bezier(0.16, 1, 0.3, 1) 400ms forwards;
            }
            @keyframes introRingMorph {
              0% { transform: translateY(0); stroke-width: 3.6px; }
              100% { transform: translateY(-10px); stroke-width: 4.8px; }
            }

            /* 3. Handle pops out with spring elasticity */
            .intro-handle {
              animation: introHandlePop 550ms cubic-bezier(0.34, 1.56, 0.64, 1) 700ms forwards;
              transform-origin: 42px 47px;
              transform: scale(0);
              opacity: 0;
            }
            @keyframes introHandlePop {
              0% { transform: scale(0); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }

            /* 4. Glare arc fades in */
            .intro-glare {
              animation: introGlareFade 400ms ease 850ms forwards;
              opacity: 0;
            }
            @keyframes introGlareFade {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }

            /* 5. Laser Underline Sweep */
            .intro-scanline {
              animation: scanlineSweep 850ms cubic-bezier(0.16, 1, 0.3, 1) 750ms forwards;
              stroke-dasharray: 250;
              stroke-dashoffset: 250;
              opacity: 0.8;
            }
            @keyframes scanlineSweep {
              0% { stroke-dashoffset: 250; opacity: 0.8; }
              60% { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0.2; }
            }

            /* 6. Staggered Character Motion */
            .char-lead {
              animation: charCascade 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
              transform: translateY(12px) scale(0.9);
            }
            .char-finder {
              animation: charCascade 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
              transform: translateY(12px) scale(0.9);
            }
            @keyframes charCascade {
              0% { opacity: 0; transform: translateY(12px) scale(0.9); filter: blur(4px); }
              100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
            }

            /* 7. Radar Reticle Radar Scan Rotation */
            .intro-reticle-ring {
              animation: reticleSpin 2.5s linear infinite 1200ms;
              transform-origin: 362px 30px;
            }
            @keyframes reticleSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .intro-reticle-dot {
              animation: reticlePulse 1.2s infinite ease-in-out 1100ms;
              transform-origin: 362px 30px;
            }
            @keyframes reticlePulse {
              0% { transform: scale(0.8); opacity: 0.5; }
              50% { transform: scale(1.3); opacity: 1; }
              100% { transform: scale(0.8); opacity: 0.5; }
            }
          `}</style>

          {/* Icon Tile */}
          <g className="intro-tile" transform="translate(5, 5)">
            <rect width="80" height="80" rx="20" fill="#0A0A0A" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
            
            {/* Grey Disc Group (Pure solid circle - spins & dissolves) */}
            <g className="intro-disc-group">
              <circle cx="48" cy="32" r="16" fill="#B0B0B0" />
            </g>

            <circle className="intro-ring" cx="32" cy="42" r="16" fill="none" stroke="#FFFFFF" strokeWidth="3.6" />
            <path className="intro-glare" d="M 22 26 A 11 11 0 0 1 30 18" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line className="intro-handle" x1="42" y1="42" x2="60" y2="60" stroke="#FFFFFF" strokeWidth="5.5" strokeLinecap="round" />
          </g>

          {/* Laser Underline Accent */}
          <line
            className="intro-scanline"
            x1="105"
            y1="68"
            x2="355"
            y2="68"
            stroke="url(#scanline-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="scanline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FAFAF7" stopOpacity="0" />
              <stop offset="50%" stopColor="#FAFAF7" stopOpacity="1" />
              <stop offset="100%" stopColor="#9A9A92" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Kinetic Typography Group: Staggered Letters */}
          <g transform="translate(105, 58)">
            <text fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontSize="42" letterSpacing="-0.03em">
              {/* "Lead" - Bold White */}
              {leadLetters.map((char, index) => (
                <tspan
                  key={`lead-${index}`}
                  className="char-lead"
                  fontWeight="800"
                  fill="#FAFAF7"
                  style={{ animationDelay: `${750 + index * 55}ms` }}
                >
                  {char}
                </tspan>
              ))}

              {/* Space */}
              <tspan fill="transparent"> </tspan>

              {/* "Finder" - Light Metallic Silver */}
              {finderLetters.map((char, index) => (
                <tspan
                  key={`finder-${index}`}
                  className="char-finder"
                  fontWeight="300"
                  fill="#A1A1AA"
                  style={{ animationDelay: `${980 + index * 55}ms` }}
                >
                  {char}
                </tspan>
              ))}
            </text>
          </g>

          {/* Precision Radar Reticle Target Accent (Positioned elegantly with wide breathing room after 'r') */}
          <g transform="translate(0, 5)">
            <circle className="intro-reticle-dot" cx="362" cy="30" r="4" fill="#FAFAF7" />
            <circle className="intro-reticle-ring" cx="362" cy="30" r="10" fill="none" stroke="#FAFAF7" strokeWidth="1" strokeDasharray="3 3" />
          </g>
        </svg>
      </div>
    </div>
  );
}
