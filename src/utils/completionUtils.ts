export const isCompleted = (
  completions: Record<string, boolean>,
  exerciseId: string,
  dateStr: string,
): boolean => completions[`${exerciseId}-${dateStr}`] || false;
