export interface Exercise {
  id: string;
  name: string;
}

export type ExerciseGoals = Record<string, { override: boolean; required: number; disabled?: boolean; createdAt?: string }>;
export type GoalSettings = Record<string, { enabled: boolean; required: number; createdAt?: string }>;
export type WeeklyScheduleEntry = { exerciseId: string };
export type WeeklySchedule = Record<string, WeeklyScheduleEntry[]>;
