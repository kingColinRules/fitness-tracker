import { create } from 'zustand';
import { DEFAULT_EXERCISES } from './constants';

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

export type ExerciseGoals = Record<string, { override: boolean; required: number; disabled?: boolean }>;
export type GoalSettings = Record<string, { enabled: boolean; required: number }>;
export type WeeklyScheduleEntry = { category: string; name: string };
export type WeeklySchedule = Record<string, WeeklyScheduleEntry[]>;

const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  weight: { enabled: true, required: 3 },
  isometric: { enabled: true, required: 2 },
  stretch: { enabled: true, required: 2 },
};

interface AppState {
  // Data
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  exerciseDescriptions: Record<string, string>;
  exerciseGoals: ExerciseGoals;
  goalSettings: GoalSettings;
  weeklySchedule: WeeklySchedule;

  // Settings
  darkMode: boolean;
  compactView: boolean;
  defaultChartMode: 'weekly' | 'monthly';
  chartMode: 'weekly' | 'monthly';
  weekStartDay: number;
  animationsEnabled: boolean;
  showScheduleInLog: boolean;
  useCustomAppName: boolean;
  appName: string;

  // App state
  hasUnsavedExport: boolean;
  seenBadges: string[];

  // Setters
  setExercises: (v: Updater<Record<string, string[]>>) => void;
  setCompletions: (v: Updater<Record<string, boolean>>) => void;
  setExerciseDescriptions: (v: Updater<Record<string, string>>) => void;
  setExerciseGoals: (v: Updater<ExerciseGoals>) => void;
  setGoalSettings: (v: Updater<GoalSettings>) => void;
  setWeeklySchedule: (v: Updater<WeeklySchedule>) => void;
  setDarkMode: (v: boolean) => void;
  setCompactView: (v: boolean) => void;
  setDefaultChartMode: (v: 'weekly' | 'monthly') => void;
  setChartMode: (v: 'weekly' | 'monthly') => void;
  setWeekStartDay: (v: number) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setShowScheduleInLog: (v: boolean) => void;
  setUseCustomAppName: (v: boolean) => void;
  setAppName: (v: string) => void;
  setHasUnsavedExport: (v: boolean) => void;
  setSeenBadges: (names: string[]) => void;

  // Actions
  toggleCompletion: (category: string, exercise: string, dateStr: string) => void;
  updateExerciseDescription: (category: string, exercise: string, description: string) => void;
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
  exercises: readLS<Record<string, string[]>>('exerciseList') ?? DEFAULT_EXERCISES,
  weeklySchedule: readLS<WeeklySchedule>('weeklySchedule') ?? {},
  completions: readLS<Record<string, boolean>>('exerciseCompletions') ?? {},
  exerciseDescriptions: readLS<Record<string, string>>('exerciseDescriptions') ?? {},
  exerciseGoals: readLS<ExerciseGoals>('exerciseGoals') ?? {},
  goalSettings: readSetting<GoalSettings>('goalSettings', DEFAULT_GOAL_SETTINGS),
  darkMode: readSetting<boolean>('darkMode', false),
  compactView: readSetting<boolean>('compactView', false),
  defaultChartMode: readSetting<'weekly' | 'monthly'>('defaultChartMode', 'weekly'),
  chartMode: readSetting<'weekly' | 'monthly'>('defaultChartMode', 'weekly'),
  weekStartDay: readSetting<number>('weekStartDay', 1),
  animationsEnabled: readSetting<boolean>('animationsEnabled', true),
  showScheduleInLog: readSetting<boolean>('showScheduleInLog', true),
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
  setCompactView: (v) => set({ compactView: v }),
  setDefaultChartMode: (v) => set({ defaultChartMode: v, chartMode: v }),
  setChartMode: (v) => set({ chartMode: v }),
  setWeekStartDay: (v) => set({ weekStartDay: v }),
  setAnimationsEnabled: (v) => set({ animationsEnabled: v }),
  setShowScheduleInLog: (v) => set({ showScheduleInLog: v }),
  setUseCustomAppName: (v) => set({ useCustomAppName: v }),
  setAppName: (v) => set({ appName: v }),
  setHasUnsavedExport: (v) => set({ hasUnsavedExport: v }),
  setSeenBadges: (names) => set({ seenBadges: names }),

  toggleCompletion: (category, exercise, dateStr) => {
    const key = `${category}-${exercise}-${dateStr}`;
    set(s => ({ completions: { ...s.completions, [key]: !s.completions[key] }, hasUnsavedExport: true }));
  },

  updateExerciseDescription: (category, exercise, description) => {
    set(s => {
      const key = `${category}-${exercise}`;
      const next = { ...s.exerciseDescriptions };
      if (description) next[key] = description;
      else delete next[key];
      return { exerciseDescriptions: next, hasUnsavedExport: true };
    });
  },
}));
