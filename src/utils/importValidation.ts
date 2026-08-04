function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(item => typeof item === 'string');
}

type ValidationResult = { valid: true } | { valid: false; error: string };

function validateCommonFields(parsed: Record<string, unknown>): ValidationResult | null {
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
    const boolFields = ['darkMode', 'animationsEnabled', 'showScheduleInLog', 'showDescriptionsInLog', 'useCustomAppName'] as const;
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

  return null;
}

// Frozen forever — validates the pre-id-migration export shape (`exercises` as plain name strings,
// `weeklySchedule` entries as `{category, name}`). A file exported before the stable-id migration
// can be imported at any point in the future, so this validator's shape checks must never change.
function validateLegacyImportData(parsed: Record<string, unknown>): ValidationResult {
  if (!('exercises' in parsed)) return { valid: false, error: 'Missing required field: exercises.' };
  if (!('completions' in parsed)) return { valid: false, error: 'Missing required field: completions.' };

  const exercises = parsed.exercises;
  if (!isPlainObject(exercises))
    return { valid: false, error: 'Field "exercises" must be an object.' };
  for (const [cat, exList] of Object.entries(exercises)) {
    if (!isStringArray(exList))
      return { valid: false, error: `exercises["${cat}"] must be an array of strings.` };
  }

  const common = validateCommonFields(parsed);
  if (common) return common;

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

  return { valid: true };
}

// Validates the current (post-id-migration) export shape: `exercises` as `{id, name}[]`,
// `weeklySchedule` entries as `{exerciseId}`.
export function validateCurrentImportData(parsed: Record<string, unknown>): ValidationResult {
  if (!('exercises' in parsed)) return { valid: false, error: 'Missing required field: exercises.' };
  if (!('completions' in parsed)) return { valid: false, error: 'Missing required field: completions.' };

  const exercises = parsed.exercises;
  if (!isPlainObject(exercises))
    return { valid: false, error: 'Field "exercises" must be an object.' };
  for (const [cat, exList] of Object.entries(exercises)) {
    if (!Array.isArray(exList))
      return { valid: false, error: `exercises["${cat}"] must be an array.` };
    for (let i = 0; i < exList.length; i++) {
      const ex = exList[i];
      if (!isPlainObject(ex) || typeof ex.id !== 'string' || typeof ex.name !== 'string')
        return { valid: false, error: `exercises["${cat}"][${i}] must have string "id" and "name".` };
    }
  }

  const common = validateCommonFields(parsed);
  if (common) return common;

  if ('weeklySchedule' in parsed) {
    const ws = parsed.weeklySchedule;
    if (!isPlainObject(ws))
      return { valid: false, error: 'Field "weeklySchedule" must be an object.' };
    for (const [day, items] of Object.entries(ws)) {
      if (!Array.isArray(items))
        return { valid: false, error: `weeklySchedule["${day}"] must be an array.` };
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!isPlainObject(item) || typeof item.exerciseId !== 'string')
          return { valid: false, error: `weeklySchedule["${day}"][${i}] must have a string "exerciseId".` };
      }
    }
  }

  return { valid: true };
}

export function validateImportData(parsed: unknown): ValidationResult {
  if (!isPlainObject(parsed)) return { valid: false, error: 'File must contain a JSON object.' };
  if (!('version' in parsed)) return { valid: false, error: 'Missing required field: version.' };
  const version = parsed.version;
  if (version === 1) return validateLegacyImportData(parsed);
  if (version === 2) return validateCurrentImportData(parsed);
  return { valid: false, error: `Unsupported version: ${String(version)}.` };
}
