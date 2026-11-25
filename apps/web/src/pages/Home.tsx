import { Link } from 'react-router';
import { PlayIcon } from '../../../../packages/shared/src/ui/icons.tsx';
import { RaisedPillLink } from '../../../../packages/shared/src/ui/RaisedPill.tsx';
import { openChat, ROBLOX_URL } from '../site.ts';

const LOOP = [
  { n: 1, title: 'Sleep', text: 'Aim the dart gun and fill sleep progress to 100%.', color: 'var(--sky)' },
  { n: 2, title: 'Carry', text: 'Pick it up and cross the brick edge before it wakes.', color: 'var(--brick)' },
  { n: 3, title: 'Ranch', text: 'Placed pets earn Cash. Feed them and buy stats.', color: 'var(--meadow)' },
  { n: 4, title: 'Chop', text: 'Swing melee tools at trees for Wood. Golden trees pay 5×.', color: 'var(--wood)' },
  { n: 5, title: 'Rebirth', text: 'Spend Cash, Wood and the right pet to open the next biome.', color: 'var(--accent-deep)' },
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

export function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-art" src="/art/hero.webp" alt="" width="2400" height="1100" fetchPriority="high" />
        <div className="wrap hero-copy">
          <span className="eyebrow-chip">A Roblox ranch &amp; collection game</span>
          <h1 id="hero-title">Put wild pets to sleep. Build the coziest ranch.</h1>
          <p>
            Dart wild animals, carry them across the brick edge, and let them earn Cash in your pen. Chop trees for Wood, then rebirth through
            six biomes.
          </p>
          <div className="hero-actions">
            <RaisedPillLink href={ROBLOX_URL} target="_blank" rel="noopener noreferrer">
              <PlayIcon /> Play on Roblox
            </RaisedPillLink>
            <RaisedPillLink href="/guide/player-guide" variant="secondary">
              Read the guide
            </RaisedPillLink>
          </div>
          <ul className="fact-chips" aria-label="Game at a glance">
            <li>6 biomes</li>
            <li>72 animals</li>
            <li>28 weapons</li>
          </ul>
        </div>
      </section>

      <div className="panel-over-stage">
        <div className="wrap stack-xl">
          <section aria-labelledby="loop-title" className="stack-m">
            <div className="row-between">
              <h2 id="loop-title">The ranch loop</h2>
              <Link to="/guide/player-guide#tutorial" className="text-link">First ranch, step by step →</Link>
            </div>
            <ol className="loop">
              {LOOP.map((step) => (
                <li key={step.n} className="loop-step">
                  <span className="loop-node" style={{ background: step.color }} aria-hidden="true">{step.n}</span>
                  <b>{step.title}</b>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="biomes-title" className="stack-m">
            <h2 id="biomes-title">Six biomes, 72 animals</h2>
            <ul className="biomes">
              {BIOMES.map((b) => (
                <li key={b.slug}>
                  <Link to={`/guide/biomes#${b.slug}`} className="biome-card">
                    <img src={`/art/biome-${b.slug}.webp`} alt="" width="1200" height="800" loading="lazy" />
                    <span className="biome-label">
                      <b>{b.name}</b>
                      <span>{b.note}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="ask-title" className="ask-pip">
            <img src="/art/mascot.png" alt="" width="384" height="384" className="ask-mascot" loading="lazy" />
            <div className="stack-s">
              <h2 id="ask-title">Stuck? Ask Pip.</h2>
              <p>
                Pip answers from the official game guide — with tables, pictures and steps. If Pip can't find it, a real person from the team joins
                the same chat.
              </p>
              <div className="chip-row">
                {STARTERS.map((q) => (
                  <button key={q} type="button" className="spct-chip" onClick={() => openChat(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
