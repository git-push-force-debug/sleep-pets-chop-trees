import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import type { Layer } from '../motion/Parallax.tsx';

const V3 = '/art/v3';
const img = (file: string, className = 'plx-img') => <img className={className} src={`${V3}/${file}.webp`} alt="" draggable={false} />;

/** [file, top %, width px, seconds per crossing, start offset s, opacity] — spread out so the sky is never empty. */
type Cloud = [file: 1 | 2 | 3, top: number, width: number, dur: number, delay: number, opacity: number];
const FAR_CLOUDS: Cloud[] = [
  [2, 5, 170, 150, -20, 0.75], [3, 13, 210, 170, -95, 0.7], [1, 21, 150, 140, -60, 0.65],
  [3, 3, 180, 180, -140, 0.65], [2, 17, 130, 160, -118, 0.6], [1, 9, 160, 175, -40, 0.6],
];
const NEAR_CLOUDS: Cloud[] = [
  [1, 7, 380, 85, -10, 0.95], [2, 24, 300, 100, -52, 0.92], [3, 15, 340, 95, -75, 0.94],
];
const Clouds = ({ list }: { list: Cloud[] }) => (
  <>
    {list.map(([n, top, width, dur, delay, opacity], i) => (
      <img key={i} className="sprite cloud" src={`${V3}/cloud-${n}.webp`} alt=""
        style={{ top: `${top}%`, width: `clamp(${width * 0.45}px, ${width / 14}vw, ${width}px)`, opacity, animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
    ))}
  </>
);

/** Sleeping animals lying in the grass hollow of the front bank (their contact shadows are in the art), breathing, Z's just above their heads. */
type Sleeper = { file: string; left: number; bottom: number; width: number };
const Sleepers = ({ list }: { list: Sleeper[] }) => (
  <>
    {list.map((a, i) => (
      <div key={a.file} className="sleeper" style={{ left: `${a.left}%`, bottom: `${a.bottom}%`, width: `clamp(${a.width * 0.5}px, ${a.width / 14}vw, ${a.width}px)` }}>
        <img className="sleeper-body" src={`${V3}/animal-${a.file}.webp`} alt="" style={{ animationDelay: `${-i * 1.1}s` }} />
        <img className="sprite zzz" src={`${V3}/zzz.webp`} alt="" style={{ animationDelay: `${-i * 0.9}s` }} />
      </div>
    ))}
  </>
);

/** Falling leaves across the whole scene: [left %, seconds, delay s, leaf 1|2, size px]. */
const LEAVES: [number, number, number, 1 | 2, number][] = [
  [8, 15, -2, 1, 26], [22, 18, -9, 2, 22], [37, 14, -5, 1, 30], [55, 17, -12, 2, 24],
  [68, 13, -1, 1, 28], [79, 16, -7, 2, 22], [90, 19, -14, 1, 26], [96, 15, -10, 2, 20],
];
export const Leaves = () => (
  <>
    {LEAVES.map(([left, dur, delay, n, size], i) => (
      <img key={i} className="sprite leaf" src={`${V3}/leaf-${n}.webp`} alt=""
        style={{ left: `${left}%`, width: size, animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
    ))}
  </>
);

/** Mid-page band: a panorama that runs through all six biomes, one sleeping animal on each biome's ground. */
const BIOME_ANIMALS: Sleeper[] = [
  { file: 'deer', left: 3, bottom: 22, width: 170 },
  { file: 'cheetah', left: 20, bottom: 22, width: 175 },
  { file: 'redpanda', left: 37, bottom: 22, width: 160 },
  { file: 'fennec', left: 53.5, bottom: 22, width: 160 },
  { file: 'triceratops', left: 70, bottom: 22, width: 175 },
  { file: 'glimmerdeer', left: 86, bottom: 22, width: 170 },
];
const Strip = ({ file, children }: { file: string; children?: ReactNode }) => (
  <div className="biome-strip">{img(file, 'biome-strip-img')}{children}</div>
);
export const BAND_LAYERS: Layer[] = [
  { src: `${V3}/sky.webp`, depth: 0, className: 'plx-sky' },
  { node: <Clouds list={NEAR_CLOUDS} />, depth: 0.1 },
  { node: <Strip file="biomes-back" />, depth: 0.25 },
  { node: <Leaves />, depth: 0.6 },
  { node: <Strip file="biomes-ground"><Sleepers list={BIOME_ANIMALS} /></Strip>, depth: 0.85, className: "plx-front" },
];
export const BAND_CONTENT_AT = 3;

/** One absolutely placed layer of the pinned stage. */
type PlateStyle = ComponentProps<typeof motion.div>['style'];
const Plate = ({ z, style, className = 'ht-plate', children }: { z: number; style?: PlateStyle; className?: string; children: ReactNode }) => (
  <motion.div className={className} style={{ zIndex: z, ...style }}>{children}</motion.div>
);

/**
 * Hero → next section as ONE scroll-scrubbed timeline. The stage stays pinned for the length of the track; the real scroll
 * position gives p = 0…1 (no springs, no timers, no snapping), so stopping anywhere holds the frame and scrolling back reverses it.
 * The distant art zooms out slightly, the side terrain and the foreground rise, and the foreground's lower part becomes the
 * backdrop of `next`. When the pin releases, the foreground keeps moving at page speed into the cream page below.
 */
export function HeroTransition({ hero, next, video }: { hero: ReactNode; next: ReactNode; video: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const fg = useRef<HTMLDivElement>(null);
  const zoom = !useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: track, offset: ['start start', 'end end'] });

  // How far the foreground must rise so its bottom meets the bottom of the stage at p = 1.
  const [rise, setRise] = useState(0);
  useLayoutEffect(() => {
    // +1px overshoot: offsets are rounded, so without it a sub-pixel sliver of the pin's sky can show under the grass.
    const measure = () => pin.current && fg.current && setRise(pin.current.clientHeight - fg.current.offsetTop - fg.current.offsetHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    if (pin.current) ro.observe(pin.current);
    if (fg.current) ro.observe(fg.current);
    return () => ro.disconnect();
  }, []);

  const scale = (from: number) => useTransform(p, [0, 0.4], [zoom ? from : 1, 1]);
  const skyS = scale(1.06);
  const mtnS = scale(1.12);
  const meadowS = scale(1.18);
  // Depth ladder: each nearer layer climbs faster (sky stays put), so mountains and meadow separate from the sky.
  const rate = (vh: number) => useTransform(p, [0, 0.45], ['0vh', `${vh}vh`]);
  const mtnY = rate(-10);
  const meadowY = rate(-18);
  const sideY = rate(-24);
  const frontY = rate(-55);
  // Short slow rise, then the sweep up; it settles at 0.45 so the next section holds for the rest of the pin.
  const fgY = useTransform(p, [0, 0.12, 0.45, 1], [0, rise * 0.12, rise, rise]);
  const heroY = useTransform(p, [0, 0.3], ['0vh', '-22vh']);
  const heroO = useTransform(p, [0.04, 0.24], [1, 0]);
  const heroPE = useTransform(p, (v) => (v < 0.2 ? 'auto' : 'none'));
  // The next section fades and rises in early, copy first then the video, as soon as the grass is under it.
  const nextY = useTransform(p, [0.2, 0.38], ['5vh', '0vh']);
  const nextO = useTransform(p, [0.2, 0.34], [0, 1]);
  const videoY = useTransform(p, [0.26, 0.44], ['7vh', '0vh']);
  const videoO = useTransform(p, [0.26, 0.4], [0, 1]);
  const nextPE = useTransform(p, (v) => (v > 0.3 ? 'auto' : 'none'));

  return (
    <div ref={track} className="ht-track">
      <div ref={pin} className="ht-pin">
        <Plate z={1} style={{ scale: skyS }}>{img('sky')}</Plate>
        <Plate z={2}><Clouds list={FAR_CLOUDS} /></Plate>
        <Plate z={3} style={{ scale: mtnS, y: mtnY }}>{img('mountains', 'plx-img plx-bottom')}</Plate>
        <Plate z={4}><Clouds list={NEAR_CLOUDS} /></Plate>
        <Plate z={5} style={{ scale: meadowS, y: meadowY }}>{img('meadow', 'plx-img plx-bottom')}</Plate>
        <Plate z={6} style={{ y: sideY }}>{img('left-cliff', 'side side-left-cliff')}{img('right-cliff', 'side side-right-cliff')}</Plate>
        <Plate z={7} className="ht-copy" style={{ y: heroY, opacity: heroO, pointerEvents: heroPE }}>{hero}</Plate>
        <Plate z={8}><Leaves /></Plate>
        <Plate z={9} style={{ y: frontY }}>{img('left-front', 'side side-left-front')}{img('right-front', 'side side-right-front')}</Plate>
        <motion.div ref={fg} className="ht-fg" style={{ zIndex: 10, y: fgY }} aria-hidden="true">
          <img className="ht-fg-img" src={`${V3}/foreground-tall.webp`} alt="" draggable={false} />
          <Sleepers list={[{ file: 'deer', left: 35, bottom: 0, width: 190 }, { file: 'fox', left: 54, bottom: 0, width: 170 }]} />
        </motion.div>
        <Plate z={11} className="ht-next" style={{ pointerEvents: nextPE }}>
          <div className="wrap watch">
            <motion.div className="watch-copy" style={{ y: nextY, opacity: nextO }}>{next}</motion.div>
            <motion.div style={{ y: videoY, opacity: videoO }}>{video}</motion.div>
          </div>
        </Plate>
      </div>
    </div>
  );
}
