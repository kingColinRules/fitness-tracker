import type { Exercise, ExerciseGoals, WeeklySchedule } from '../types';
import { generateId } from './id';

export interface LegacyExerciseData {
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  exerciseDescriptions: Record<string, string>;
  exerciseGoals: Record<string, { override: boolean; required: number; disabled?: boolean; createdAt?: string }>;
  weeklySchedule: Record<string, { category: string; name: string }[]>;
}

export interface MigratedExerciseData {
  exercises: Record<string, Exercise[]>;
  completions: Record<string, boolean>;
  exerciseDescriptions: Record<string, string>;
  exerciseGoals: ExerciseGoals;
  weeklySchedule: WeeklySchedule;
}

// Category/exercise names can contain hyphens, so a flat `${category}-${name}` string key would
// re-introduce the exact prefix-collision ambiguity already present in the legacy scheme (e.g.
// category "Leg" + name "Day-Press" vs. category "Leg-Day" + name "Press"). A nested lookup avoids
// that entirely — no string-splitting of category/name is ever needed.
type IdLookup = Map<string, Map<string, string>>;

function buildIdLookup(exercises: Record<string, string[]>): { lookup: IdLookup; newExercises: Record<string, Exercise[]> } {
  const lookup: IdLookup = new Map();
  const newExercises: Record<string, Exercise[]> = {};
  for (const [category, names] of Object.entries(exercises)) {
    const byName = new Map<string, string>();
    newExercises[category] = names.map(name => {
      // First occurrence of a duplicate name within a category wins the id slot; later duplicates
      // still get their own fresh id in `newExercises` (so they don't vanish from the visible list),
      // but any completions/descriptions/goals keyed by the shared legacy key can only ever resolve
      // to the first one — a pre-existing ambiguity in the flat-string scheme, not new here.
      const id = byName.get(name) ?? generateId();
      if (!byName.has(name)) byName.set(name, id);
      return { id, name };
    });
    lookup.set(category, byName);
  }
  return { lookup, newExercises };
}

// Resolves a legacy `${category}-${name}` key back to its id by checking each known category as a
// prefix and confirming the remainder is one of that category's actual exercise names — not just a
// blind prefix match, which is what let the old rename-rekeying code misfire on collisions like
// "Leg" vs. "LegDay".
function resolveKey(legacyKey: string, lookup: IdLookup): string | undefined {
  for (const [category, byName] of lookup) {
    const prefix = `${category}-`;
    if (!legacyKey.startsWith(prefix)) continue;
    const name = legacyKey.slice(prefix.length);
    const id = byName.get(name);
    if (id) return id;
  }
  return undefined;
}

export function migrateExerciseData(legacy: LegacyExerciseData): MigratedExerciseData {
  const { lookup, newExercises } = buildIdLookup(legacy.exercises);

  const completions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(legacy.completions)) {
    if (key.length < 11) continue; // malformed/too-short key, can't carry a date suffix — drop
    const dateStr = key.slice(-10);
    const legacyKey = key.slice(0, -11); // strip the trailing "-YYYY-MM-DD" (1 hyphen + 10 chars)
    const id = resolveKey(legacyKey, lookup);
    if (id) completions[`${id}-${dateStr}`] = value;
    // else: orphaned key (exercise already deleted) — beneficial cleanup, not data loss.
  }

  const exerciseDescriptions: Record<string, string> = {};
  for (const [key, value] of Object.entries(legacy.exerciseDescriptions)) {
    const id = resolveKey(key, lookup);
    if (id) exerciseDescriptions[id] = value;
  }

  const exerciseGoals: ExerciseGoals = {};
  for (const [key, value] of Object.entries(legacy.exerciseGoals)) {
    const id = resolveKey(key, lookup);
    if (id) exerciseGoals[id] = value;
  }

  const weeklySchedule: WeeklySchedule = {};
  for (const [day, entries] of Object.entries(legacy.weeklySchedule)) {
    weeklySchedule[day] = entries
      .map(e => lookup.get(e.category)?.get(e.name))
      .filter((id): id is string => !!id)
      .map(exerciseId => ({ exerciseId }));
  }

  return { exercises: newExercises, completions, exerciseDescriptions, exerciseGoals, weeklySchedule };
}
