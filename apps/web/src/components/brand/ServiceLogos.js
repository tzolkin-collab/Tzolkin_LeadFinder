'use client';

/**
 * SVGL-inspired Official Microservice & Tool SVG Logos
 * Source: svgl.app (Open Source SVG Logo Library)
 */

export function GooglePlacesIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function InstagramIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2c3.257 0 3.667.014 4.947.072 4.358.2 6.78 2.618 6.98 6.98.059 1.281.073 1.689.073 4.948 0 3.259-.014 3.668-.072 4.948-.2 4.358-2.618 6.78-6.98 6.98-1.281.058-1.689.072-4.948.072-3.259 0-3.667-.014-4.947-.072-4.354-.2-6.782-2.618-6.979-6.98-.059-1.28-.073-1.689-.073-4.948 0-3.259.014-3.667.072-4.947.196-4.354 2.617-6.78 6.979-6.98 1.281-.059 1.69-.073 4.949-.073zm0 2.163c-3.203 0-3.583.012-4.849.07-3.252.148-4.771 1.691-4.919 4.919-.058 1.265-.069 1.645-.069 4.849 0 3.205.012 3.584.069 4.849.149 3.225 1.664 4.771 4.919 4.919 1.266.058 1.644.07 4.85.07 3.204 0 3.584-.012 4.849-.07 3.26-.149 4.771-1.699 4.919-4.92.058-1.265.07-1.644.07-4.849 0-3.204-.013-3.583-.07-4.849-.149-3.227-1.664-4.771-4.919-4.919-1.266-.057-1.645-.069-4.849-.069zm0 2.703c2.798 0 5.067 2.269 5.067 5.067 0 2.798-2.269 5.067-5.067 5.067-2.798 0-5.067-2.269-5.067-5.067 0-2.798 2.269-5.067 5.067-5.067zm0 2.163c-1.604 0-2.904 1.3-2.904 2.904 0 1.603 1.3 2.903 2.904 2.903 1.603 0 2.903-1.3 2.903-2.903 0-1.604-1.3-2.904-2.903-2.904zm6.452-4.041c.654 0 1.184.53 1.184 1.184 0 .654-.53 1.184-1.184 1.184-.655 0-1.184-.53-1.184-1.184 0-.654.529-1.184 1.184-1.184z"
        fill="url(#instagram-gradient)"
      />
      <defs>
        <radialGradient
          id="instagram-gradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(24 0 0 24 2 22)"
        >
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function MetaAdsIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16.71 4.5c-1.63 0-3.1.8-4.71 2.45-1.61-1.65-3.08-2.45-4.71-2.45C4.24 4.5 2 6.87 2 9.9c0 4.19 3.99 7.78 9.5 10.38.31.15.69.15 1 0 5.51-2.6 9.5-6.19 9.5-10.38 0-3.03-2.24-5.4-5.29-5.4z"
        fill="url(#meta-gradient)"
      />
      <defs>
        <linearGradient id="meta-gradient" x1="2" y1="4.5" x2="22" y2="20.28">
          <stop offset="0%" stopColor="#0081FB" />
          <stop offset="100%" stopColor="#0064E0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function OpenAiIcon({ size = 20, color = '#FAFAF7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6 6 0 0 0-6.42-2.92 6 6 0 0 0-4.66-2.12 6.07 6.07 0 0 0-5.83 4.25A5.98 5.98 0 0 0 1.2 7.04a6 6 0 0 0 .86 7.13 5.98 5.98 0 0 0 .53 4.91 6 6 0 0 0 6.42 2.92 6.06 6.06 0 0 0 4.66 2.12c2.47 0 4.67-1.48 5.61-3.75a5.98 5.98 0 0 0 3.65-2.91 6 6 0 0 0-.65-7.66zm-9.33 12.18a4.27 4.27 0 0 1-2.45-.76l.15-.09 4.14-2.39a.86.86 0 0 0 .43-.74v-5.84l1.75 1.01a.08.08 0 0 1 .04.06v4.83a4.29 4.29 0 0 1-4.06 3.92zM3.82 17.51a4.27 4.27 0 0 1-.57-2.5c.08.06.18.12.27.17l4.14 2.39a.86.86 0 0 0 .86 0l5.06-2.92v2.02a.08.08 0 0 1-.04.07l-4.18 2.41a4.29 4.29 0 0 1-5.54-1.64zm-1.5-8.73a4.27 4.27 0 0 1 1.88-1.74v.18l.01 4.78a.86.86 0 0 0 .43.74l5.06 2.92-1.75 1.01a.08.08 0 0 1-.08 0l-4.18-2.41a4.29 4.29 0 0 1-1.37-5.48zm10.9-4.88v4.78c0 .3.16.58.43.74l5.06 2.92v-2.02a.08.08 0 0 1 .04-.07l4.18-2.41a4.29 4.29 0 0 1-3.66-7.85 4.27 4.27 0 0 1-2.46.76l-.15.09-3.44 1.99a.86.86 0 0 0-.43.74zm7.06 7.6a4.27 4.27 0 0 1 .57 2.5l-.27-.16-4.14-2.39a.86.86 0 0 0-.86 0l-5.06 2.92v-2.02a.08.08 0 0 1 .04-.07l4.18-2.41a4.29 4.29 0 0 1 5.54 1.63z"
        fill={color}
      />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12c0 2.17.69 4.19 1.87 5.84L2.5 21.5l3.8-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.41 14.16c-.23.64-1.33 1.25-1.85 1.29-.49.04-1.12.18-3.67-.84-3.26-1.31-5.32-4.62-5.48-4.83-.16-.22-1.33-1.77-1.33-3.37 0-1.6.84-2.39 1.14-2.71.3-.32.65-.4.87-.4.22 0 .43.01.62.01.2 0 .46-.07.72.55.26.63.89 2.17.97 2.33.08.16.13.35.02.57-.11.22-.16.35-.32.55-.16.2-.34.44-.48.59-.16.16-.33.34-.14.66.19.32.84 1.38 1.8 2.23 1.23 1.1 2.27 1.44 2.59 1.6.32.16.51.14.7-.08.19-.22.81-.95 1.03-1.27.22-.32.44-.27.73-.16.3.11 1.89.89 2.21 1.05.32.16.54.24.62.38.08.14.08.82-.15 1.46z"
        fill="#25D366"
      />
    </svg>
  );
}

export function StripeIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13.98 11.28c0-.62-.51-.9-1.36-.9-.98 0-2.22.34-3.23.94V7.49c1.17-.48 2.45-.71 3.73-.69 3.08 0 5.16 1.54 5.16 4.39 0 4.29-5.91 4.51-5.91 6.84 0 .73.64 1 1.57 1 1.16 0 2.6-.47 3.65-1.12v3.89c-1.28.53-2.66.79-4.04.77-3.23 0-5.46-1.57-5.46-4.47.01-4.47 5.89-4.66 5.89-6.82z"
        fill="#635BFF"
      />
    </svg>
  );
}

export function CnpjIcon({ size = 20, color = '#FAFAF7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
      <line x1="7" y1="8" x2="17" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="12" x2="13" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="16" x2="11" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function LinkedInIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.49 1.49 0 1 0 0 2.98 1.49 1.49 0 0 0 0-2.98z"
        fill="#0A66C2"
      />
    </svg>
  );
}
