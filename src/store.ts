import { create } from 'zustand';
import { createDefaultExercises } from './constants';
import type { Exercise, ExerciseGoals, GoalSettings, WeeklySchedule } from './types';
import { migrateExerciseData } from './utils/migration';

export type { Exercise, ExerciseGoals, GoalSettings, WeeklyScheduleEntry, WeeklySchedule } from './types';

type Updater<T> = T | ((prev: T) => T);

function applyUpdater<T>(prev: T, updater: Updater<T>): T {
  return typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
}

function readLS<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch { return null; }
}

function readSetting<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem('exerciseSettings');
    if (s) {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      if (key in parsed) return parsed[key] as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

// True if the stored exercise list is still in the pre-id shape (plain name strings rather than
// {id, name} objects) — checked against the first non-empty category, since an empty list carries
// no shape information either way.
function looksLegacy(exercises: Record<string, unknown> | null): boolean {
  if (!exercises) return false;
  for (const arr of Object.values(exercises)) {
    if (Array.isArray(arr) && arr.length > 0) return typeof arr[0] === 'string';
  }
  return false;
}

function runBootMigrationIfNeeded(): void {
  try {
    if (localStorage.getItem('schemaVersion') === '2') return;
    const rawExercises = readLS<Record<string, unknown>>('exerciseList');
    if (looksLegacy(rawExercises)) {
      const migrated = migrateExerciseData({
        exercises: rawExercises as Record<string, string[]>,
        completions: readLS('exerciseCompletions') ?? {},
        exerciseDescriptions: readLS('exerciseDescriptions') ?? {},
        exerciseGoals: readLS('exerciseGoals') ?? {},
        weeklySchedule: readLS('weeklySchedule') ?? {},
      });
      localStorage.setItem('exerciseList', JSON.stringify(migrated.exercises));
      localStorage.setItem('exerciseCompletions', JSON.stringify(migrated.completions));
      localStorage.setItem('exerciseDescriptions', JSON.stringify(migrated.exerciseDescriptions));
      localStorage.setItem('exerciseGoals', JSON.stringify(migrated.exerciseGoals));
      localStorage.setItem('weeklySchedule', JSON.stringify(migrated.weeklySchedule));
    }
    localStorage.setItem('schemaVersion', '2');
  } catch (e) { console.error('Migration error:', e); } // leave schemaVersion unset -> safe retry next launch
}

runBootMigrationIfNeeded();

const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  Weight: { enabled: true, required: 3 },
  Cardio: { enabled: true, required: 2 },
  Stretch: { enabled: true, required: 2 },
};

interface AppState {
  // Data
  exercises: Record<string, Exercise[]>;
  completions: Record<string, boolean>;
  exerciseDescriptions: Record<string, string>;
  exerciseGoals: ExerciseGoals;
  goalSettings: GoalSettings;
  weeklySchedule: WeeklySchedule;

  // Settings
  darkMode: boolean;
  defaultChartMode: 'weekly' | 'monthly';
  chartMode: 'weekly' | 'monthly';
  weekStartDay: number;
  animationsEnabled: boolean;
  showScheduleInLog: boolean;
  showDescriptionsInLog: boolean;
  useCustomAppName: boolean;
  appName: string;

  // App state
  hasUnsavedExport: boolean;
  seenBadges: string[];

  // Setters
  setExercises: (v: Updater<Record<string, Exercise[]>>) => void;
  setCompletions: (v: Updater<Record<string, boolean>>) => void;
  setExerciseDescriptions: (v: Updater<Record<string, string>>) => void;
  setExerciseGoals: (v: Updater<ExerciseGoals>) => void;
  setGoalSettings: (v: Updater<GoalSettings>) => void;
  setWeeklySchedule: (v: Updater<WeeklySchedule>) => void;
  setDarkMode: (v: boolean) => void;
  setDefaultChartMode: (v: 'weekly' | 'monthly') => void;
  setChartMode: (v: 'weekly' | 'monthly') => void;
  setWeekStartDay: (v: number) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setShowScheduleInLog: (v: boolean) => void;
  setShowDescriptionsInLog: (v: boolean) => void;
  setUseCustomAppName: (v: boolean) => void;
  setAppName: (v: string) => void;
  setHasUnsavedExport: (v: boolean) => void;
  setSeenBadges: (names: string[]) => void;

  // Actions
  toggleCompletion: (exerciseId: string, dateStr: string) => void;
  updateExerciseDescription: (exerciseId: string, description: string) => void;
}

const initHasUnsavedExport = (): boolean => {
  try {
    const lastExport = localStorage.getItem('lastExportDate');
    const lastChange = localStorage.getItem('lastChangeDate');
    if (!lastExport) return false;
    if (lastChange) return new Date(lastChange) > new Date(lastExport);
  } catch { /* ignore */ }
  return false;
};

export const useAppStore = create<AppState>()((set) => ({
  exercises: readLS<Record<string, Exercise[]>>('exerciseList') ?? createDefaultExercises(),
  weeklySchedule: readLS<WeeklySchedule>('weeklySchedule') ?? {},
  completions: readLS<Record<string, boolean>>('exerciseCompletions') ?? {},
  exerciseDescriptions: readLS<Record<string, string>>('exerciseDescriptions') ?? {},
  exerciseGoals: readLS<ExerciseGoals>('exerciseGoals') ?? {},
  goalSettings: readSetting<GoalSettings>('goalSettings', DEFAULT_GOAL_SETTINGS),
  darkMode: readSetting<boolean>('darkMode', false),
  defaultChartMode: readSetting<'weekly' | 'monthly'>('defaultChartMode', 'weekly'),
  chartMode: readSetting<'weekly' | 'monthly'>('defaultChartMode', 'weekly'),
  weekStartDay: readSetting<number>('weekStartDay', 1),
  animationsEnabled: readSetting<boolean>('animationsEnabled', true),
  showScheduleInLog: readSetting<boolean>('showScheduleInLog', true),
  showDescriptionsInLog: readSetting<boolean>('showDescriptionsInLog', true),
  useCustomAppName: readSetting<boolean>('useCustomAppName', false),
  appName: readSetting<string>('appName', 'Fitness Tracker'),
  hasUnsavedExport: initHasUnsavedExport(),
  seenBadges: readLS<string[]>('seenBadges') ?? [],

  setExercises: (v) => set(s => ({ exercises: applyUpdater(s.exercises, v) })),
  setCompletions: (v) => set(s => ({ completions: applyUpdater(s.completions, v) })),
  setExerciseDescriptions: (v) => set(s => ({ exerciseDescriptions: applyUpdater(s.exerciseDescriptions, v) })),
  setExerciseGoals: (v) => set(s => ({ exerciseGoals: applyUpdater(s.exerciseGoals, v) })),
  setGoalSettings: (v) => set(s => ({ goalSettings: applyUpdater(s.goalSettings, v) })),
  setWeeklySchedule: (v) => set(s => ({ weeklySchedule: applyUpdater(s.weeklySchedule, v) })),
  setDarkMode: (v) => set({ darkMode: v }),
  setDefaultChartMode: (v) => set({ defaultChartMode: v, chartMode: v }),
  setChartMode: (v) => set({ chartMode: v }),
  setWeekStartDay: (v) => set({ weekStartDay: v }),
  setAnimationsEnabled: (v) => set({ animationsEnabled: v }),
  setShowScheduleInLog: (v) => set({ showScheduleInLog: v }),
  setShowDescriptionsInLog: (v) => set({ showDescriptionsInLog: v }),
  setUseCustomAppName: (v) => set({ useCustomAppName: v }),
  setAppName: (v) => set({ appName: v }),
  setHasUnsavedExport: (v) => set({ hasUnsavedExport: v }),
  setSeenBadges: (names) => set({ seenBadges: names }),

  toggleCompletion: (exerciseId, dateStr) => {
    const key = `${exerciseId}-${dateStr}`;
    set(s => ({ completions: { ...s.completions, [key]: !s.completions[key] }, hasUnsavedExport: true }));
  },

  updateExerciseDescription: (exerciseId, description) => {
    set(s => {
      const next = { ...s.exerciseDescriptions };
      if (description) next[exerciseId] = description;
      else delete next[exerciseId];
      return { exerciseDescriptions: next, hasUnsavedExport: true };
    });
  },
}));
