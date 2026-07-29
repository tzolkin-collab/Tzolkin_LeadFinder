'use client';

/**
 * Reusable TracerBorderCard component
 * Features dynamic module strokeColor matching (#FFD400 gold, #A855F7 purple, #00E5FF blue, #25D366 green)
 * with an elegant cubic-bezier border line trace and traveling tracer beam.
 */
export function TracerBorderCard({ active, onClick, children, width = 160, height = 230, strokeColor = '#FFD400' }) {
  const perimeter = 2 * (width + height);

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        borderRadius: 18,
        position: 'relative',
        cursor: 'pointer',
        background: active ? 'rgba(24, 24, 28, 0.95)' : 'rgba(18, 18, 22, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transform: active ? 'scale(1.06) translateY(-4px)' : 'scale(0.96)',
        opacity: active ? 1 : 0.65,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, background 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 16px',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .tracer-flow-beam-${strokeColor.replace('#', '')} {
          stroke-dasharray: 90 ${perimeter - 90};
          animation: tracerBeamFlow 3.6s linear infinite;
        }
        @keyframes tracerBeamFlow {
          from { stroke-dashoffset: ${perimeter}; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* SVG Kinetic Border Tracer Overlay */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        {/* Base Static Border Line */}
        <rect
          x="1.5"
          y="1.5"
          width={width - 3}
          height={height - 3}
          rx={16.5}
          fill="none"
          stroke={active ? strokeColor : 'rgba(255, 255, 255, 0.08)'}
          strokeWidth="1.5"
          strokeOpacity={active ? 0.35 : 1}
        />

        {/* Full Border Line Entry Trace */}
        <rect
          x="1.5"
          y="1.5"
          width={width - 3}
          height={height - 3}
          rx={16.5}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeDasharray={perimeter}
          strokeDashoffset={active ? 0 : perimeter}
          strokeOpacity={0.6}
          style={{
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Continuous Traveling Module Color Tracer Beam */}
        {active && (
          <rect
            x="1.5"
            y="1.5"
            width={width - 3}
            height={height - 3}
            rx={16.5}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            className={`tracer-flow-beam-${strokeColor.replace('#', '')}`}
          />
        )}
      </svg>

      {children}
    </div>
  );
}
