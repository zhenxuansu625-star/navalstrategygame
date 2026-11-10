/** Simple line-art glyphs for module categories. */
import type { ModuleCategory } from '../../sim/designer';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function turret(barrels: number, scale = 1) {
  const w = 10 * scale;
  const h = 5 * scale;
  const y = 15;
  return (
    <>
      {Array.from({ length: barrels }, (_, i) => {
        const by = y - h * 0.6 - (i - (barrels - 1) / 2) * 1.8;
        return <line key={i} x1={12} y1={by} x2={21} y2={by} {...S} />;
      })}
      <path d={`M ${12 - w / 2} ${y} L ${12 - w / 2 + 1.5} ${y - h} L ${12 + w / 2 - 1} ${y - h} L ${12 + w / 2} ${y} Z`} {...S} fill="currentColor" fillOpacity={0.25} />
      <line x1={3} y1={19} x2={21} y2={19} {...S} />
    </>
  );
}

const GLYPHS: Record<ModuleCategory | 'empty', () => React.ReactNode> = {
  fireControl: () => (
    <>
      <circle cx={12} cy={12} r={7} {...S} />
      <circle cx={12} cy={12} r={2} {...S} />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" {...S} />
    </>
  ),
  engine: () => (
    <>
      <circle cx={12} cy={12} r={3} {...S} />
      <path d="M12 9c-1-4 1-6 3-6s1 4-3 6M15 12c4-1 6 1 6 3s-4 1-6-3M12 15c1 4-1 6-3 6s-1-4 3-6M9 12c-4 1-6-1-6-3s4-1 6 3" {...S} />
    </>
  ),
  armour: () => <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" {...S} />,
  extraArmour: () => (
    <>
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" {...S} />
      <path d="M12 8v7M8.5 11.5h7" {...S} />
    </>
  ),
  lightBattery: () => turret(1, 0.8),
  mediumBattery: () => turret(2, 1),
  heavyBattery: () => turret(3, 1.2),
  superHeavyBattery: () => (
    <>
      {turret(3, 1.5)}
      <path d="M3 22h18" {...S} />
    </>
  ),
  secondary: () => (
    <>
      <rect x={4} y={11} width={8} height={6} {...S} />
      <line x1={12} y1={13} x2={20} y2={13} {...S} />
      <line x1={12} y1={15.5} x2={18} y2={15.5} {...S} />
    </>
  ),
  dualPurpose: () => (
    <>
      <rect x={4} y={13} width={8} height={6} {...S} />
      <line x1={10} y1={14} x2={18} y2={6} {...S} />
      <path d="M19 3l1 2 2 .5-2 .8-.7 2-.8-2-2-.6 2-.7z" {...S} />
    </>
  ),
  torpedo: () => (
    <>
      <path d="M3 12h13l4-2.5v5L16 12" {...S} />
      <path d="M3 10.5c-.8.5-.8 2.5 0 3M6 10v4" {...S} />
    </>
  ),
  aa: () => (
    <>
      <path d="M5 20l7-9M8 20l7-9M11 20l7-9" {...S} />
      <circle cx={18} cy={5} r={2.5} {...S} />
      <path d="M18 1v1.5M22 5h-1.5M14 5h1.5" {...S} />
    </>
  ),
  asw: () => (
    <>
      <rect x={8} y={4} width={8} height={10} rx={2} {...S} />
      <path d="M3 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 21.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" {...S} />
    </>
  ),
  sensor: () => (
    <>
      <path d="M5 15a8 8 0 0 1 11-11z" {...S} />
      <path d="M10.5 9.5L18 2M12 21v-6M8 21h8" {...S} />
    </>
  ),
  hangar: () => <PlaneGlyph />,
  empty: () => <path d="M12 7v10M7 12h10" {...S} strokeOpacity={0.6} />,
};

function PlaneGlyph() {
  return (
    <path
      d="M12 3c.9 0 1.4.8 1.4 2v4.2l7.1 4v1.9l-7.1-2.2v4.6l2.1 1.6v1.6L12 20l-3.5.9v-1.6l2.1-1.6v-4.6l-7.1 2.2v-1.9l7.1-4V5c0-1.2.5-2 1.4-2z"
      {...S}
      fill="currentColor"
      fillOpacity={0.25}
    />
  );
}

/** Icons for the battle firepower panel. */
export type StatIconKind = 'lightBattery' | 'heavyBattery' | 'torpedo' | 'hangar' | 'aa';

export function ModuleIcon({ category, className }: { category: ModuleCategory | 'empty'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {GLYPHS[category]()}
    </svg>
  );
}
