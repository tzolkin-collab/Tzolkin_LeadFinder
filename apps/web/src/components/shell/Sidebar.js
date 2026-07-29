'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LeadFinderLockup } from '../brand/TzolkinLogo.js';

/**
 * Navegação persistente do app.
 *
 * Ordem deliberada: o Feed vem primeiro porque a home do Tracer não é uma
 * busca — é o que mudou desde ontem. Tela em branco é impossível por
 * construção.
 */
const PRIMARY = [
  { href: '/feed', label: 'Feed', icon: 'bolt' },
  { href: '/tracer', label: 'Tracer', icon: 'spark' },
  { href: '/busca', label: 'Busca', icon: 'search' },
  { href: '/pipeline', label: 'Pipeline', icon: 'kanban' },
  { href: '/vigilancias', label: 'Vigilâncias', icon: 'radar' },
];

const SECONDARY = [{ href: '/settings', label: 'Ajustes', icon: 'gear' }];

function Icon({ name }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'bolt':
      return <svg {...common}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>;
    case 'spark':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case 'kanban':
      return <svg {...common}><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></svg>;
    case 'radar':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 12 18 6" /></svg>;
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>;
    default:
      return null;
  }
}

function NavItem({ item, active }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className="tracer-nav-item"
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        width: 200,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 12,
        borderRight: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
      }}
    >
      <Link
        href="/feed"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 40,
          padding: '0 4px',
          marginBottom: 12,
          textDecoration: 'none',
        }}
      >
        <LeadFinderLockup height={28} />
      </Link>

      {PRIMARY.map((item) => (
        <NavItem key={item.href} item={item} active={isActive(item.href)} />
      ))}

      <div
        style={{
          height: 1,
          background: 'var(--border-primary)',
          margin: '8px 4px',
        }}
      />

      {SECONDARY.map((item) => (
        <NavItem key={item.href} item={item} active={isActive(item.href)} />
      ))}
    </nav>
  );
}
