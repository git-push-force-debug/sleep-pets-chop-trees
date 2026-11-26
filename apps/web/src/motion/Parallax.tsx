import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useRef, type PointerEvent, type ReactNode } from 'react';

/**
 * One seamless scene from stacked layers, each with a depth from 0 (far) to 1 (near).
 * On scroll the far layers drift at about half page speed and the nearest ones overtake the page,
 * so the foreground rises over the content. The pointer nudges near layers more.
 * Children sit inside the stack (between layers) at `contentAt`. Transform-only; static under reduced motion.
 */
export interface Layer {
  src?: string;
  /** Sprites or anything else that should move at this depth (they keep their own CSS loops). */
  node?: ReactNode;
  depth: number;
  className?: string;
}

// px a layer is pushed back down over the scene's scroll: + slower than the page, − faster.
const lag = (depth: number) => 360 * (1 - depth) - 160 * depth;

function DepthLayer({ depth, progress, px, py, reduced, className, z, children }: {
  depth: number; progress: MotionValue<number>; px: MotionValue<number>; py: MotionValue<number>;
  reduced: boolean; className: string; z: number; children: ReactNode;
}) {
  const scrollY = useTransform(progress, [0, 1], [0, reduced ? 0 : lag(depth)], { clamp: false });
  const pointerX = useTransform(px, (v) => v * -36 * depth);
  const pointerY = useTransform(py, (v) => v * -18 * depth);
  const y = useTransform([scrollY, pointerY], ([a, b]) => (a as number) + (b as number));
  return <motion.div className={className} style={{ x: pointerX, y, zIndex: z }}>{children}</motion.div>;
}

export function ParallaxScene({ layers, contentAt, contentDepth, band = false, className = '', children }: {
  layers: Layer[]; contentAt: number; contentDepth: number; className?: string; children: ReactNode;
  /** Mid-page scene: layers travel while it crosses the viewport, centred when it is in the middle. */
  band?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();
  const visible = useInView(ref);
  const { scrollYProgress: raw } = useScroll({ target: ref, offset: band ? ['start end', 'end start'] : ['start start', 'end start'] });
  const scrollYProgress = useTransform(raw, (v) => (band ? v - 0.5 : v));
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const py = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  const onMove = (e: PointerEvent) => {
    if (reduced || e.pointerType === 'touch') return;
    const r = ref.current!.getBoundingClientRect();
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const shared = { progress: scrollYProgress, px, py, reduced };

  return (
    <div ref={ref} className={`plx ${className} ${visible ? '' : 'offscreen'}`} onPointerMove={onMove} onPointerLeave={() => (rawX.set(0), rawY.set(0))}>
      {layers.map((l, i) => (
        <DepthLayer key={i} {...shared} depth={l.depth} z={i * 2} className={`plx-layer ${l.className ?? ''}`}>
          <div aria-hidden="true" className="plx-fill">
            {l.src ? <img src={l.src} alt="" draggable={false} className="plx-img" loading="lazy" decoding="async" /> : l.node}
          </div>
        </DepthLayer>
      ))}
      <DepthLayer {...shared} depth={contentDepth} z={contentAt * 2 - 1} className="plx-content">
        {children}
      </DepthLayer>
    </div>
  );
}

/** Scroll-linked drift for things below the hero: travels `range`→`-range` px while it crosses the viewport. */
export function Drift({ range, className, children }: { range: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [range, -range]);
  return <motion.div ref={ref} className={className} style={{ y }}>{children}</motion.div>;
}

/** Rise-in as a section scrolls into view (once). */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduced ? false : { opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay }}
    >
      {children}
    </Tag>
  );
}

/** Pointer tilt with an inner layer that floats toward the viewer (biome cards). */
export function TiltCard({ children, inner, className = '' }: { children: ReactNode; inner?: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 20 });
  const sy = useSpring(my, { stiffness: 200, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const innerX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const innerY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <motion.div
      className={`tilt ${className}`}
      onPointerMove={onMove}
      onPointerLeave={() => (mx.set(0), my.set(0))}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      whileHover={reduced ? undefined : { scale: 1.02 }}
    >
      {children}
      {inner && (
        <motion.div className="tilt-inner" style={reduced ? undefined : { x: innerX, y: innerY }}>
          {inner}
        </motion.div>
      )}
    </motion.div>
  );
}
