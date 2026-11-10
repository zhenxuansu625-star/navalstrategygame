import type { Catalog } from './catalog';
import { moduleFits } from './catalog';
import type { Design } from './types';

export interface DesignIssue {
  slotId?: string;
  message: string;
}

export function validateDesign(catalog: Catalog, design: Design): DesignIssue[] {
  const issues: DesignIssue[] = [];
  if (!design.name.trim()) issues.push({ message: 'The design needs a name.' });
  const hull = catalog.hulls.get(design.hullId);
  if (!hull) return [...issues, { message: `Unknown hull "${design.hullId}".` }];

  const slotIds = new Set(hull.slots.map((s) => s.id));
  for (const slotId of Object.keys(design.slots)) {
    if (!slotIds.has(slotId) && design.slots[slotId]) {
      issues.push({ slotId, message: `${hull.name} has no slot "${slotId}".` });
    }
  }
  for (const slot of hull.slots) {
    const moduleId = design.slots[slot.id] ?? null;
    if (!moduleId) {
      if (slot.required) issues.push({ slotId: slot.id, message: `${slot.label} must be filled.` });
      continue;
    }
    const module = catalog.modules.get(moduleId);
    if (!module) {
      issues.push({ slotId: slot.id, message: `Unknown module "${moduleId}".` });
    } else if (!moduleFits(hull, slot, module)) {
      issues.push({ slotId: slot.id, message: `${module.name} cannot be fitted to ${slot.label} on a ${hull.name}.` });
    }
  }
  return issues;
}

export function isValidDesign(catalog: Catalog, design: Design): boolean {
  return validateDesign(catalog, design).length === 0;
}
