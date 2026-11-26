import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { Reveal } from '../motion/Parallax.tsx';
import { useLang } from '../i18n.tsx';
import { openChat } from '../site.ts';

// Same order as t.common.
const COMMON_LINKS = ['/guide/player-guide#rebirth', '/guide/player-guide#carry', '/guide/rewards', '/guide/faq'];

/** Help center: three clear ways to get help. The chat opens in the side panel only when asked. */
export function Support() {
  const reduced = useReducedMotion();
  const { t } = useLang();
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
          <p className="eyebrow">{t.supportEyebrow}</p>
          <h1>{t.supportTitle}</h1>
          <p className="lede">{t.supportLede}</p>
        </div>
      </section>

      <div className="support-cards">
        <Reveal className="support-card">
          <img src="/art/v2/pip-think.webp" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} alt="" width="96" height="96" />
          <h2>{t.askPipTitle}</h2>
          <p>{t.askPipText}</p>
          <button type="button" className="spct-pill" onClick={() => openChat()}>{t.askQuestion}</button>
        </Reveal>
        <Reveal className="support-card" delay={0.08}>
          <img src="/art/v2/pip-headset.webp" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} alt="" width="96" height="96" />
          <h2>{t.personTitle}</h2>
          <p>{t.personText}</p>
          <button type="button" className="spct-pill spct-pill-green" onClick={() => openChat({ handoff: true })}>{t.contactTeam}</button>
        </Reveal>
        <Reveal className="support-card" delay={0.16}>
          <img src="/art/v2/pip-happy.webp" onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')} alt="" width="96" height="96" />
          <h2>{t.commonTitle}</h2>
          <ul className="common-list">
            {t.common.map((q, i) => (
              <li key={q}><Link to={COMMON_LINKS[i]!}>{q} →</Link></li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal className="safety-strip">
        <b>{t.safetyLead}</b> {t.safetyText}
      </Reveal>
    </div>
  );
}
