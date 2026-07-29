'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LeadFinderLockup } from '../brand/TzolkinLogo.js';
import { MenuIcon, CloseIcon, SearchIcon } from '../brand/UIIcons.js';

export function Header({ onOpenSearch, activeTab, onTabChange }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
    router.push('/');
  }

  return (
    <header
      className={`tzolkin-header ${scrolled ? 'scrolled' : ''}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: scrolled ? 'rgba(10, 10, 10, 0.95)' : 'rgba(10, 10, 10, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid rgba(250, 250, 247, 0.2)' : '1px solid rgba(250, 250, 247, 0.1)',
        boxShadow: scrolled ? '0 10px 30px rgba(0, 0, 0, 0.8)' : 'none',
        transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="container" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Brand Drawn SVG Lockup (No text "TZOLKIN") */}
        <Link href="/feed" style={{ textDecoration: 'none' }}>
          <LeadFinderLockup height={36} />
        </Link>

        {/* Navegação legada — vive só no dossiê e nas configurações, que ainda
            não migraram para o AppShell. As rotas antigas (dashboard,
            dashboards, niche-research, integrations) foram removidas. */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
          <Link
            href="/feed"
            className={`tzolkin-nav-link ${pathname === '/feed' ? 'active' : ''}`}
          >
            Feed
          </Link>
          <Link
            href="/settings"
            className={`tzolkin-nav-link ${pathname === '/settings' ? 'active' : ''}`}
          >
            Configurações
          </Link>
        </nav>

        {/* Action Controls & Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="btn btn-primary btn-sm desktop-btn"
            >
              <SearchIcon size={14} color="#0A0A0A" />
              + Nova Busca
            </button>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm desktop-btn"
            style={{ color: 'var(--text-secondary)' }}
            title="Sair do sistema"
          >
            Sair
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="btn btn-ghost btn-sm mobile-toggle"
            aria-label="Toggle menu"
            style={{ padding: 8, color: 'var(--tzolkin-offwhite)' }}
          >
            {mobileMenu ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay Navigation */}
      {mobileMenu && (
        <div
          style={{
            background: 'rgba(10, 10, 10, 0.98)',
            borderBottom: '1px solid var(--border-secondary)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'fadeIn 0.2s ease',
          }}
          className="mobile-drawer"
        >
          <Link
            href="/feed"
            onClick={() => setMobileMenu(false)}
            className={`tzolkin-nav-link ${pathname === '/feed' ? 'active' : ''}`}
            style={{ fontSize: 14, padding: '12px 16px' }}
          >
            Feed
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileMenu(false)}
            className={`tzolkin-nav-link ${pathname === '/settings' ? 'active' : ''}`}
            style={{ fontSize: 14, padding: '12px 16px' }}
          >
            Configurações
          </Link>

          {onOpenSearch && (
            <button
              onClick={() => { onOpenSearch(); setMobileMenu(false); }}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              <SearchIcon size={16} color="#0A0A0A" />
              + Nova Busca em Lote
            </button>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 4 }}
          >
            Sair da Sessão
          </button>
        </div>
      )}

    </header>
  );
}
