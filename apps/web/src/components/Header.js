'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LeadFinderLockup } from './brand/TzolkinLogo.js';
import { MenuIcon, CloseIcon, SearchIcon } from './brand/UIIcons.js';

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
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <LeadFinderLockup height={36} />
        </Link>

        {/* Desktop Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
          <Link
            href="/dashboards"
            className={`tzolkin-nav-link ${pathname === '/dashboards' ? 'active' : ''}`}
          >
            Dashboards
          </Link>
          <Link
            href="/dashboard"
            className={`tzolkin-nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
          >
            Prospecção
          </Link>
          <Link
            href="/niche-research"
            className={`tzolkin-nav-link ${pathname === '/niche-research' ? 'active' : ''}`}
          >
            Pesquisa de Nicho
          </Link>
          <Link
            href="/integrations"
            className={`tzolkin-nav-link ${pathname === '/integrations' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Integrações</span>
            <span style={{
              fontSize: 8,
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: 100,
              background: 'rgba(250, 250, 247, 0.12)',
              color: 'var(--tzolkin-offwhite)',
              border: '1px solid rgba(250, 250, 247, 0.25)',
              letterSpacing: '0.04em',
              lineHeight: 1,
              textTransform: 'lowercase',
            }}>
              em breve
            </span>
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
            href="/dashboard"
            onClick={() => {
              setMobileMenu(false);
              if (pathname === '/dashboard' && onTabChange) onTabChange('prospecting');
            }}
            className={`tzolkin-nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
            style={{ fontSize: 14, padding: '12px 16px' }}
          >
            Dashboards
          </Link>
          <Link
            href="/dashboard?tab=prospecting"
            onClick={() => {
              setMobileMenu(false);
              if (pathname === '/dashboard' && onTabChange) onTabChange('prospecting');
            }}
            className={`tzolkin-nav-link ${pathname === '/dashboard' && activeTab === 'prospecting' ? 'active' : ''}`}
            style={{ fontSize: 14, padding: '12px 16px' }}
          >
            Prospecção
          </Link>
          <Link
            href="/niche-research"
            onClick={() => setMobileMenu(false)}
            className={`tzolkin-nav-link ${pathname === '/niche-research' ? 'active' : ''}`}
            style={{ fontSize: 14, padding: '12px 16px' }}
          >
            Pesquisa de Nicho
          </Link>
          <Link
            href="/integrations"
            onClick={() => setMobileMenu(false)}
            className={`tzolkin-nav-link ${pathname === '/integrations' ? 'active' : ''}`}
            style={{ fontSize: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Integrações</span>
            <span style={{
              fontSize: 9,
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 100,
              background: 'rgba(250, 250, 247, 0.12)',
              color: 'var(--tzolkin-offwhite)',
              border: '1px solid rgba(250, 250, 247, 0.25)',
              letterSpacing: '0.04em',
              textTransform: 'lowercase',
            }}>
              em breve
            </span>
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

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.desktop-nav), :global(.desktop-btn) {
            display: none !important;
          }
          :global(.mobile-toggle) {
            display: inline-flex !important;
          }
        }
        @media (min-width: 769px) {
          :global(.mobile-toggle), :global(.mobile-drawer) {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
