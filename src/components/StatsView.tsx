import React, { useMemo } from 'react';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { formatDateKey, generateWeekDates, startOfWeek } from '../utils/dateUtils';
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
  sparkDescription?: string;
  sparkValueFormatter?: (value: number | null) => string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sparkData, color, plotType = 'line', sparkDescription, sparkValueFormatter }) => (
  <Box
    sx={{
      flex: 1,
      borderRadius: 2,
      boxShadow: 2,
      p: 2,
      backgroundColor: 'background.paper',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}
  >
    <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
      </Typography>
      <Tooltip title={sparkDescription ?? ''} placement="top" arrow>
        <Box>
          <SparkLineChart
            data={sparkData}
            height={50}
            width={120}
            color={color}
            plotType={plotType}
            curve="natural"
            showTooltip
            showHighlight
            valueFormatter={sparkValueFormatter}
          />
        </Box>
      </Tooltip>
    </Box>
  </Box>
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
  const categories = Object.keys(exercises);
  const isWeekly = chartMode === 'weekly';

  const weekDates = useMemo(() => generateWeekDates(weekStartDate), [weekStartDate]);

  // Weekly per-day totals
  const weekDailyTotals = useMemo(
    () => weekDates.map(d => countDay(completions, exercises, formatDateKey(d))),
    [weekDates, completions, exercises],
  );
  const weekTotal = weekDailyTotals.reduce((a, b) => a + b, 0);
  const weekActiveDays = weekDailyTotals.filter(n => n > 0).length;
  const weekActiveSparkData = weekDailyTotals.map(n => (n > 0 ? 1 : 0));
  const totalExercises = categories.reduce((sum, cat) => sum + exercises[cat].length, 0);

  // Monthly per-day totals
  const monthDailyTotals = useMemo(
    () => dates.map(d => countDay(completions, exercises, formatDateKey(d))),
    [dates, completions, exercises],
  );
  const monthTotal = monthDailyTotals.reduce((a, b) => a + b, 0);
  const activeDays = monthDailyTotals.filter(n => n > 0).length;
  const monthActiveSparkData = monthDailyTotals.map(n => (n > 0 ? 1 : 0));

  // Exercises completed gauge
  const periodTotal = isWeekly ? weekTotal : monthTotal;
  const periodPossible = isWeekly ? totalExercises * 7 : totalExercises * dates.length;
  const exercisesGaugeValue = periodPossible > 0 ? Math.round((periodTotal / periodPossible) * 100) : 0;

  // Main stacked bar chart
  const periodDates = isWeekly ? weekDates : dates;

  // Longest consecutive streak within the selected period
  const { bestStreak, streakSparkData } = useMemo(() => {
    let best = 0;
    let current = 0;
    const sparkData = periodDates.map(d => {
      const hasAny = Object.keys(exercises).some(cat =>
        exercises[cat].some(ex => completions[`${cat}-${ex}-${formatDateKey(d)}`]),
      );
      if (hasAny) { best = Math.max(best, ++current); return current; }
      else { current = 0; return 0; }
    });
    return { bestStreak: best, streakSparkData: sparkData };
  }, [periodDates, exercises, completions]);
  const mainXLabels = periodDates.map(d =>
    isWeekly ? DAY_NAMES[d.getDay()] : String(d.getDate()),
  );
  const mainSeries = useMemo(
    () =>
      categories.map((cat, idx) => ({
        data: periodDates.map(d => {
          const dateStr = formatDateKey(d);
          return exercises[cat].filter(ex => completions[`${cat}-${ex}-${dateStr}`]).length;
        }),
        label: cat,
        stack: 'total',
        color: theme.palette.chartColors[idx % theme.palette.chartColors.length],
      })),
    [periodDates, categories, exercises, completions, theme.palette.chartColors],
  );

  // Gauge — per-exercise, using override goal if set, else category default
  const { gaugeValue, gaugeNote } = useMemo(() => {
    const enabledCats = Object.entries(goalSettings).filter(([cat, g]) => g.enabled && exercises[cat]);
    if (enabledCats.length === 0) return { gaugeValue: 0, gaugeNote: '' };

    const getGoal = (cat: string, ex: string, catRequired: number) => {
      const eg = exerciseGoals[`${cat}-${ex}`];
      if (eg?.disabled) return null;
      return eg?.override ? eg.required : catRequired;
    };

    if (isWeekly) {
      let total = 0;
      let met = 0;
      enabledCats.forEach(([cat, goal]) => {
        exercises[cat].forEach(ex => {
          const required = getGoal(cat, ex, goal.required);
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
        enabledCats.forEach(([cat, goal]) => {
          exercises[cat].forEach(ex => {
            const required = getGoal(cat, ex, goal.required);
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

  const goalsConfigured = Object.values(goalSettings).some(g => g.enabled);

  const consistencyPct = isWeekly
    ? (weekActiveDays / 7) * 100
    : dates.length > 0 ? (activeDays / dates.length) * 100 : 0;

  const overallScore = useMemo(() => {
    if (goalsConfigured) {
      return Math.round(gaugeValue * 0.5 + consistencyPct * 0.3 + exercisesGaugeValue * 0.2);
    }
    return Math.round(consistencyPct * 0.5 + exercisesGaugeValue * 0.5);
  }, [gaugeValue, consistencyPct, exercisesGaugeValue, goalsConfigured]);

  const scoreSparkData = useMemo(() => {
    const dailyTotals = isWeekly ? weekDailyTotals : monthDailyTotals;
    let runningCompletions = 0;
    let runningActiveDays = 0;
    return dailyTotals.map((count, i) => {
      runningCompletions += count;
      if (count > 0) runningActiveDays++;
      const daysElapsed = i + 1;
      const runningVolume = totalExercises > 0 ? (runningCompletions / (totalExercises * daysElapsed)) * 100 : 0;
      const runningConsistency = (runningActiveDays / daysElapsed) * 100;
      if (goalsConfigured) {
        return Math.round(gaugeValue * 0.5 + runningConsistency * 0.3 + runningVolume * 0.2);
      }
      return Math.round(runningConsistency * 0.5 + runningVolume * 0.5);
    });
  }, [isWeekly, weekDailyTotals, monthDailyTotals, totalExercises, gaugeValue, goalsConfigured]);


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stat cards */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <StatCard
          label="Exercises Done"
          value={isWeekly ? `${weekTotal}/${totalExercises * 7}` : `${monthTotal}/${totalExercises * dates.length}`}
          sparkData={isWeekly ? weekDailyTotals : monthDailyTotals}
          color={theme.palette.primary.main}
          sparkDescription="Total exercises completed per day"
          sparkValueFormatter={v => `${v ?? 0} exercise${v !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Active Days"
          value={isWeekly ? `${weekActiveDays} / 7` : `${activeDays} / ${dates.length}`}
          sparkData={isWeekly ? weekActiveSparkData : monthActiveSparkData}
          plotType="bar"
          color={theme.palette.success.main}
          sparkDescription="Active days — 1 means at least one exercise was completed"
          sparkValueFormatter={v => (v ? 'Active' : 'Rest day')}
        />
        <StatCard
          label="Longest Streak"
          value={bestStreak}
          sparkData={streakSparkData}
          color={theme.palette.warning.main}
          sparkDescription="Running streak length — resets to 0 on any day with no activity"
          sparkValueFormatter={v => (v ? `${v} day streak` : 'No streak')}
        />
        <StatCard
          label="Score"
          value={`${overallScore}/100`}
          sparkData={scoreSparkData}
          color={theme.palette.info.main}
          sparkDescription="Cumulative completion rate — running total of exercises done vs. total possible so far"
          sparkValueFormatter={v => `${v ?? 0} / 100`}
        />
      </Box>

      {/* Main chart + right column */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
        {/* Stacked bar chart */}
        <Box sx={{ flex: 3, borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: 'background.paper', minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
            By Day
          </Typography>
          <BarChart
            xAxis={[{ data: mainXLabels, scaleType: 'band' }]}
            yAxis={[{ tickMinStep: 1 }]}
            series={mainSeries}
            height={500}
            slots={{ legend: () => null }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
            {categories.map((cat, idx) => (
              <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 11, height: 11, borderRadius: '2px', backgroundColor: theme.palette.chartColors[idx % theme.palette.chartColors.length], flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: 'text.primary' }}>{cat}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right column */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {/* Goals + Exercises gauges side by side */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 0.5 }}>
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
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {gaugeNote}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
                  No Goals Configured
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 0.5 }}>
                Completion Rate
</Typography>
              <Gauge
                value={exercisesGaugeValue}
                startAngle={-110}
                endAngle={110}
                height={120}
                text={({ value }) => `${value}%`}
                sx={{
                  [`& .${gaugeClasses.valueText}`]: { fontSize: theme.typography.h4.fontSize, fontWeight: 700 },
                  [`& .${gaugeClasses.valueArc}`]: { fill: theme.palette.chartColors[1] },
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {periodTotal} of {periodPossible} Completed
              </Typography>
            </Box>
          </Box>

          {/* By Category for the current period */}
          <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper' }}>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>By Category</Typography>
            {categories.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No exercises configured</Typography>
            ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {categories.map((cat, idx) => {
                const completed = categoryPeriodData[idx];
                const possible = exercises[cat].length * periodDates.length;
                const pct = possible > 0 ? (completed / possible) * 100 : 0;
                const color = theme.palette.chartColors[idx % theme.palette.chartColors.length];
                return (
                  <Box key={cat}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>{cat}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{completed} / {possible}</Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 4, backgroundColor: 'divider' }}>
                      <Box sx={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: color }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Heatmap */}
      <Box sx={{ borderRadius: 2, boxShadow: 2, p: 2.5, backgroundColor: 'background.paper' }}>
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>
          Heatmap
        </Typography>

        {/* Day of week headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: '4px' }}>
          {Array.from({ length: 7 }, (_, i) => DAY_NAMES[(weekStartDay + i) % 7]).map(day => (
            <Typography key={day} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 500, fontSize: '0.65rem' }}>
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar grid */}
        {(() => {
          const dailyTotals = isWeekly ? weekDailyTotals : monthDailyTotals;
          const maxCount = Math.max(...dailyTotals, 1);
          const offset = isWeekly ? 0 : (new Date(selectedYear, selectedMonth, 1).getDay() - weekStartDay + 7) % 7;
          const todayStr = formatDateKey(new Date());
          return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: offset }).map((_, i) => (
                <Box key={`empty-${i}`} sx={{ height: 20 }} />
              ))}
              {periodDates.map((date, idx) => {
                const count = dailyTotals[idx];
                const intensity = count / maxCount;
                const isToday = formatDateKey(date) === todayStr;
                return (
                  <Tooltip key={idx} title={`${date.getDate()} — ${count} exercise${count !== 1 ? 's' : ''}`} placement="top" arrow>
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
              width: 12,
              height: 12,
              borderRadius: 0.5,
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
