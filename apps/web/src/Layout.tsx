import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { PlayIcon } from '../../../packages/shared/src/ui/icons.tsx';
import { RaisedPillLink } from '../../../packages/shared/src/ui/RaisedPill.tsx';
import { ChatProvider } from './chat/ChatLauncher.tsx';
import { NAV, ROBLOX_URL } from './site.ts';

export function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: 'instant' }); // never smooth-scroll back through the long Home page
  }, [pathname, hash]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <ChatProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      {pathname !== '/' && (
        <div className="page-banner" aria-hidden="true">
          {[[1, 14, 0], [2, 34, -30], [3, 8, -60], [1, 26, -90]].map(([n, top, delay], i) => (
            <img key={i} className="sprite cloud" src={`/art/v3/cloud-${n}.webp`} alt="" style={{ top: `${top}%`, width: 'clamp(110px, 14vw, 240px)', animationDuration: '110s', animationDelay: `${delay}s` }} />
          ))}
          <img className="banner-hills" src="/art/v3/meadow.webp" alt="" />
        </div>
      )}
      <header className={`site-header over-hero ${scrolled ? 'scrolled' : ''} ${pathname === '/' && !scrolled ? 'hide-play' : ''}`}>
        <div className="wrap header-row">
          <Link to="/" className="brand" aria-label="Sleep Pets & Chop Trees — home">
            <img src="/art/logo.png" alt="Sleep Pets & Chop Trees" width="720" height="315" />
          </Link>
          <nav aria-label="Main" className="main-nav">
            <ul className="nav-links">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.to === '/'}>{n.label}</NavLink>
                </li>
              ))}
            </ul>
            <details className="nav-menu">
              <summary aria-label="Menu">
                <span aria-hidden="true">☰</span> Menu
              </summary>
              <ul>
                {NAV.map((n) => (
                  <li key={n.to}>
                    <NavLink to={n.to} end={n.to === '/'}>{n.label}</NavLink>
                  </li>
                ))}
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
    </ChatProvider>
  );
}
