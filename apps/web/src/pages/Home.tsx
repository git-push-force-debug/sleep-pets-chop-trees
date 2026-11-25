import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { PlayIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { RaisedPillLink } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { ParallaxScene, Reveal, TiltCard, type Layer } from '../motion/Parallax.tsx';
import { openChat, ROBLOX_URL } from '../site.ts';

const V2 = '/art/v2';
const HERO: Layer[] = [
  { src: `${V2}/hero-1-sky.webp`, depth: 0 },
  { src: `${V2}/hero-2-mountains.webp`, depth: 0.12 },
  { src: `${V2}/hero-3-hills.webp`, depth: 0.32 },
  { src: `${V2}/hero-4-plaza.webp`, depth: 0.55 },
  { src: `${V2}/hero-5-pens.webp`, depth: 0.78 },
  { src: `${V2}/hero-6-front.webp`, depth: 1 },
];

const LOOP = [
  { slug: 'sleep', title: 'Sleep', text: 'Aim the dart gun and fill sleep progress to 100%.' },
  { slug: 'carry', title: 'Carry', text: 'Pick it up and cross the brick edge before it wakes.' },
  { slug: 'ranch', title: 'Ranch', text: 'Placed pets earn Cash. Feed them and buy stats.' },
  { slug: 'chop', title: 'Chop', text: 'Swing melee tools at trees for Wood. Golden trees pay 5×.' },
  { slug: 'rebirth', title: 'Rebirth', text: 'Spend Cash, Wood and the right pet to open the next biome.' },
];

const BIOMES = [
  { slug: 'grassland', name: 'Grassland', note: 'Start here · Deer, Fox, Boar' },
  { slug: 'savanna', name: 'Savanna', note: 'Rebirth 1 · Zebra, Cheetah, Lion' },
  { slug: 'snowland', name: 'Snowland', note: 'Rebirth 2 · Red Panda, Yeti' },
  { slug: 'desert', name: 'Desert', note: 'Rebirth 3 · Fennec Fox, Camel' },
  { slug: 'prehistoric', name: 'Prehistoric', note: 'Rebirth 4 · Triceratops, T. rex' },
  { slug: 'enchanted', name: 'Enchanted Grove', note: 'Rebirth 5 · Glimmer Deer, Wyvern' },
];

const STARTERS = ['How do I rebirth?', 'Best gun for Snowland?', 'Why did my pet wake up?'];

/** Floating sprites over the hero: drifting clouds, a gliding griffin, sleepy Z's and a falling leaf (CSS loops). */
const HeroSprites = () => (
  <>
    <img className="sprite cloud cloud-a" src={`${V2}/cloud-a.webp`} alt="" />
    <img className="sprite cloud cloud-b" src={`${V2}/cloud-b.webp`} alt="" />
    <img className="sprite griffin" src={`${V2}/hero-7-griffin.webp`} alt="" />
    <img className="sprite zzz zzz-1" src={`${V2}/zzz.webp`} alt="" />
    <img className="sprite zzz zzz-2" src={`${V2}/zzz.webp`} alt="" />
    <img className="sprite leaf leaf-1" src={`${V2}/leaf.webp`} alt="" />
    <img className="sprite leaf leaf-2" src={`${V2}/leaf.webp`} alt="" />
  </>
);

function RanchLoop() {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <ol className="loop" ref={ref}>
      <span className="loop-track" aria-hidden="true">
        <motion.span className="loop-fill" style={{ scaleX: reduced ? 1 : fill }} />
      </span>
      {LOOP.map((step, i) => (
        <Reveal as="li" key={step.slug} className="loop-step" delay={i * 0.08}>
          <img src={`${V2}/step-${step.slug}.webp`} alt="" className="loop-art" width="320" height="320" loading="lazy" />
          <span className="loop-num" aria-hidden="true">{i + 1}</span>
          <b>{step.title}</b>
          <span>{step.text}</span>
        </Reveal>
      ))}
    </ol>
  );
}

export function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <ParallaxScene layers={HERO} className="hero-scene" overlay={<HeroSprites />}>
          <div className="wrap hero-copy">
            <motion.div
              className="hero-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.15 }}
            >
              <span className="eyebrow-chip">A Roblox ranch &amp; collection game</span>
              <h1 id="hero-title">Put wild pets to sleep. Build the coziest ranch.</h1>
              <p>Dart wild animals, carry them home and let them earn Cash in your pen. Chop trees for Wood, then rebirth through six biomes.</p>
              <div className="hero-actions">
                <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer">
                  <PlayIcon /> Play on Roblox
                </RaisedPillLink>
                <RaisedPillLink href="/guide/player-guide" variant="secondary">Read the guide</RaisedPillLink>
              </div>
              <ul className="fact-chips" aria-label="Game at a glance">
                <li>6 biomes</li>
                <li>72 animals</li>
                <li>28 weapons</li>
              </ul>
            </motion.div>
          </div>
        </ParallaxScene>
      </section>

      <div className="panel-over-stage">
        <div className="wrap stack-xl">
          <section aria-labelledby="loop-title" className="stack-m">
            <Reveal className="row-between">
              <h2 id="loop-title">The ranch loop</h2>
              <Link to="/guide/player-guide#tutorial" className="text-link">First ranch, step by step →</Link>
            </Reveal>
            <RanchLoop />
          </section>

          <section aria-labelledby="biomes-title" className="stack-m">
            <Reveal><h2 id="biomes-title">Six biomes, 72 animals</h2></Reveal>
            <ul className="biomes">
              {BIOMES.map((b, i) => (
                <Reveal as="li" key={b.slug} delay={(i % 3) * 0.08}>
                  <Link to={`/guide/biomes#${b.slug}`} className="biome-link" aria-label={`${b.name} — ${b.note}`}>
                    <TiltCard
                      className={`biome-card tint-${b.slug}`}
                      inner={<img src={`${V2}/animal-${b.slug}.webp`} alt="" className="biome-animal" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
                    >
                      <img src={`/art/biome-${b.slug}.webp`} alt="" width="1200" height="800" loading="lazy" className="biome-bg" />
                      <span className="biome-label">
                        <b>{b.name}</b>
                        <span>{b.note}</span>
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
