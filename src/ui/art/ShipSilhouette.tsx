/**
 * Side-profile ship silhouettes drawn from a few parameters per hull class.
 * The ship faces right; pass `flip` to face left.
 */
export type SilhouetteKind =
  | 'destroyer'
  | 'lightCruiser'
  | 'heavyCruiser'
  | 'battlecruiser'
  | 'battleship'
  | 'superHeavy'
  | 'carrier'
  | 'submarine';

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
  carrier: {
    // Turrets here are the deck-edge AA mounts; the flight deck and island are drawn separately.
    length: 190, freeboard: 13,
    turrets: [],
    funnels: [0.6], bridge: { at: 0.64, height: 12, width: 0.07 },
  },
  submarine: {
    // Drawn separately: a low hull with a conning tower.
    length: 120, freeboard: 3,
    turrets: [],
    funnels: [0.5], bridge: { at: 0.55, height: 8, width: 0.1 },
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
  if (kind === 'carrier') return <CarrierSilhouette flip={flip} className={className} title={title} />;
  if (kind === 'submarine') return <SubmarineSilhouette flip={flip} className={className} title={title} />;
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

export function silhouetteFor(hullClass: string | undefined, line: 'screen' | 'capital' | 'carrier' | 'submarine'): SilhouetteKind {
  if (hullClass && hullClass in PROFILES) return hullClass as SilhouetteKind;
  if (line === 'submarine' || line === 'carrier') return line;
  return line === 'screen' ? 'destroyer' : 'battleship';
}

/** Flat-top: high hull, overhanging flight deck, island to starboard and a few parked aircraft. */
function CarrierSilhouette({ flip, className, title }: { flip: boolean; className?: string; title?: string }) {
  const { x0, x1, deck, x } = silhouetteGeometry('carrier');
  const flightDeck = deck - 3;
  const hull = `M ${x0 + 4} ${WATERLINE + 3} L ${x0 + 2} ${deck} L ${x1 - 10} ${deck} L ${x1 - 2} ${deck - 2} L ${x1 - 8} ${WATERLINE + 3} Z`;
  const planes = [0.12, 0.2, 0.28, 0.36];
  return (
    <svg viewBox="0 0 200 52" className={className} role="img" aria-label={title ?? 'carrier'} preserveAspectRatio="xMidYMax meet">
      {title && <title>{title}</title>}
      <g transform={flip ? 'translate(200 0) scale(-1 1)' : undefined}>
        <path d={`M 2 ${WATERLINE + 3.5} H 198`} className="sil-water" />
        <path d={hull} className="sil-hull" />
        {/* hangar sides */}
        <rect x={x0 + 6} y={flightDeck} width={x1 - x0 - 16} height={3} className="sil-body" />
        {/* flight deck, overhanging bow and stern */}
        <rect x={x0 - 2} y={flightDeck - 2} width={x1 - x0 + 2} height={2} className="sil-hull" />
        {/* island and funnel */}
        <rect x={x(0.6)} y={flightDeck - 10} width={14} height={8} className="sil-body" />
        <rect x={x(0.62)} y={flightDeck - 15} width={6} height={5} className="sil-body" />
        <path d={`M ${x(0.6) + 9} ${flightDeck - 10} L ${x(0.6) + 10} ${flightDeck - 16} L ${x(0.6) + 14} ${flightDeck - 16} L ${x(0.6) + 14} ${flightDeck - 10} Z`} className="sil-body" />
        <line x1={x(0.6) + 5} y1={flightDeck - 15} x2={x(0.6) + 5} y2={flightDeck - 22} className="sil-mast" />
        {/* parked aircraft */}
        {planes.map((f, i) => (
          <path key={i} d={`M ${x(f) - 3} ${flightDeck - 2} L ${x(f) + 3} ${flightDeck - 2} M ${x(f) - 1} ${flightDeck - 2} L ${x(f) + 1} ${flightDeck - 4}`} className="sil-mast" />
        ))}
      </g>
    </svg>
  );
}

/** A submarine running on the surface: long low hull, conning tower, deck gun and periscope. */
function SubmarineSilhouette({ flip, className, title }: { flip: boolean; className?: string; title?: string }) {
  const { x0, x1, deck, x } = silhouetteGeometry('submarine');
  const hull = `M ${x0} ${deck + 1} Q ${x0 + 6} ${WATERLINE + 3} ${x0 + 20} ${WATERLINE + 3} L ${x1 - 16} ${WATERLINE + 3} Q ${x1} ${WATERLINE + 2} ${x1} ${deck + 1} Z`;
  const tower = x(0.52);
  return (
    <svg viewBox="0 0 200 52" className={className} role="img" aria-label={title ?? 'submarine'} preserveAspectRatio="xMidYMax meet">
      {title && <title>{title}</title>}
      <g transform={flip ? 'translate(200 0) scale(-1 1)' : undefined}>
        <path d={`M 2 ${WATERLINE + 0.5} H 198`} className="sil-water" />
        <path d={hull} className="sil-hull" />
        <path d={`M ${tower - 7} ${deck + 1} L ${tower - 5} ${deck - 7} L ${tower + 7} ${deck - 7} L ${tower + 9} ${deck + 1} Z`} className="sil-body" />
        <line x1={tower + 2} y1={deck - 7} x2={tower + 2} y2={deck - 15} className="sil-mast" />
        <line x1={tower - 2} y1={deck - 7} x2={tower - 2} y2={deck - 12} className="sil-mast" />
        <line x1={x(0.72)} y1={deck - 1} x2={x(0.8)} y2={deck - 3} className="sil-barrel" />
        <rect x={x(0.7) - 2} y={deck - 2} width={4} height={3} className="sil-body" />
      </g>
    </svg>
  );
}
