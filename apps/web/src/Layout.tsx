import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { PlayIcon } from '../../../packages/shared/src/ui/icons.tsx';
import { RaisedPillLink } from '../../../packages/shared/src/ui/RaisedPill.tsx';
import { NAV, ROBLOX_URL } from './guide.ts';

export function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={`site-header ${pathname === '/' ? 'over-hero' : ''}`}>
        <div className="wrap header-row">
          <Link to="/" className="brand" aria-label="Sleep Pets & Chop Trees — home">
            <img src="/art/logo.png" alt="Sleep Pets & Chop Trees" width="720" height="315" />
          </Link>
          <nav aria-label="Main" className="main-nav">
            <ul className="nav-links">
              {NAV.map((n) => (
                <li key={n.slug}>
                  <NavLink to={`/guide/${n.slug}`}>{n.label}</NavLink>
                </li>
              ))}
              <li>
                <NavLink to="/support">Support</NavLink>
              </li>
            </ul>
            <details className="nav-menu">
              <summary aria-label="Menu">
                <span aria-hidden="true">☰</span> Menu
              </summary>
              <ul>
                {NAV.map((n) => (
                  <li key={n.slug}>
                    <NavLink to={`/guide/${n.slug}`}>{n.label}</NavLink>
                  </li>
                ))}
                <li>
                  <NavLink to="/support">Support</NavLink>
                </li>
              </ul>
            </details>
          </nav>
          <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer" className="play-pill">
            <PlayIcon /> Play on Roblox
          </RaisedPillLink>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap footer-row">
          <span>Sleep Pets &amp; Chop Trees · official guide &amp; help</span>
          <span>Not affiliated with Roblox Corporation.</span>
        </div>
      </footer>
    </>
  );
}
