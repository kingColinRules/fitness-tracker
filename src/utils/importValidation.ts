function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(item => typeof item === 'string');
}

export function validateImportData(parsed: unknown): { valid: true } | { valid: false; error: string } {
  if (!isPlainObject(parsed)) return { valid: false, error: 'File must contain a JSON object.' };

  // Required fields
  if (!('version' in parsed)) return { valid: false, error: 'Missing required field: version.' };
  if (!('exercises' in parsed)) return { valid: false, error: 'Missing required field: exercises.' };
  if (!('completions' in parsed)) return { valid: false, error: 'Missing required field: completions.' };

  // exercises: Record<string, string[]>
  const exercises = parsed.exercises;
  if (!isPlainObject(exercises))
    return { valid: false, error: 'Field "exercises" must be an object.' };
  for (const [cat, exList] of Object.entries(exercises)) {
    if (!isStringArray(exList))
      return { valid: false, error: `exercises["${cat}"] must be an array of strings.` };
  }

  // completions: Record<string, boolean>
  const completions = parsed.completions;
  if (!isPlainObject(completions))
    return { valid: false, error: 'Field "completions" must be an object.' };
  for (const [key, val] of Object.entries(completions)) {
    if (typeof val !== 'boolean')
      return { valid: false, error: `completions["${key}"] must be a boolean.` };
  }

  // goalSettings (optional): Record<string, { enabled: boolean; required: number }>
  if ('goalSettings' in parsed) {
    const gs = parsed.goalSettings;
    if (!isPlainObject(gs))
      return { valid: false, error: 'Field "goalSettings" must be an object.' };
    for (const [cat, val] of Object.entries(gs)) {
      if (!isPlainObject(val))
        return { valid: false, error: `goalSettings["${cat}"] must be an object.` };
      if (typeof val.enabled !== 'boolean')
        return { valid: false, error: `goalSettings["${cat}"].enabled must be a boolean.` };
      if (typeof val.required !== 'number' || !isFinite(val.required))
        return { valid: false, error: `goalSettings["${cat}"].required must be a number.` };
    }
  }

  // exerciseDescriptions (optional): Record<string, string>
  if ('exerciseDescriptions' in parsed) {
    const ed = parsed.exerciseDescriptions;
    if (!isPlainObject(ed))
      return { valid: false, error: 'Field "exerciseDescriptions" must be an object.' };
    for (const [key, val] of Object.entries(ed)) {
      if (typeof val !== 'string')
        return { valid: false, error: `exerciseDescriptions["${key}"] must be a string.` };
    }
  }

  // weeklySchedule (optional): Record<string, { category: string; name: string }[]>
  if ('weeklySchedule' in parsed) {
    const ws = parsed.weeklySchedule;
    if (!isPlainObject(ws))
      return { valid: false, error: 'Field "weeklySchedule" must be an object.' };
    for (const [day, items] of Object.entries(ws)) {
      if (!Array.isArray(items))
        return { valid: false, error: `weeklySchedule["${day}"] must be an array.` };
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!isPlainObject(item) || typeof item.category !== 'string' || typeof item.name !== 'string')
          return { valid: false, error: `weeklySchedule["${day}"][${i}] must have string "category" and "name".` };
      }
    }
  }

  // exerciseGoals (optional): Record<string, { override: boolean; required: number }>
  if ('exerciseGoals' in parsed) {
    const eg = parsed.exerciseGoals;
    if (!isPlainObject(eg))
      return { valid: false, error: 'Field "exerciseGoals" must be an object.' };
    for (const [key, val] of Object.entries(eg)) {
      if (!isPlainObject(val))
        return { valid: false, error: `exerciseGoals["${key}"] must be an object.` };
      if (typeof val.override !== 'boolean')
        return { valid: false, error: `exerciseGoals["${key}"].override must be a boolean.` };
      if (typeof val.required !== 'number' || !isFinite(val.required))
        return { valid: false, error: `exerciseGoals["${key}"].required must be a number.` };
    }
  }

  // preferences (optional)
  if ('preferences' in parsed) {
    const p = parsed.preferences;
    if (!isPlainObject(p))
      return { valid: false, error: 'Field "preferences" must be an object.' };
    const boolFields = ['darkMode', 'compactView', 'animationsEnabled', 'showScheduleInLog', 'useCustomAppName'] as const;
    for (const field of boolFields) {
      if (field in p && typeof p[field] !== 'boolean')
        return { valid: false, error: `preferences.${field} must be a boolean.` };
    }
    if ('weekStartDay' in p && (typeof p.weekStartDay !== 'number' || !Number.isInteger(p.weekStartDay) || p.weekStartDay < 0 || p.weekStartDay > 6))
      return { valid: false, error: 'preferences.weekStartDay must be an integer 0–6.' };
    if ('defaultChartMode' in p && p.defaultChartMode !== 'weekly' && p.defaultChartMode !== 'monthly')
      return { valid: false, error: 'preferences.defaultChartMode must be "weekly" or "monthly".' };
    if ('appName' in p && typeof p.appName !== 'string')
      return { valid: false, error: 'preferences.appName must be a string.' };
    if ('seenBadges' in p && !isStringArray(p.seenBadges))
      return { valid: false, error: 'preferences.seenBadges must be an array of strings.' };
  }

  return { valid: true };
}
