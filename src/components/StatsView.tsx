import React, { useMemo } from 'react';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { formatDateKey, localDateStr, generateWeekDates, startOfWeek } from '../utils/dateUtils';
import { useAppStore } from '../store';

interface StatsViewProps {
  weekStartDate: Date;
  dates: Date[];
  selectedMonth: number;
  selectedYear: number;
}

const countDay = (
  completions: Record<string, boolean>,
  exercises: Record<string, string[]>,
  dateStr: string,
): number =>
  Object.keys(exercises).reduce(
    (sum, cat) => sum + exercises[cat].filter(ex => completions[`${cat}-${ex}-${dateStr}`]).length,
    0,
  );

const getWeeksInMonth = (year: number, month: number, weekStartDay: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: Date[] = [];
  const current = new Date(startOfWeek(firstDay, weekStartDay));
  while (current <= lastDay) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

interface StatCardProps {
  label: string;
  value: string | number;
  sparkData: number[];
  color: string;
  plotType?: 'line' | 'bar';
  tooltip?: string;
  sparkDescription?: string;
  sparkValueFormatter?: (value: number | null) => string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sparkData, color, plotType = 'line', tooltip, sparkDescription, sparkValueFormatter }) => (
  <Tooltip title={tooltip ?? ''} placement="bottom" arrow>
  <Box
    sx={{
      flex: { xs: '1 1 calc(50% - 8px)', md: 1 },
      minWidth: 0,
      borderRadius: 2,
      borderTop: `3px solid ${color}`,
      boxShadow: 2,
      p: 2,
      backgroundColor: 'background.paper',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
      transition: 'box-shadow 0.15s ease',
      '&:hover': { boxShadow: 4 },
    }}
  >
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, whiteSpace: 'nowrap' }}>
        {String(value).includes('/') ? (() => {
          const [num, denom] = String(value).split('/').map(s => s.trim());
          return (
            <>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>{num}</Typography>
              <Typography sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '1.1rem' }}>/ {denom}</Typography>
            </>
          );
        })() : (
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
        )}
      </Box>
      {sparkData.length >= 2 ? (
        <Box sx={{ overflow: 'visible' }}>
          <SparkLineChart
            data={sparkData}
            height={50}
            width={120}
            color={color}
            plotType={plotType}
            curve="monotoneX"
            showTooltip
            showHighlight
            valueFormatter={sparkValueFormatter}
            margin={{ top: 8, bottom: 4, left: 4, right: 4 }}
          />
        </Box>
      ) : (
        <Box sx={{ width: 120, height: 50 }} />
      )}
    </Box>
  </Box>
  </Tooltip>
);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StatsView: React.FC<StatsViewProps> = ({
  weekStartDate,
  dates,
  selectedMonth,
  selectedYear,
}) => {
  const { exercises, completions, goalSettings, exerciseGoals, chartMode, weekStartDay } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const categories = Object.keys(exercises);
  const isWeekly = chartMode === 'weekly';
  const totalExercises = useMemo(() => Object.values(exercises).reduce((sum, exs) => sum + exs.length, 0), [exercises]);

  const weekDates = useMemo(() => generateWeekDates(weekStartDate), [weekStartDate]);

  const todayStr = localDateStr(new Date());

  // Weekly per-day totals
  const weekDailyTotals = useMemo(
    () => weekDates.map(d => countDay(completions, exercises, formatDateKey(d))),
    [weekDates, completions, exercises],
  );
  const weekTotal = weekDailyTotals.reduce((a, b) => a + b, 0);
  const weekActiveDays = weekDailyTotals.filter(n => n > 0).length;
  const weekSparkTotals = useMemo(
    () => weekDates.filter(d => localDateStr(d) <= todayStr).map(d => countDay(completions, exercises, formatDateKey(d))),
    [weekDates, completions, exercises, todayStr],
  );
  const weekActiveSparkData = weekSparkTotals.map(n => (n > 0 ? 1 : 0));
  const weekCumulativeTotals = weekSparkTotals.reduce<number[]>((acc, v) => { acc.push((acc[acc.length - 1] ?? 0) + v); return acc; }, []);

  // Monthly per-day totals
  const monthDailyTotals = useMemo(
    () => dates.map(d => countDay(completions, exercises, formatDateKey(d))),
    [dates, completions, exercises],
  );
  const monthTotal = monthDailyTotals.reduce((a, b) => a + b, 0);
  const activeDays = monthDailyTotals.filter(n => n > 0).length;
  const monthSparkTotals = useMemo(
    () => dates.filter(d => localDateStr(d) <= todayStr).map(d => countDay(completions, exercises, formatDateKey(d))),
    [dates, completions, exercises, todayStr],
  );
  const monthActiveSparkData = monthSparkTotals.map(n => (n > 0 ? 1 : 0));
  const monthCumulativeTotals = monthSparkTotals.reduce<number[]>((acc, v) => { acc.push((acc[acc.length - 1] ?? 0) + v); return acc; }, []);

  const daysElapsed = isWeekly ? weekSparkTotals.length : monthSparkTotals.length;

  // Main stacked bar chart
  const periodDates = isWeekly ? weekDates : dates;

  // Longest consecutive streak within the selected period (up to today)
  const { bestStreak, streakSparkData } = useMemo(() => {
    let best = 0;
    let current = 0;
    const sparkData: number[] = [];
    for (const d of periodDates) {
      if (localDateStr(d) > todayStr) break;
      const hasAny = Object.keys(exercises).some(cat =>
        exercises[cat].some(ex => completions[`${cat}-${ex}-${formatDateKey(d)}`]),
      );
      if (hasAny) { best = Math.max(best, ++current); sparkData.push(current); }
      else if (localDateStr(d) === todayStr) break;
      else { current = 0; sparkData.push(0); }
    }
    return { bestStreak: best, streakSparkData: sparkData };
  }, [periodDates, exercises, completions, todayStr]);
  const mainXLabels = periodDates.map(d =>
    isWeekly ? DAY_NAMES[d.getDay()] : String(d.getDate()),
  );
  const mainSeries = useMemo(
    () =>
      categories.map((cat) => ({
        data: periodDates.map(d => {
          const dateStr = formatDateKey(d);
          return exercises[cat].filter(ex => completions[`${cat}-${ex}-${dateStr}`]).length;
        }),
        label: cat,
        stack: 'total',
      })),
    [periodDates, categories, exercises, completions],
  );

  // Gauge — per-exercise, using override goal if set, else category default
  const { gaugeValue, gaugeNote } = useMemo(() => {
    const enabledCats = Object.entries(goalSettings).filter(([cat, g]) => g.enabled && exercises[cat]);
    if (enabledCats.length === 0) return { gaugeValue: 0, gaugeNote: '' };

    const getGoal = (cat: string, ex: string, catRequired: number, periodStart: string) => {
      const eg = exerciseGoals[`${cat}-${ex}`];
      if (eg?.disabled) return null;
      if (eg?.override) {
        if (eg.createdAt && eg.createdAt > periodStart) return null;
        return eg.required;
      }
      const catGoal = goalSettings[cat];
      if (catGoal?.createdAt && catGoal.createdAt > periodStart) return null;
      return catRequired;
    };

    if (isWeekly) {
      const periodStart = formatDateKey(weekDates[0]);
      let total = 0;
      let met = 0;
      enabledCats.forEach(([cat, goal]) => {
        exercises[cat].forEach(ex => {
          const required = getGoal(cat, ex, goal.required, periodStart);
          if (required === null) return;
          const count = weekDates.reduce((sum, d) =>
            sum + (completions[`${cat}-${ex}-${formatDateKey(d)}`] ? 1 : 0), 0);
          total++;
          if (count >= required) met++;
        });
      });
      return {
        gaugeValue: total > 0 ? Math.round((met / total) * 100) : 0,
        gaugeNote: `${met} of ${total} Completed`,
      };
    } else {
      const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth, weekStartDay);
      let total = 0;
      let met = 0;
      weeksInMonth.forEach(weekStart => {
        const wDates = generateWeekDates(weekStart);
        const daysInMonth = wDates.filter(d => d.getMonth() === selectedMonth && d.getFullYear() === selectedYear).length;
        if (daysInMonth < 7) return;
        const weekPeriodStart = formatDateKey(weekStart);
        enabledCats.forEach(([cat, goal]) => {
          exercises[cat].forEach(ex => {
            const required = getGoal(cat, ex, goal.required, weekPeriodStart);
            if (required === null) return;
            const count = wDates.reduce((sum, d) =>
              sum + (completions[`${cat}-${ex}-${formatDateKey(d)}`] ? 1 : 0), 0);
            total++;
            if (count >= required) met++;
          });
        });
      });
      return {
        gaugeValue: total > 0 ? Math.round((met / total) * 100) : 0,
        gaugeNote: `${met} of ${total} Completed`,
      };
    }
  }, [goalSettings, exerciseGoals, exercises, completions, weekDates, isWeekly, selectedYear, selectedMonth, weekStartDay]);

  // Right-panel bottom — by category for the current period
  const categoryPeriodData = useMemo(
    () =>
      categories.map(cat =>
        periodDates.reduce((sum, d) => {
          const dateStr = formatDateKey(d);
          return sum + exercises[cat].filter(ex => completions[`${cat}-${ex}-${dateStr}`]).length;
        }, 0),
      ),
    [categories, periodDates, exercises, completions],
  );

  const categoryGoalTotals = useMemo(() => {
    const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth, weekStartDay);
    const fullWeeks = weeksInMonth.filter(weekStart => {
      const wDates = generateWeekDates(weekStart);
      return wDates.filter(d => d.getMonth() === selectedMonth && d.getFullYear() === selectedYear).length === 7;
    }).length;
    const periodStart = isWeekly
      ? formatDateKey(weekDates[0])
      : formatDateKey(new Date(selectedYear, selectedMonth, 1));
    return categories.map(cat => {
      const catGoal = goalSettings[cat];
      if (!catGoal?.enabled || (catGoal.createdAt && catGoal.createdAt > periodStart)) return exercises[cat].length * periodDates.length;
      return exercises[cat].reduce((sum, ex) => {
        const eg = exerciseGoals[`${cat}-${ex}`];
        if (eg?.disabled) return sum;
        if (eg?.override) {
          if (eg.createdAt && eg.createdAt > periodStart) return sum;
          return sum + (isWeekly ? eg.required : eg.required * fullWeeks);
        }
        return sum + (isWeekly ? catGoal.required : catGoal.required * fullWeeks);
      }, 0);
    });
  }, [categories, goalSettings, exerciseGoals, exercises, isWeekly, selectedYear, selectedMonth, weekStartDay, periodDates]);

  const totalGoalTarget = categoryGoalTotals.reduce((a, b) => a + b, 0);

  const goalsConfigured = Object.values(goalSettings).some(g => g.enabled);

  const { onTrackValue, onTrackNote } = useMemo(() => {
    if (!goalsConfigured || totalGoalTarget === 0 || daysElapsed === 0) return { onTrackValue: 0, onTrackNote: '' };
    const periodLength = isWeekly ? 7 : dates.length;
    const timeElapsedRatio = daysElapsed / periodLength;
    const total = isWeekly ? weekTotal : monthTotal;
    const expected = Math.round(totalGoalTarget * timeElapsedRatio);
    const pace = expected === 0 ? 100 : Math.round((total / (totalGoalTarget * timeElapsedRatio)) * 100);
    return { onTrackValue: pace, onTrackNote: `${total} exercise${total !== 1 ? 's' : ''} done, ${expected} expected` };
  }, [goalsConfigured, totalGoalTarget, daysElapsed, isWeekly, dates.length, weekTotal, monthTotal]);


  const scoreSparkData = useMemo(() => {
    const dailyTotals = isWeekly ? weekSparkTotals : monthSparkTotals;

    const periodStart = isWeekly
      ? formatDateKey(weekDates[0])
      : formatDateKey(new Date(selectedYear, selectedMonth, 1));
    let totalGoal = 0;
    if (goalsConfigured) {
      Object.entries(goalSettings).forEach(([cat, goal]) => {
        if (!goal.enabled || !exercises[cat]) return;
        if (goal.createdAt && goal.createdAt > periodStart) return;
        exercises[cat].forEach(ex => {
          const eg = exerciseGoals[`${cat}-${ex}`];
          if (eg?.disabled) return;
          if (eg?.override) {
            if (eg.createdAt && eg.createdAt > periodStart) return;
            totalGoal += eg.required;
          } else {
            totalGoal += goal.required;
          }
        });
      });
    }

    let runningCompletions = 0;
    let runningActiveDays = 0;
    return dailyTotals.map((count, i) => {
      runningCompletions += count;
      if (count > 0) runningActiveDays++;
      const daysElapsed = i + 1;
      const activeDaysPct = (runningActiveDays / daysElapsed) * 100;
      if (goalsConfigured) {
        const volumePct = totalGoal > 0
          ? Math.min((runningCompletions / totalGoal) * 100, 100)
          : 0;
        return Math.round(gaugeValue * 0.5 + volumePct * 0.5);
      }
      return Math.round(activeDaysPct);
    });
  }, [isWeekly, weekSparkTotals, monthSparkTotals, goalSettings, exerciseGoals, exercises, gaugeValue, goalsConfigured, weekDates, selectedYear, selectedMonth]);

  const overallScore = scoreSparkData.at(-1) ?? 0;


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stat cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label="Exercises Completed"
          value={`${isWeekly ? weekTotal : monthTotal} / ${totalGoalTarget}`}
          sparkData={isWeekly ? weekCumulativeTotals : monthCumulativeTotals}
          color={theme.palette.primary.main}
          tooltip={goalsConfigured ? "Exercises completed vs. total goal target for the period (sum of all exercise goals)" : "Exercises completed vs. total possible sessions in the period (exercises × days)"}
          sparkDescription="Cumulative exercises completed so far"
          sparkValueFormatter={v => `${v ?? 0} exercise${v !== 1 ? 's' : ''} done`}
        />
        <StatCard
          label="Active Days"
          value={isWeekly ? `${weekActiveDays} / 7` : `${activeDays} / ${dates.length}`}
          sparkData={isWeekly ? weekActiveSparkData : monthActiveSparkData}
          plotType="bar"
          color={theme.palette.success.main}
          tooltip="Days where at least one exercise was completed, out of total days in the period"
          sparkDescription="Active days — 1 means at least one exercise was completed"
          sparkValueFormatter={v => (v ? 'Active' : 'Rest day')}
        />
        <StatCard
          label="Longest Streak"
          value={bestStreak}
          sparkData={streakSparkData}
          color={theme.palette.warning.main}
          tooltip="Longest run of consecutive active days within the selected period — resets on any day with no completions"
          sparkDescription="Running streak length — resets to 0 on any day with no activity"
          sparkValueFormatter={v => (v ? `${v} day streak` : 'No streak')}
        />
        <StatCard
          label="Score"
          value={`${overallScore} / 100`}
          sparkData={scoreSparkData}
          color={theme.palette.info.main}
          tooltip={goalsConfigured ? "Overall score: 50% goals met (exercises that hit their goal) + 50% volume (exercises done vs expected)" : "Score: percentage of days with at least one exercise completed"}
          sparkDescription={goalsConfigured ? "Daily score: 50% goals met + 50% volume" : "% of days with at least one exercise completed"}
          sparkValueFormatter={v => `${v ?? 0} / 100`}
        />
      </Box>

      {/* Main chart + right column */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Stacked bar chart */}
        <Box sx={{ flex: 3, borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: 'background.paper', minWidth: 0, transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Completed by Day
          </Typography>
          <BarChart
            colors={theme.palette.chartColors}
            xAxis={[{ data: mainXLabels, scaleType: 'band' }]}
            yAxis={[{ tickMinStep: 1 }]}
            series={mainSeries}
            height={isMobile ? 280 : 500}
            slots={{ legend: () => null }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
            {categories.map((cat, idx) => (
              <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 11, height: 11, borderRadius: '2px', backgroundColor: theme.palette.chartColors[idx % theme.palette.chartColors.length], flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: 'text.primary' }}>{cat}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right column */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {/* Goals + Exercises gauges side by side */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="How many of your exercises have hit their goal for this period. 100% means every exercise has met its goal." placement="bottom" arrow>
            <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', textAlign: 'center', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Goals Met
              </Typography>
              {goalsConfigured ? (
                <>
                  <Gauge
                    value={gaugeValue}
                    startAngle={-110}
                    endAngle={110}
                    height={120}
                    text={({ value }) => `${value}%`}
                    sx={{
                      [`& .${gaugeClasses.valueText}`]: { fontSize: theme.typography.h4.fontSize, fontWeight: 700 },
                      [`& .${gaugeClasses.valueArc}`]: { fill: theme.palette.primary.main },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {gaugeNote}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary', py: 3 }}>
                  No Goals Configured
                </Typography>
              )}
            </Box>
            </Tooltip>

            <Tooltip title="Are you on pace to hit your goals? 100% = on track, above = ahead, below = behind." placement="bottom" arrow>
            <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', textAlign: 'center', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                On Pace
              </Typography>
              {goalsConfigured ? (
                <>
                  <Gauge
                    value={onTrackValue}
                    valueMax={Math.max(100, onTrackValue)}
                    startAngle={-110}
                    endAngle={110}
                    height={120}
                    text={({ value }) => `${value}%`}
                    sx={{
                      [`& .${gaugeClasses.valueText}`]: { fontSize: theme.typography.h4.fontSize, fontWeight: 700 },
                      [`& .${gaugeClasses.valueArc}`]: { fill: onTrackValue > 100 ? theme.palette.success.main : theme.palette.chartColors[1] },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {onTrackNote}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary', py: 3 }}>
                  No Goals Configured
                </Typography>
              )}
            </Box>
            </Tooltip>
          </Box>

          {/* Completed by Category for the current period */}
          <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
            <Tooltip title={goalsConfigured ? "Completions vs. goal target per category. The denominator is the sum of each exercise's weekly goal (multiplied by full weeks for monthly view). Categories without goals show total possible sessions." : "Completions vs. total possible sessions per category (exercises × days in period)"} placement="bottom" arrow>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'inline-block' }}>Completed by Category</Typography>
            </Tooltip>
            {categories.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>No exercises configured</Typography>
            ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {categories.map((cat, idx) => {
                  const completed = categoryPeriodData[idx];
                  const possible = categoryGoalTotals[idx];
                  const pct = possible > 0 ? (completed / possible) * 100 : 0;
                  const color = theme.palette.chartColors[idx % theme.palette.chartColors.length];
                  const catGoal = goalSettings[cat];
                  const tooltipText = catGoal?.enabled
                    ? `${completed} of ${possible} completions — target is the sum of each exercise's ${isWeekly ? 'weekly' : 'per-week'} goal${isWeekly ? '' : ' × full weeks in month'}`
                    : `${completed} of ${possible} completions — ${exercises[cat].length} exercise${exercises[cat].length !== 1 ? 's' : ''} × ${periodDates.length} days (no goal configured)`;
                  return (
                    <Tooltip key={cat} title={tooltipText} placement="top" arrow>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.primary' }}>{cat}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{completed}/{possible}</Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, backgroundColor: 'divider' }}>
                        <Box sx={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: color }} />
                      </Box>
                    </Box>
                    </Tooltip>
                  );
              })}
            </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Activity */}
      <Box sx={{ borderRadius: 2, boxShadow: 2, p: 2.5, backgroundColor: 'background.paper', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Activity
        </Typography>

        {/* Day of week headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: '4px' }}>
          {Array.from({ length: 7 }, (_, i) => DAY_NAMES[(weekStartDay + i) % 7]).map(day => (
            <Typography key={day} sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 500, fontSize: theme.typography.labelXs.fontSize }}>
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar grid */}
        {(() => {
          const dailyTotals = isWeekly ? weekDailyTotals : monthDailyTotals;
          const maxCount = Math.max(totalExercises, 1);
          const offset = isWeekly ? 0 : (new Date(selectedYear, selectedMonth, 1).getDay() - weekStartDay + 7) % 7;
          return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: offset }).map((_, i) => (
                <Box key={`empty-${i}`} sx={{ height: 20 }} />
              ))}
              {periodDates.map((date, idx) => {
                const count = dailyTotals[idx];
                const intensity = count / maxCount;
                const isToday = localDateStr(date) === todayStr;
                return (
                  <Tooltip key={idx} title={`${count} completed`} placement="top" arrow>
                    <Box sx={{
                      height: 20,
                      borderRadius: '3px',
                      backgroundColor: count === 0
                        ? 'action.hover'
                        : alpha(theme.palette.primary.main, 0.15 + intensity * 0.85),
                      border: isToday ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                      cursor: 'default',
                    }} />
                  </Tooltip>
                );
              })}
            </Box>
          );
        })()}

        {/* Legend */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Less</Typography>
          {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
            <Box key={intensity} sx={{
              width: 14,
              height: 14,
              borderRadius: '3px',
              backgroundColor: intensity === 0 ? 'action.hover' : alpha(theme.palette.primary.main, 0.15 + intensity * 0.85),
            }} />
          ))}
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>More</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default StatsView;
