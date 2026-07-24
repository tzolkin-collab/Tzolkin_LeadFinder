'use client';

/**
 * Official Brand Logos
 * SVGs sourced from https://svgl.app/ (Google, Instagram, Meta, OpenAI, LinkedIn, Stripe)
 * and official brand assets (WhatsApp wordmark).
 * Stored in /public/logos/.
 */

function LogoImg({ src, alt, size, className }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain' }}
    />
  );
}

export function GooglePlacesIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/googleMaps.svg" alt="Google Maps" size={size} className={className} />;
}

export function GoogleAdsIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/google-ads-icon.svg" alt="Google Ads" size={size} className={className} />;
}

export function InstagramIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/instagram-icon.svg" alt="Instagram" size={size} className={className} />;
}

export function MetaAdsIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/meta.svg" alt="Meta Ads" size={size} className={className} />;
}

export function TikTokIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/tiktok-icon-light.svg" alt="TikTok" size={size} className={className} />;
}

export function OpenAiIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/openai.svg" alt="OpenAI" size={size} className={className} />;
}

export function WhatsAppIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/whatsapp-icon.svg" alt="WhatsApp" size={size} className={className} />;
}

export function StripeIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/stripe.svg" alt="Stripe" size={size} className={className} />;
}

export function LinkedInIcon({ size = 20, className = '' }) {
  return <LogoImg src="/logos/linkedin.svg" alt="LinkedIn" size={size} className={className} />;
}

export function CnpjIcon({ size = 20, color = 'currentColor', className = '' }) {
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
      <line x1="7" y1="12" x2="13" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="16" x2="11" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
