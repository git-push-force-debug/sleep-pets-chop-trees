import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { PlayIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { RaisedPillLink } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { Drift, ParallaxScene, Reveal, TiltCard } from '../motion/Parallax.tsx';
import { BAND_CONTENT_AT, BAND_LAYERS, HeroTransition } from './HeroScene.tsx';
import { openChat, ROBLOX_URL } from '../site.ts';

const V2 = '/art/v2';

const LOOP = [
  { slug: 'sleep', title: 'Sleep', text: 'Aim the dart gun and fill sleep progress to 100%.' },
  { slug: 'carry', title: 'Carry', text: 'Pick it up and cross the brick edge before it wakes.' },
  { slug: 'ranch', title: 'Ranch', text: 'Placed pets earn Cash. Feed them and buy stats.' },
  { slug: 'chop', title: 'Chop', text: 'Swing melee tools at trees for Wood. Golden trees pay 5×.' },
  { slug: 'rebirth', title: 'Rebirth', text: 'Spend Cash, Wood and the right pet to open the next biome.' },
];

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

const STARTERS = ['How do I rebirth?', 'Best gun for Snowland?', 'Why did my pet wake up?'];

// Panel i fades up over its slice of the pinned scroll: Sleep is already in when the pin starts, Rebirth lands at 0.82.
function LoopStep({ step, i, p, reduced }: { step: (typeof LOOP)[number]; i: number; p: MotionValue<number>; reduced: boolean }) {
  const start = Math.max(0, (i - 0.5) / LOOP.length); // scroll offsets must stay in 0…1
  const still = reduced || i === 0; // Sleep is visible from the start
  const opacity = useTransform(p, [start, start + 0.12], still ? [1, 1] : [0, 1]);
  const y = useTransform(p, [start, start + 0.12], still ? [0, 0] : [48, 0]);
  return (
    <motion.li className="loop-step" style={{ opacity, y }}>
      <img src={`/art/v3/step-${step.slug}.webp`} onError={(e) => ((e.target as HTMLImageElement).src = `${V2}/step-${step.slug}.webp`)} alt="" className="loop-art" width="320" height="320" loading="lazy" />
      <span className="loop-num" aria-hidden="true">{i + 1}</span>
      <b>{step.title}</b>
      <span>{step.text}</span>
    </motion.li>
  );
}

/** Scroll stop: the section pins and each scroll step reveals the next panel of the loop. */
function RanchLoop() {
  const ref = useRef<HTMLElement>(null);
  const reduced = !!useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const fill = useTransform(p, [0, 0.82], [0, 1]);
  return (
    <section ref={ref} aria-labelledby="loop-title" className="loop-scroll">
      <div className="loop-pin">
        <Reveal className="row-between">
          <h2 id="loop-title">The ranch loop</h2>
          <Link to="/guide/player-guide#tutorial" className="text-link">First ranch, step by step →</Link>
        </Reveal>
        <ol className="loop">
          <span className="loop-track" aria-hidden="true">
            <motion.span className="loop-fill" style={{ scaleX: reduced ? 1 : fill }} />
          </span>
          {LOOP.map((step, i) => <LoopStep key={step.slug} step={step} i={i} p={p} reduced={reduced} />)}
        </ol>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <HeroTransition
          hero={
            <div className="wrap hero-text">
              <h1 id="hero-title">Put wild pets to sleep. Build the coziest ranch.</h1>
              <p>Dart wild animals, carry them home and let them earn Cash in your pen. Chop trees for Wood, then rebirth through six biomes.</p>
              <div className="hero-actions">
                <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer">
                  <PlayIcon /> Play on Roblox
                </RaisedPillLink>
                <RaisedPillLink href="/guide/player-guide" variant="secondary">Read the guide</RaisedPillLink>
              </div>
            </div>
          }
          next={
            <>
                <h2 id="video-title">A cozy ranch that grows with you</h2>
                <p>Sneak up on wild animals, dart them to sleep and carry them home before they wake. Every pet you place earns Cash while you chop, upgrade and explore.</p>
                <div className="hero-actions">
                  <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer"><PlayIcon /> Play now</RaisedPillLink>
                  <Link to="/guide/player-guide#tutorial" className="text-link">First ranch, step by step →</Link>
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
                    <b>Gameplay video coming soon</b>
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
            <h2 id="biomes-title">Six biomes to explore</h2>
            <p>From sunny grassland to the glowing Enchanted Grove — every rebirth opens a new world.</p>
          </div>
        </ParallaxScene>
      </section>

      <div className="after-band">
        <div className="wrap stack-xl">
          <section aria-label="Biomes" className="stack-m">
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
              <h2 id="ask-title">Stuck? Ask Pip.</h2>
              <p>Pip answers from the official game guide — with tables, pictures and steps. If Pip can't find it, a real person from the team joins the same chat.</p>
              <div className="chip-row">
                {STARTERS.map((q) => (
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
