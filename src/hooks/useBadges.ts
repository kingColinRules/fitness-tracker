import { useMemo } from 'react';
import { useAppStore } from '../store';
import { localDateStr, formatDateKey, startOfWeek } from '../utils/dateUtils';

export interface Badge {
  name: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
  unit: string;
}

export interface BadgeGroup {
  title: string;
  badges: Badge[];
}

export function useBadges() {
  const { completions, exercises, exerciseGoals, goalSettings, weekStartDay, seenBadges } = useAppStore();

  const activeDateSet = useMemo(() => {
    const set = new Set<string>();
    Object.entries(completions).forEach(([key, completed]) => {
      if (completed) set.add(key.slice(-10));
    });
    return set;
  }, [completions]);

  const allTimeCompletions = useMemo(
    () => Object.values(completions).filter(Boolean).length,
    [completions]
  );

  const allTimeActiveDays = activeDateSet.size;

  const bestStreak = useMemo(() => {
    const sorted = Array.from(activeDateSet).sort();
    let best = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const ds of sorted) {
      const d = new Date(ds + 'T00:00:00');
      if (prev) {
        const diff = Math.round((d.getTime() - prev.getTime()) / 86400000);
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > best) best = run;
      prev = d;
    }
    return best;
  }, [activeDateSet]);

  const cumulativeGoalsMet = useMemo(() => {
    const enabledCats = Object.entries(goalSettings).filter(([, gs]) => gs.enabled);
    if (enabledCats.length === 0 || activeDateSet.size === 0) return 0;

    const weekStarts = new Set<string>();
    for (const ds of activeDateSet) {
      const d = new Date(ds + 'T00:00:00');
      weekStarts.add(localDateStr(startOfWeek(d, weekStartDay)));
    }

    let count = 0;
    for (const wsStr of weekStarts) {
      const weekStart = new Date(wsStr + 'T00:00:00');
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      });

      for (const [cat, gs] of enabledCats) {
        for (const ex of (exercises[cat] ?? [])) {
          const eg = exerciseGoals[ex.id];
          if (eg?.disabled) continue;
          const required = (eg?.override && !eg?.disabled) ? eg.required : gs.required;
          const exCount = weekDates.reduce(
            (sum, d) => sum + (completions[`${ex.id}-${formatDateKey(d)}`] ? 1 : 0),
            0
          );
          if (exCount >= required) count++;
        }
      }
    }
    return count;
  }, [goalSettings, exercises, exerciseGoals, completions, activeDateSet, weekStartDay]);

  const badgeGroups: BadgeGroup[] = useMemo(() => [
    {
      title: '🔥 Streaks',
      badges: [
        { name: '3-Day Streak',  icon: '🔥', earned: bestStreak >= 3,  progress: Math.min(bestStreak, 3),  target: 3,  unit: 'days' },
        { name: '7-Day Streak',  icon: '🔥', earned: bestStreak >= 7,  progress: Math.min(bestStreak, 7),  target: 7,  unit: 'days' },
        { name: '14-Day Streak', icon: '🔥', earned: bestStreak >= 14, progress: Math.min(bestStreak, 14), target: 14, unit: 'days' },
        { name: '30-Day Streak', icon: '🔥', earned: bestStreak >= 30, progress: Math.min(bestStreak, 30), target: 30, unit: 'days' },
      ],
    },
    {
      title: '🏆 Completion Milestones',
      badges: [
        { name: '50 Completions',  icon: '🏅', earned: allTimeCompletions >= 50,  progress: allTimeCompletions, target: 50,  unit: 'completions' },
        { name: '100 Completions', icon: '🥈', earned: allTimeCompletions >= 100, progress: allTimeCompletions, target: 100, unit: 'completions' },
        { name: '250 Completions', icon: '🥇', earned: allTimeCompletions >= 250, progress: allTimeCompletions, target: 250, unit: 'completions' },
        { name: '500 Completions', icon: '🏆', earned: allTimeCompletions >= 500, progress: allTimeCompletions, target: 500, unit: 'completions' },
      ],
    },
    {
      title: '📅 Active Days',
      badges: [
        { name: '10 Active Days',  icon: '📆', earned: allTimeActiveDays >= 10,  progress: allTimeActiveDays, target: 10,  unit: 'days' },
        { name: '30 Active Days',  icon: '📆', earned: allTimeActiveDays >= 30,  progress: allTimeActiveDays, target: 30,  unit: 'days' },
        { name: '60 Active Days',  icon: '📆', earned: allTimeActiveDays >= 60,  progress: allTimeActiveDays, target: 60,  unit: 'days' },
        { name: '100 Active Days', icon: '📆', earned: allTimeActiveDays >= 100, progress: allTimeActiveDays, target: 100, unit: 'days' },
      ],
    },
    {
      title: '🎯 Goals',
      badges: [
        { name: '25 Goals Met',  icon: '🎯', earned: cumulativeGoalsMet >= 25,  progress: cumulativeGoalsMet, target: 25,  unit: 'goals' },
        { name: '100 Goals Met', icon: '🎯', earned: cumulativeGoalsMet >= 100, progress: cumulativeGoalsMet, target: 100, unit: 'goals' },
        { name: '250 Goals Met', icon: '🎯', earned: cumulativeGoalsMet >= 250, progress: cumulativeGoalsMet, target: 250, unit: 'goals' },
        { name: '500 Goals Met', icon: '🎯', earned: cumulativeGoalsMet >= 500, progress: cumulativeGoalsMet, target: 500, unit: 'goals' },
      ],
    },
  ], [bestStreak, allTimeCompletions, allTimeActiveDays, cumulativeGoalsMet]);

  const earnedBadgeNames = useMemo(
    () => badgeGroups.flatMap(g => g.badges.filter(b => b.earned).map(b => b.name)),
    [badgeGroups]
  );

  const seenSet = useMemo(() => new Set(seenBadges), [seenBadges]);

  const newBadgeNames = useMemo(
    () => new Set(earnedBadgeNames.filter(n => !seenSet.has(n))),
    [earnedBadgeNames, seenSet]
  );

  return {
    badgeGroups,
    earnedBadgeNames,
    newBadgeNames,
    hasNewBadges: newBadgeNames.size > 0,
    bestStreak,
    allTimeCompletions,
    allTimeActiveDays,
    cumulativeGoalsMet,
  };
}
