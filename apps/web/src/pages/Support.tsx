import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { Reveal } from '../motion/Parallax.tsx';
import { openChat } from '../site.ts';

const COMMON = [
  { q: 'How do I rebirth?', to: '/guide/player-guide#rebirth' },
  { q: 'Why did my pet wake up and run?', to: '/guide/player-guide#carry' },
  { q: 'Where are the free rewards and codes?', to: '/guide/rewards' },
  { q: 'My purchase or game pass is missing', to: '/guide/faq' },
];

/** Help center: three clear ways to get help. The chat opens in the side panel only when asked. */
export function Support() {
  const reduced = useReducedMotion();
  return (
    <div className="wrap page-pad support">
      <section className="support-hero">
        <motion.img
          src="/art/v2/pip-headset.webp"
          onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')}
          alt=""
          width="220"
          height="220"
          animate={reduced ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="stack-s">
          <p className="eyebrow">Help &amp; support</p>
          <h1>How can we help?</h1>
          <p className="lede">Pip knows the whole game guide, and real people from the team are online around the clock for everything else.</p>
        </div>
      </section>

      <div className="support-cards">
        <Reveal className="support-card">
          <img src="/art/v2/pip-think.webp" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} alt="" width="96" height="96" />
          <h2>Ask Pip</h2>
          <p>Instant answers from the official guide, with tables, steps and pictures.</p>
          <button type="button" className="spct-pill" onClick={() => openChat()}>Ask a question</button>
        </Reveal>
        <Reveal className="support-card" delay={0.08}>
          <img src="/art/v2/pip-headset.webp" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} alt="" width="96" height="96" />
          <h2>Talk to a person</h2>
          <p>Purchases, bugs, lost pets or account problems. You'll get a ticket number and a reply in the same chat.</p>
          <button type="button" className="spct-pill spct-pill-green" onClick={() => openChat({ handoff: true })}>Contact the team</button>
        </Reveal>
        <Reveal className="support-card" delay={0.16}>
          <img src="/art/v2/pip-happy.webp" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} alt="" width="96" height="96" />
          <h2>Common questions</h2>
          <ul className="common-list">
            {COMMON.map((c) => (
              <li key={c.q}><Link to={c.to}>{c.q} →</Link></li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal className="safety-strip">
        <b>Stay safe:</b> the team will never ask for your password, a verification code or payment details. Free Robux offers are always scams.
      </Reveal>
    </div>
  );
}
