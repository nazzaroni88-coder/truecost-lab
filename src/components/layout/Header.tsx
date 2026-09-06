import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogoMark, Wordmark } from '../../brand/Logo';
import { CALCULATORS } from '../../calculators/meta';
import { IconButton } from '../ui/Button';
import { CalcIcon, IconChevron, IconClose, IconMenu } from '../ui/Icons';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const onCalcPage = location.pathname.startsWith('/calculators');

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand-link" aria-label="TrueCost Lab home">
          <LogoMark size={30} />
          <Wordmark />
        </Link>
        <nav className="site-nav desktop" aria-label="Primary">
          <div className="nav-calcs" ref={menuRef}>
            <a
              href="/calculators"
              className={onCalcPage ? 'active' : ''}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((o) => !o);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Calculators <IconChevron width={14} height={14} />
            </a>
            {menuOpen && (
              <div className="nav-menu" role="menu">
                <div className="nav-menu-title">Choose a calculator</div>
                {CALCULATORS.map((c) => (
                  <Link key={c.id} to={`/calculators/${c.slug}`} role="menuitem">
                    <CalcIcon kind={c.icon} size={28} />
                    <span>
                      <span style={{ display: 'block' }}>{c.name}</span>
                      <span className="micro muted" style={{ display: 'block', fontWeight: 400 }}>
                        {c.tagline}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/methodology" className={({ isActive }) => (isActive ? 'active' : '')}>
            Methodology
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
            About
          </NavLink>
        </nav>
        <IconButton label={mobileOpen ? 'Close menu' : 'Open menu'} className="menu-btn" variant="ghost" onClick={() => setMobileOpen((o) => !o)} icon={mobileOpen ? <IconClose /> : <IconMenu />} aria-expanded={mobileOpen} aria-controls="mobile-nav" />
      </div>
      {mobileOpen && (
        <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile">
          <div className="nav-menu-title">Calculators</div>
          {CALCULATORS.map((c) => (
            <NavLink key={c.id} to={`/calculators/${c.slug}`} className={({ isActive }) => (isActive ? 'active' : '')}>
              <CalcIcon kind={c.icon} size={26} />
              {c.name}
            </NavLink>
          ))}
          <div className="nav-menu-title" style={{ marginTop: 6 }}>
            More
          </div>
          <NavLink to="/methodology" className={({ isActive }) => (isActive ? 'active' : '')}>
            Methodology
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
            About
          </NavLink>
        </nav>
      )}
    </header>
  );
}
