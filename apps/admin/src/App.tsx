import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router';
import { RaisedPill } from '../../../packages/shared/src/ui/RaisedPill.tsx';
import type { AdminAuth } from './auth.ts';
import { Analytics } from './pages/Analytics.tsx';
import { PageIn, ToastProvider } from './motion.tsx';
import { Inbox } from './pages/Inbox.tsx';
import { Knowledge } from './pages/Knowledge.tsx';
import { Leads } from './pages/Leads.tsx';
import { Settings } from './pages/Settings.tsx';
import { Team } from './pages/Team.tsx';
import { LangSwitch, useLang } from './i18n.tsx';

export { chatwootUrl } from './links.ts';

function SignIn({ auth, refused }: { auth: AdminAuth; refused?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useLang();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(await auth.signIn(email, password));
  };
  return (
    <main className="signin">
      <form onSubmit={submit} className="signin-card">
        <img src="/art/mascot.png" alt="" width="96" height="96" />
        <LangSwitch className="signin-lang" />
        <h1>{t.signInTitle}</h1>
        {refused && <p className="alert" role="alert">{t.notOnTeam}</p>}
        {error && <p className="alert" role="alert">{error}</p>}
        <label>{t.email}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label>{t.password}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <RaisedPill type="submit">{t.signIn}</RaisedPill>
      </form>
    </main>
  );
}

export function AdminRoutes({ auth }: { auth: AdminAuth }) {
  const { pathname } = useLocation();
  const { t } = useLang();
  useEffect(() => {
    document.title = t.docTitle;
  }, [t]);
  if (auth.status === 'loading') return <p className="loading">{t.loading}</p>;
  if (auth.status !== 'ready' || !auth.agent) return <SignIn auth={auth} refused={auth.status === 'notAgent'} />;
  const admin = auth.agent.role === 'admin';
  return (
    <ToastProvider>
    <div className="shell">
      <nav className="rail" aria-label={t.navLabel}>
        <b className="rail-brand">{t.brand}</b>
        <NavLink to="/" end>{t.nav.inbox}</NavLink>
        <NavLink to="/leads">{t.nav.leads}</NavLink>
        <NavLink to="/knowledge">{t.nav.knowledge}</NavLink>
        <NavLink to="/analytics">{t.nav.analytics}</NavLink>
        {admin && <NavLink to="/team">{t.nav.team}</NavLink>}
        {admin && <NavLink to="/settings">{t.nav.settings}</NavLink>}
        <div className="rail-foot">
          <LangSwitch className="rail-lang" />
          <span>{auth.agent.display_name} · {t.role[auth.agent.role]}</span>
          <button type="button" className="link-btn" onClick={() => void auth.signOut()}>{t.signOut}</button>
        </div>
      </nav>
      <main className="workspace">
        <PageIn id={pathname}>
        <Routes>
          <Route index element={<Inbox agent={auth.agent} />} />
          <Route path="leads" element={<Leads />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="analytics" element={<Analytics />} />
          {admin && <Route path="team" element={<Team me={auth.agent.user_id} />} />}
          {admin && <Route path="settings" element={<Settings />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PageIn>
      </main>
    </div>
    </ToastProvider>
  );
}
