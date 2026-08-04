import type { Exercise } from './types';
import { generateId } from './utils/id';

export const APP_NAME = 'Fitness Tracker';

export const DEFAULT_EXERCISES: Record<string, string[]> = {
  Weight: ['Bench Press', 'Squats', 'Deadlifts', 'Overhead Press', 'Rows'],
  Cardio: ['Running', 'Cycling', 'Rowing', 'Swimming'],
  Stretch: ['Hamstring Stretch', 'Quad Stretch', 'Shoulder Stretch', 'Hip Flexor Stretch'],
};

export function createDefaultExercises(): Record<string, Exercise[]> {
  return Object.fromEntries(
    Object.entries(DEFAULT_EXERCISES).map(([cat, names]) => [cat, names.map(name => ({ id: generateId(), name }))])
  );
}
