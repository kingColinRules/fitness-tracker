export const isCompleted = (
  completions: Record<string, boolean>,
  category: string,
  exercise: string,
  dateStr: string,
): boolean => completions[`${category}-${exercise}-${dateStr}`] || false;
