import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { PlayIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { RaisedPillLink } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { Drift, ParallaxScene, Reveal, TiltCard } from '../motion/Parallax.tsx';
import { BAND_CONTENT_AT, BAND_LAYERS, HeroTransition } from './HeroScene.tsx';
import { useLang } from '../i18n.tsx';
import { openChat, ROBLOX_URL } from '../site.ts';

const V2 = '/art/v2';

const LOOP = ['sleep', 'carry', 'ranch', 'chop', 'rebirth'] as const;

const BIOMES = [
  { slug: 'grassland', name: 'Grassland' },
  { slug: 'savanna', name: 'Savanna' },
  { slug: 'snowland', name: 'Snowland' },
  { slug: 'desert', name: 'Desert' },
  { slug: 'prehistoric', name: 'Prehistoric' },
  { slug: 'enchanted', name: 'Enchanted Grove' },
];

// Set this to the trailer file (e.g. '/video/trailer.mp4') when it is ready; until then the frame shows a placeholder.
const VIDEO_SRC = '';


// Panel i fades up over its slice of the pinned scroll: Sleep is already in when the pin starts, Rebirth lands at 0.82.
function LoopStep({ step, i, p, reduced }: { step: (typeof LOOP)[number]; i: number; p: MotionValue<number>; reduced: boolean }) {
  const { title, text } = useLang().t.loop[step];
  const start = Math.max(0, (i - 0.5) / LOOP.length); // scroll offsets must stay in 0…1
  const still = reduced || i === 0; // Sleep is visible from the start
  const opacity = useTransform(p, [start, start + 0.12], still ? [1, 1] : [0, 1]);
  const y = useTransform(p, [start, start + 0.12], still ? [0, 0] : [48, 0]);
  return (
    <motion.li className="loop-step" style={{ opacity, y }}>
      <img src={`/art/v3/step-${step}.webp`} onError={(e) => ((e.target as HTMLImageElement).src = `${V2}/step-${step}.webp`)} alt="" className="loop-art" width="320" height="320" loading="lazy" />
      <span className="loop-num" aria-hidden="true">{i + 1}</span>
      <b>{title}</b>
      <span>{text}</span>
    </motion.li>
  );
}

/** Scroll stop: the section pins and each scroll step reveals the next panel of the loop. */
function RanchLoop() {
  const ref = useRef<HTMLElement>(null);
  const reduced = !!useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const fill = useTransform(p, [0, 0.82], [0, 1]);
  const { t } = useLang();
  return (
    <section ref={ref} aria-labelledby="loop-title" className="loop-scroll">
      <div className="loop-pin">
        <Reveal className="row-between">
          <h2 id="loop-title">{t.loopTitle}</h2>
          <Link to="/guide/player-guide#tutorial" className="text-link">{t.firstRanch}</Link>
        </Reveal>
        <ol className="loop">
          <span className="loop-track" aria-hidden="true">
            <motion.span className="loop-fill" style={{ scaleX: reduced ? 1 : fill }} />
          </span>
          {LOOP.map((step, i) => <LoopStep key={step} step={step} i={i} p={p} reduced={reduced} />)}
        </ol>
      </div>
    </section>
  );
}

export function Home() {
  const { t } = useLang();
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <HeroTransition
          hero={
            <div className="wrap hero-text">
              <h1 id="hero-title">{t.heroTitle}</h1>
              <p>{t.heroText}</p>
              <div className="hero-actions">
                <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer">
                  <PlayIcon /> {t.playOnRoblox}
                </RaisedPillLink>
                <RaisedPillLink href="/guide/player-guide" variant="secondary">{t.readGuide}</RaisedPillLink>
              </div>
            </div>
          }
          next={
            <>
                <h2 id="video-title">{t.videoTitle}</h2>
                <p>{t.videoText}</p>
                <div className="hero-actions">
                  <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer"><PlayIcon /> {t.playNow}</RaisedPillLink>
                  <Link to="/guide/player-guide#tutorial" className="text-link">{t.firstRanch}</Link>
                </div>
            </>
          }
          video={
              <div className="video-frame" role="region" aria-labelledby="video-title">
                {VIDEO_SRC ? (
                  <video src={VIDEO_SRC} controls playsInline preload="metadata" />
                ) : (
                  <div className="video-soon">
                    <span className="video-play" aria-hidden="true"><PlayIcon /></span>
                    <b>{t.videoSoon}</b>
                  </div>
                )}
              </div>
          }
        />
      </section>

      <div className="panel-over-stage">
        <div className="wrap stack-xl">
          <RanchLoop />
        </div>
      </div>

      <section className="band" aria-labelledby="biomes-title">
        <ParallaxScene band layers={BAND_LAYERS} contentAt={BAND_CONTENT_AT} contentDepth={0.5} className="band-scene">
          <div className="wrap band-copy">
            <h2 id="biomes-title">{t.biomesTitle}</h2>
            <p>{t.biomesText}</p>
          </div>
        </ParallaxScene>
      </section>

      <div className="after-band">
        <div className="wrap stack-xl">
          <section aria-label={t.biomesLabel} className="stack-m">
            <ul className="biomes">
              {BIOMES.map((b, i) => (
                <Reveal as="li" key={b.slug} delay={(i % 3) * 0.08}>
                  <Link to={`/guide/biomes#${b.slug}`} className="biome-link" aria-label={b.name}>
                    <TiltCard className={`biome-card tint-${b.slug}`}>
                      <Drift range={22} className="biome-bg"><img src={`/art/biome-${b.slug}.webp`} alt="" width="1200" height="800" loading="lazy" /></Drift>
                      <span className="biome-label">
                        <b>{b.name}</b>
                      </span>
                    </TiltCard>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </section>

          <Reveal as="section" className="ask-pip">
            <motion.img
              src={`${V2}/pip-wave.webp`}
              onError={(e) => ((e.target as HTMLImageElement).src = '/art/mascot.png')}
              alt=""
              width="384"
              height="384"
              className="ask-mascot"
              loading="lazy"
              whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.6 } }}
            />
            <div className="stack-s">
              <h2 id="ask-title">{t.askTitle}</h2>
              <p>{t.askText}</p>
              <div className="chip-row">
                {t.starters.map((q) => (
                  <button key={q} type="button" className="spct-chip" onClick={() => openChat({ question: q })}>{q}</button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
