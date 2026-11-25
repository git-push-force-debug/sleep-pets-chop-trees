import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router';
import { RaisedPill } from '../../../packages/shared/src/ui/RaisedPill.tsx';
import type { AdminAuth } from './auth.ts';
import { Analytics } from './pages/Analytics.tsx';
import { Inbox } from './pages/Inbox.tsx';
import { Knowledge } from './pages/Knowledge.tsx';
import { Leads } from './pages/Leads.tsx';
import { Settings } from './pages/Settings.tsx';
import { Team } from './pages/Team.tsx';

export { chatwootUrl } from './links.ts';

function SignIn({ auth, refused }: { auth: AdminAuth; refused?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(await auth.signIn(email, password));
  };
  return (
    <main className="signin">
      <form onSubmit={submit} className="signin-card">
        <img src="/art/mascot.png" alt="" width="96" height="96" />
        <h1>Sign in to Pip Support</h1>
        {refused && <p className="alert" role="alert">This account isn't on the support team.</p>}
        {error && <p className="alert" role="alert">{error}</p>}
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <RaisedPill type="submit">Sign in</RaisedPill>
      </form>
    </main>
  );
}

export function AdminRoutes({ auth }: { auth: AdminAuth }) {
  if (auth.status === 'loading') return <p className="loading">Loading…</p>;
  if (auth.status !== 'ready' || !auth.agent) return <SignIn auth={auth} refused={auth.status === 'notAgent'} />;
  const admin = auth.agent.role === 'admin';
  return (
    <div className="shell">
      <nav className="rail" aria-label="Admin">
        <b className="rail-brand">Pip Support</b>
        <NavLink to="/" end>Inbox</NavLink>
        <NavLink to="/leads">Leads</NavLink>
        <NavLink to="/knowledge">Knowledge</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
        {admin && <NavLink to="/team">Team</NavLink>}
        {admin && <NavLink to="/settings">Settings</NavLink>}
        <div className="rail-foot">
          <span>{auth.agent.display_name} · {auth.agent.role}</span>
          <button type="button" className="link-btn" onClick={() => void auth.signOut()}>Sign out</button>
        </div>
      </nav>
      <main className="workspace">
        <Routes>
          <Route index element={<Inbox agent={auth.agent} />} />
          <Route path="leads" element={<Leads />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="analytics" element={<Analytics />} />
          {admin && <Route path="team" element={<Team me={auth.agent.user_id} />} />}
          {admin && <Route path="settings" element={<Settings />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
