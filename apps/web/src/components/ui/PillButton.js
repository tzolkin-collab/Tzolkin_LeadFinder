'use client';

/**
 * Reusable PillButton component for standardized Tzolkin UI buttons.
 * Uses .btn-pill / .btn-pill-ghost CSS classes from globals.css —
 * hover effect is handled via CSS :hover, not JS event handlers.
 */
export function PillButton({ children, onClick, variant = 'primary' }) {
  const className = variant === 'primary' ? 'btn-pill' : 'btn-pill-ghost';

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}
