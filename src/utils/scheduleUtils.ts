import type { Exercise, ExerciseGoals, GoalSettings, WeeklySchedule } from '../types';

export type ExerciseIndex = Map<string, { category: string; name: string; order: number }>;

export function buildExerciseIndex(exercises: Record<string, Exercise[]>): ExerciseIndex {
  const index: ExerciseIndex = new Map();
  Object.entries(exercises).forEach(([category, list], catIdx) => {
    list.forEach((ex, i) => index.set(ex.id, { category, name: ex.name, order: catIdx * 10_000 + i }));
  });
  return index;
}

export function sortByExerciseOrder<T extends { exerciseId: string }>(entries: T[], index: ExerciseIndex): T[] {
  return [...entries].sort((a, b) =>
    (index.get(a.exerciseId)?.order ?? Infinity) - (index.get(b.exerciseId)?.order ?? Infinity)
  );
}

export function getRemainingForExercise(
  exerciseId: string,
  index: ExerciseIndex,
  weeklySchedule: WeeklySchedule,
  goalSettings: GoalSettings,
  exerciseGoals: ExerciseGoals,
): number | null {
  const cat = index.get(exerciseId)?.category;
  if (!cat) return null;
  const eg = exerciseGoals[exerciseId];
  if (!goalSettings[cat]?.enabled || eg?.disabled) return null;
  const required = (eg?.override && !eg?.disabled) ? eg.required : (goalSettings[cat]?.required ?? 3);
  const scheduled = Object.values(weeklySchedule).flat().filter(e => e.exerciseId === exerciseId).length;
  return Math.max(0, required - scheduled);
}
