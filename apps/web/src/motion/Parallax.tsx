import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

/**
 * Layered parallax (Firewatch-style): each layer gets a depth from 0 (far) to 1 (near).
 * Scrolling moves far layers more slowly than near ones; the pointer nudges near layers more.
 * Transform-only, and a static stack under reduced motion (same final layout).
 */
export interface Layer {
  src: string;
  depth: number;
  className?: string;
  style?: CSSProperties;
}

function LayerImg({ layer, progress, px, py }: { layer: Layer; progress: MotionValue<number>; px: MotionValue<number>; py: MotionValue<number> }) {
  const scrollY = useTransform(progress, [0, 1], [0, 320 * (1 - layer.depth)]);
  const pointerX = useTransform(px, (v) => v * -36 * layer.depth);
  const pointerY = useTransform(py, (v) => v * -18 * layer.depth);
  const y = useTransform([scrollY, pointerY], ([a, b]) => (a as number) + (b as number));
  return (
    <motion.img
      src={layer.src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`plx-layer ${layer.className ?? ''}`}
      style={{ ...layer.style, x: pointerX, y, willChange: 'transform' }}
      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
    />
  );
}

export function ParallaxScene({ layers, className = '', children, overlay }: { layers: Layer[]; className?: string; children?: ReactNode; overlay?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
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

  return (
    <div ref={ref} className={`plx ${className}`} onPointerMove={onMove} onPointerLeave={() => (rawX.set(0), rawY.set(0))}>
      <div className="plx-stage" aria-hidden="true">
        {reduced
          ? layers.map((l) => <img key={l.src} src={l.src} alt="" className={`plx-layer ${l.className ?? ''}`} style={l.style} />)
          : layers.map((l) => <LayerImg key={l.src} layer={l} progress={scrollYProgress} px={px} py={py} />)}
        {overlay}
      </div>
      {children}
    </div>
  );
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
