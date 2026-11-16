// All 13 TPG guides as structured content (see tpgTypes.ts for the model).
// Guide files are loaded by pattern so a missing file is not a build error.
import type { Guide } from './tpgTypes';

const modules = import.meta.glob<Record<string, Guide[]>>('./tpgGuides[A-Z].ts', { eager: true });
const all = Object.values(modules).flatMap((m) => Object.values(m).flat());

export const TPG_GUIDES: Record<number, Guide> = Object.fromEntries(all.map((g) => [g.id, g]));
