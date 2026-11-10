import { HULLS } from '../../data/hulls';
import { MODULES } from '../../data/modules';
import type { Hull, Module, SlotDef } from './types';

export interface Catalog {
  hulls: Map<string, Hull>;
  modules: Map<string, Module>;
}

export function makeCatalog(hulls: readonly Hull[], modules: readonly Module[]): Catalog {
  return {
    hulls: new Map(hulls.map((h) => [h.id, h])),
    modules: new Map(modules.map((m) => [m.id, m])),
  };
}

export const DEFAULT_CATALOG: Catalog = makeCatalog(HULLS, MODULES);

/** Whether `module` may be fitted to `slot` on `hull`. */
export function moduleFits(hull: Hull, slot: SlotDef, module: Module): boolean {
  if (!slot.accepts.includes(module.category)) return false;
  if (module.hullClasses && !module.hullClasses.includes(hull.hullClass)) return false;
  return true;
}

/** Modules that fit a slot, oldest first. */
export function modulesForSlot(catalog: Catalog, hull: Hull, slot: SlotDef): Module[] {
  return [...catalog.modules.values()]
    .filter((m) => moduleFits(hull, slot, m))
    .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
}
