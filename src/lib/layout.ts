import { LayoutPoint, RadarConfig, RadarItem } from './types';

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

interface LayoutContext {
  config: RadarConfig;
  rMax: number;
  rings: { name: string; inner: number; outer: number }[];
  quadrants: { name: string; start: number; end: number }[];
}

function createLayoutContext(config: RadarConfig, width: number, height: number): LayoutContext {
  const rMax = Math.min(width / 2, height) - config.geometry.margin;
  const ringBounds = config.rings.map((ring, index) => {
    const prevRadius = index === 0 ? 0 : config.rings[index - 1].radius;
    return {
      name: ring.name,
      inner: prevRadius * rMax,
      outer: ring.radius * rMax
    };
  });

  const semiCircle = config.geometry.semiCircle ?? false;
  const totalSpan = semiCircle ? Math.PI : Math.PI * 2;
  const startAngle = semiCircle ? Math.PI : 0;
  const quadrantSpan = totalSpan / config.quadrants.length;
  const quadrants = config.quadrants.map((name, index) => {
    const start = startAngle + index * quadrantSpan;
    return { name, start, end: start + quadrantSpan };
  });

  return { config, rMax, rings: ringBounds, quadrants };
}

function computePosition(item: RadarItem, context: LayoutContext): LayoutPoint {
  const { rMax, rings, quadrants, config } = context;
  const ring = rings.find((r) => r.name === item.ring) ?? rings[rings.length - 1];
  const quadrant = quadrants.find((q) => q.name === item.quadrant) ?? quadrants[0];

  let angle: number;
  let radius: number;

  if (config.placement.allowOverrides && typeof item.angle_deg === 'number') {
    angle = (item.angle_deg * Math.PI) / 180;
  }

  if (config.placement.allowOverrides && typeof item.radius_norm === 'number') {
    radius = item.radius_norm * rMax;
  }

  if (angle === undefined || Number.isNaN(angle)) {
    const seed = hashString(item.id + item.quadrant + item.ring);
    const random = config.placement.seeded ? seededRandom(seed) : Math.random;
    const jitter = config.placement.jitter ? random() : 0.5;
    angle = quadrant.start + jitter * (quadrant.end - quadrant.start);
  }

  if (radius === undefined || Number.isNaN(radius)) {
    const seed = hashString(item.id + item.ring + item.quadrant + 'radius');
    const random = config.placement.seeded ? seededRandom(seed) : Math.random;
    const jitter = config.placement.jitter ? random() : 0.5;
    const inner = ring.inner;
    const outer = ring.outer;
    radius = inner + jitter * Math.max(16, outer - inner);
    radius = Math.min(radius, outer - 8);
  }

  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return { item, angle, radius, x, y };
}

export function computeLayout(items: RadarItem[], config: RadarConfig, width: number, height: number): LayoutPoint[] {
  const context = createLayoutContext(config, width, height);
  return items.map((item) => computePosition(item, context));
}

export function getRingBounds(config: RadarConfig, width: number, height: number) {
  const context = createLayoutContext(config, width, height);
  return context.rings;
}

export function getQuadrantSectors(config: RadarConfig) {
  const semiCircle = config.geometry.semiCircle ?? false;
  const totalSpan = semiCircle ? Math.PI : Math.PI * 2;
  const startAngle = semiCircle ? Math.PI : 0;
  const quadrantSpan = totalSpan / config.quadrants.length;
  return config.quadrants.map((name, index) => {
    const start = startAngle + index * quadrantSpan;
    return { name, start, end: start + quadrantSpan };
  });
}
