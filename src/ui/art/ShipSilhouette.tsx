/**
 * Side-profile ship silhouettes drawn from a few parameters per hull class.
 * The ship faces right; pass `flip` to face left.
 */
export type SilhouetteKind = 'destroyer' | 'lightCruiser' | 'heavyCruiser' | 'battlecruiser' | 'battleship' | 'superHeavy';

interface Profile {
  /** Hull length in viewBox units (box is 200 wide). */
  length: number;
  freeboard: number;
  turrets: { at: number; size: number; barrels: number; raised?: boolean }[];
  funnels: number[];
  bridge: { at: number; height: number; width: number };
  tubes?: number[];
}

const PROFILES: Record<SilhouetteKind, Profile> = {
  destroyer: {
    length: 118, freeboard: 6,
    turrets: [{ at: 0.84, size: 5, barrels: 1 }, { at: 0.1, size: 5, barrels: 1 }],
    funnels: [0.46, 0.56], bridge: { at: 0.7, height: 9, width: 0.09 }, tubes: [0.3, 0.38],
  },
  lightCruiser: {
    length: 148, freeboard: 7,
    turrets: [{ at: 0.88, size: 6, barrels: 1 }, { at: 0.79, size: 6, barrels: 1, raised: true }, { at: 0.12, size: 6, barrels: 1 }],
    funnels: [0.42, 0.5, 0.58], bridge: { at: 0.68, height: 12, width: 0.08 },
  },
  heavyCruiser: {
    length: 164, freeboard: 8,
    turrets: [{ at: 0.86, size: 8, barrels: 2 }, { at: 0.76, size: 8, barrels: 2, raised: true }, { at: 0.14, size: 8, barrels: 2 }],
    funnels: [0.46, 0.55], bridge: { at: 0.65, height: 15, width: 0.09 },
  },
  battlecruiser: {
    length: 184, freeboard: 8,
    turrets: [{ at: 0.86, size: 10, barrels: 2 }, { at: 0.77, size: 10, barrels: 2, raised: true }, { at: 0.36, size: 10, barrels: 2 }, { at: 0.12, size: 10, barrels: 2 }],
    funnels: [0.5, 0.58], bridge: { at: 0.68, height: 17, width: 0.08 },
  },
  battleship: {
    length: 182, freeboard: 9,
    turrets: [{ at: 0.84, size: 11, barrels: 2 }, { at: 0.74, size: 11, barrels: 2, raised: true }, { at: 0.26, size: 11, barrels: 2, raised: true }, { at: 0.15, size: 11, barrels: 2 }],
    funnels: [0.5], bridge: { at: 0.62, height: 21, width: 0.1 },
  },
  superHeavy: {
    length: 194, freeboard: 10,
    turrets: [{ at: 0.84, size: 14, barrels: 3 }, { at: 0.73, size: 14, barrels: 3, raised: true }, { at: 0.17, size: 14, barrels: 3 }],
    funnels: [0.49], bridge: { at: 0.6, height: 24, width: 0.11 },
  },
};

const WATERLINE = 44;

/** Silhouette geometry, also used by the designer to anchor slots on turrets. */
export function silhouetteGeometry(kind: SilhouetteKind) {
  const p = PROFILES[kind];
  const x0 = (200 - p.length) / 2;
  const deck = WATERLINE - p.freeboard;
  const x = (f: number) => x0 + f * p.length;
  return { p, x0, x1: x0 + p.length, deck, x };
}

export function ShipSilhouette({
  kind,
  flip = false,
  className,
  title,
}: {
  kind: SilhouetteKind;
  flip?: boolean;
  className?: string;
  title?: string;
}) {
  const { p, x0, x1, deck, x } = silhouetteGeometry(kind);
  const bowRise = p.freeboard * 0.5;
  const hull = `M ${x0 + 3} ${WATERLINE + 3} L ${x0} ${deck} L ${x1 - 14} ${deck} L ${x1} ${deck - bowRise} L ${x1 - 7} ${WATERLINE + 3} Z`;
  const b = p.bridge;
  const bx = x(b.at);
  const bw = b.width * p.length;

  return (
    <svg viewBox="0 0 200 52" className={className} role="img" aria-label={title ?? kind} preserveAspectRatio="xMidYMax meet">
      {title && <title>{title}</title>}
      <g transform={flip ? 'translate(200 0) scale(-1 1)' : undefined}>
        {/* bow wave / water line */}
        <path d={`M 2 ${WATERLINE + 3.5} H 198`} className="sil-water" />
        <path d={hull} className="sil-hull" />
        {/* superstructure */}
        <rect x={bx - bw / 2} y={deck - b.height * 0.55} width={bw} height={b.height * 0.55} className="sil-body" />
        <rect x={bx - bw * 0.3} y={deck - b.height} width={bw * 0.6} height={b.height * 0.45} className="sil-body" />
        <line x1={bx} y1={deck - b.height} x2={bx} y2={deck - b.height - 8} className="sil-mast" />
        <line x1={bx - 4} y1={deck - b.height - 5} x2={bx + 4} y2={deck - b.height - 5} className="sil-mast" />
        {/* funnels */}
        {p.funnels.map((f, i) => (
          <path
            key={i}
            d={`M ${x(f) - 2.5} ${deck} L ${x(f) - 1.5} ${deck - 11 - p.freeboard * 0.4} L ${x(f) + 3.5} ${deck - 11 - p.freeboard * 0.4} L ${x(f) + 2.5} ${deck} Z`}
            className="sil-body"
          />
        ))}
        {/* torpedo tubes */}
        {p.tubes?.map((f, i) => <rect key={i} x={x(f) - 3} y={deck - 2} width={6} height={2} className="sil-body" />)}
        {/* turrets: forward ones point at the bow, aft ones at the stern */}
        {p.turrets.map((t, i) => {
          const cx = x(t.at);
          const forward = t.at > 0.5;
          const h = t.size * 0.42;
          const base = t.raised ? deck - 3 : deck;
          const barrels = Array.from({ length: t.barrels }, (_, k) => {
            const y = base - h * 0.55 - (k - (t.barrels - 1) / 2) * 1.1;
            const len = t.size * 0.9;
            return (
              <line
                key={k}
                x1={cx}
                y1={y}
                x2={forward ? cx + t.size / 2 + len : cx - t.size / 2 - len}
                y2={y}
                className="sil-barrel"
              />
            );
          });
          return (
            <g key={i}>
              {t.raised && <rect x={cx - t.size * 0.3} y={deck - 3} width={t.size * 0.6} height={3} className="sil-body" />}
              {barrels}
              <path
                d={`M ${cx - t.size / 2} ${base} L ${cx - t.size / 2 + 1.5} ${base - h} L ${cx + t.size / 2 - 1.5} ${base - h} L ${cx + t.size / 2} ${base} Z`}
                className="sil-turret"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function silhouetteFor(hullClass: string | undefined, line: 'screen' | 'capital'): SilhouetteKind {
  if (hullClass && hullClass in PROFILES) return hullClass as SilhouetteKind;
  return line === 'screen' ? 'destroyer' : 'battleship';
}
