import type { Catalog } from './catalog';
import { moduleFits, modulesForSlot } from './catalog';
import type { Design, Hull } from './types';

/**
 * Fill every required slot of `hull` with its newest module no later than the
 * hull's year, keeping any existing module that still fits.
 */
function fillSlots(catalog: Catalog, hull: Hull, existing: Record<string, string | null>): Record<string, string | null> {
  const slots: Record<string, string | null> = {};
  for (const slot of hull.slots) {
    const current = existing[slot.id];
    const currentModule = current ? catalog.modules.get(current) : undefined;
    if (currentModule && moduleFits(hull, slot, currentModule)) {
      slots[slot.id] = current!;
      continue;
    }
    if (slot.required) {
      const options = modulesForSlot(catalog, hull, slot);
      const contemporary = options.filter((m) => m.year <= hull.year);
      slots[slot.id] = (contemporary.at(-1) ?? options[0])?.id ?? null;
    } else {
      slots[slot.id] = null;
    }
  }
  return slots;
}

export function newDesign(catalog: Catalog, hullId: string, id: string, name: string): Design {
  const hull = catalog.hulls.get(hullId);
  if (!hull) throw new Error(`Unknown hull ${hullId}`);
  return { id, name, role: '', hullId, slots: fillSlots(catalog, hull, {}) };
}

/** Switch a design to another hull, keeping every module that still fits. */
export function changeHull(catalog: Catalog, design: Design, hullId: string): Design {
  const hull = catalog.hulls.get(hullId);
  if (!hull) throw new Error(`Unknown hull ${hullId}`);
  return { ...design, hullId, slots: fillSlots(catalog, hull, design.slots) };
}

export function setSlot(design: Design, slotId: string, moduleId: string | null): Design {
  return { ...design, slots: { ...design.slots, [slotId]: moduleId } };
}
