import React, { useMemo, useState } from 'react';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { ChartsTooltip, useAxesTooltip, type ChartsTooltipProps } from '@mui/x-charts/ChartsTooltip';
import { BarChart } from '@mui/x-charts/BarChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Collapse from '@mui/material/Collapse';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import { formatDateKey, localDateStr, generateWeekDates, startOfWeek, months } from '../utils/dateUtils';
import { useAppStore } from '../store';

interface StatsViewProps {
  weekStartDate: Date;
  dates: Date[];
  selectedMonth: number;
  selectedYear: number;
  chartModeOverride?: 'weekly' | 'monthly';
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

// Sparkline data is padded with `null` out to the full period length so the point/band scale
// allocates the correct width per day (see the `data`/`xAxis.data` comment below) — but the axis
// itself still needs one *distinct* array entry per day for that width math to stay correct, so
// we can't null out the axis value for future days without breaking every card's width proportions.
// Instead we suppress the tooltip for those days here, by checking the hovered dataIndex directly.
const ConditionalTooltip: React.FC<ChartsTooltipProps<'axis'> & { realLength?: number }> = ({ realLength, ...props }) => {
  const tooltipData = useAxesTooltip();
  const isFuture = tooltipData?.some(d => d.axisDirection === 'x' && realLength !== undefined && d.dataIndex >= realLength);
  if (isFuture) return null;
  return <ChartsTooltip {...props} />;
};

interface StatCardProps {
  label: string;
  value: string | number;
  sparkData?: number[];
  periodLength?: number;
  sparkMax?: number;
  sparkLabels?: string[];
  color: string;
  plotType?: 'line' | 'bar';
  tooltip?: string;
  sparkTooltip?: boolean;
  sparkValueFormatter?: (value: number | null) => string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sparkData = [], periodLength, sparkMax, sparkLabels, color, plotType = 'line', tooltip, sparkTooltip = true, sparkValueFormatter }) => (
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
    {/* Only the label/value are wrapped in the description tooltip — wrapping the sparkline too would
        let it sit above the sparkline's own data tooltip (MUI Tooltip's z-index outranks ChartsTooltip's). */}
    <Tooltip title={tooltip ?? ''} placement="bottom" arrow disableTouchListener>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, width: 'fit-content' }}>
        {label}
      </Typography>
    </Tooltip>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
      <Tooltip title={tooltip ?? ''} placement="bottom" arrow disableTouchListener>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, whiteSpace: 'nowrap', width: 'fit-content' }}>
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
      </Tooltip>
      {sparkData.length >= 2 ? (
        <Box sx={{ flex: '1 1 80px', minWidth: 0, height: 50, overflow: 'hidden' }}>
          <SparkLineChart
            // SparkLineChart uses a point/band scale, which always spreads however many categories it's given
            // across the full width (min/max only apply to continuous scales, so they're ignored here). To make
            // a partial (elapsed-days-only) series only occupy its true share of the width, pad it out to the
            // full period length with `null` — MUI's own default valueFormatter already treats null as "no data".
            data={Array.from({ length: periodLength ?? sparkData.length }, (_, i) => sparkData[i] ?? null) as number[]}
            xAxis={{
              data: Array.from({ length: periodLength ?? sparkData.length }, (_, i) => i),
              valueFormatter: (i: number) => sparkLabels?.[i] ?? '',
            }}
            yAxis={{ min: 0, max: sparkMax }}
            height={50}
            color={color}
            plotType={plotType}
            curve="monotoneX"
            showTooltip={sparkTooltip}
            showHighlight={sparkTooltip}
            valueFormatter={sparkValueFormatter}
            slots={{ tooltip: ConditionalTooltip }}
            slotProps={{ tooltip: { realLength: sparkData.length } as ChartsTooltipProps<'axis'> }}
            margin={{ top: 8, bottom: 4, left: 4, right: 4 }}
          />
        </Box>
      ) : (
        <Box sx={{ flex: '1 1 80px', minWidth: 0, height: 50 }} />
      )}
    </Box>
  </Box>
);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StatsView: React.FC<StatsViewProps> = ({
  weekStartDate,
  dates,
  selectedMonth,
  selectedYear,
  chartModeOverride,
}) => {
  const { exercises, completions, goalSettings, exerciseGoals, chartMode, weekStartDay } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const categories = Object.keys(exercises);
  const isWeekly = (chartModeOverride ?? chartMode) === 'weekly';
  const totalExercises = useMemo(() => Object.values(exercises).reduce((sum, exs) => sum + exs.length, 0), [exercises]);

  const weekDates = useMemo(() => generateWeekDates(weekStartDate), [weekStartDate]);

  const todayStr = localDateStr(new Date());

  const periodDates = useMemo(
    () => (isWeekly ? weekDates : dates),
    [isWeekly, weekDates, dates],
  );

  const periodDailyTotals = useMemo(
    () => periodDates.map(d => countDay(completions, exercises, formatDateKey(d))),
    [periodDates, completions, exercises],
  );
  const periodTotal = periodDailyTotals.reduce((a, b) => a + b, 0);
  const periodActiveDays = periodDailyTotals.filter(n => n > 0).length;
  // Sparklines only plot days that have actually happened — a fully past period naturally covers its whole length,
  // but the in-progress current period must stop at today rather than flat-lining across days that haven't occurred yet.
  const periodElapsedTotals = useMemo(
    () => periodDates.filter(d => localDateStr(d) <= todayStr).map(d => countDay(completions, exercises, formatDateKey(d))),
    [periodDates, completions, exercises, todayStr],
  );
  const periodActiveSparkData = periodElapsedTotals.map(v => (v > 0 ? 1 : 0));
  const periodCumulativeTotals = periodElapsedTotals.reduce<number[]>((acc, v) => { acc.push((acc[acc.length - 1] ?? 0) + v); return acc; }, []);

  const daysElapsed = periodDates.length;

  const showDateNumber = !isWeekly;
  const mainXLabels = periodDates.map(d =>
    isWeekly ? DAY_NAMES[d.getDay()] : String(d.getDate()),
  );
  // Stat-card sparkline tooltips stand alone (no visible month/year header nearby like the main
  // chart has), so a bare day-of-month number is ambiguous — always include the month, in both
  // weekly and monthly view, so the label format doesn't shift between the two.
  const sparkTooltipLabels = periodDates.map(d => `${months[d.getMonth()].slice(0, 3)} ${d.getDate()}`);
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
  const { gaugeValue, gaugeNote, goalsMet, goalsTotal, goalsSparkData } = useMemo(() => {
    const enabledCats = Object.entries(goalSettings).filter(([cat, g]) => g.enabled && exercises[cat]);
    if (enabledCats.length === 0) return { gaugeValue: 0, gaugeNote: '', goalsMet: 0, goalsTotal: 0, goalsSparkData: [] };

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
      // Per-day cumulative goals met (only days that have actually happened)
      const spark = weekDates
        .filter(d => formatDateKey(d) <= todayStr)
        .map((_, dayIdx) => {
          const daysUpTo = weekDates.slice(0, dayIdx + 1);
          let dayMet = 0;
          enabledCats.forEach(([cat, goal]) => {
            exercises[cat].forEach(ex => {
              const required = getGoal(cat, ex, goal.required, periodStart);
              if (required === null) return;
              const count = daysUpTo.reduce((sum, d) =>
                sum + (completions[`${cat}-${ex}-${formatDateKey(d)}`] ? 1 : 0), 0);
              if (count >= required) dayMet++;
            });
          });
          return dayMet;
        });
      return {
        gaugeValue: total > 0 ? Math.round((met / total) * 100) : 0,
        gaugeNote: `${met} of ${total} Completed`,
        goalsMet: met,
        goalsTotal: total,
        goalsSparkData: spark,
      };
    } else {
      const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth, weekStartDay);
      let total = 0;
      let met = 0;
      // Per-week goals met for sparkline
      const spark: number[] = [];
      weeksInMonth.forEach(weekStart => {
        const wDates = generateWeekDates(weekStart);
        const daysInMonth = wDates.filter(d => d.getMonth() === selectedMonth && d.getFullYear() === selectedYear).length;
        if (daysInMonth < 4) return;
        const weekPeriodStart = formatDateKey(weekStart);
        let weekMet = 0;
        enabledCats.forEach(([cat, goal]) => {
          exercises[cat].forEach(ex => {
            const required = getGoal(cat, ex, goal.required, weekPeriodStart);
            if (required === null) return;
            const count = wDates.reduce((sum, d) =>
              sum + (completions[`${cat}-${ex}-${formatDateKey(d)}`] ? 1 : 0), 0);
            total++;
            if (count >= required) { met++; weekMet++; }
          });
        });
        spark.push(met);
      });
      return {
        gaugeValue: total > 0 ? Math.round((met / total) * 100) : 0,
        gaugeNote: `${met} of ${total} Completed`,
        goalsMet: met,
        goalsTotal: total,
        goalsSparkData: spark,
      };
    }
  }, [goalSettings, exerciseGoals, exercises, completions, weekDates, isWeekly, selectedYear, selectedMonth, weekStartDay, todayStr]);

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

  const exercisePeriodData = useMemo(() => {
    const periodStart = isWeekly ? formatDateKey(weekDates[0]) : formatDateKey(new Date(selectedYear, selectedMonth, 1));
    const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth, weekStartDay);
    const fullWeeks = weeksInMonth.filter(weekStart =>
      generateWeekDates(weekStart).filter(d => d.getMonth() === selectedMonth && d.getFullYear() === selectedYear).length === 7
    ).length;
    const goalFor = (required: number) => (isWeekly ? required : required * fullWeeks);
    return categories.map(cat => {
      const catGoal = goalSettings[cat];
      return exercises[cat].map(ex => {
        const completed = periodDates.reduce(
          (sum, d) => sum + (completions[`${cat}-${ex}-${formatDateKey(d)}`] ? 1 : 0),
          0
        );
        let goal = periodDates.length;
        if (catGoal?.enabled && !(catGoal.createdAt && catGoal.createdAt > periodStart)) {
          const eg = exerciseGoals[`${cat}-${ex}`];
          if (eg?.disabled) {
            goal = 0;
          } else if (eg?.override && !(eg.createdAt && eg.createdAt > periodStart)) {
            goal = goalFor(eg.required);
          } else if (!eg?.override) {
            goal = goalFor(catGoal.required);
          }
        }
        return { name: ex, completed, goal };
      });
    });
  }, [categories, exercises, completions, periodDates, goalSettings, exerciseGoals, isWeekly, weekDates, selectedYear, selectedMonth, weekStartDay]);

  const categoryGoalTotals = useMemo(() => {
    const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth, weekStartDay);
    const fullWeeks = weeksInMonth.filter(weekStart => {
      const wDates = generateWeekDates(weekStart);
      return wDates.filter(d => d.getMonth() === selectedMonth && d.getFullYear() === selectedYear).length === 7;
    }).length;
    const periodStart = isWeekly ? formatDateKey(weekDates[0]) : formatDateKey(new Date(selectedYear, selectedMonth, 1));
    const goalFor = (required: number) => (isWeekly ? required : required * fullWeeks);
    return categories.map(cat => {
      const catGoal = goalSettings[cat];
      if (!catGoal?.enabled || (catGoal.createdAt && catGoal.createdAt > periodStart)) return exercises[cat].length * periodDates.length;
      return exercises[cat].reduce((sum, ex) => {
        const eg = exerciseGoals[`${cat}-${ex}`];
        if (eg?.disabled) return sum;
        if (eg?.override) {
          if (eg.createdAt && eg.createdAt > periodStart) return sum;
          return sum + goalFor(eg.required);
        }
        return sum + goalFor(catGoal.required);
      }, 0);
    });
  }, [categories, goalSettings, exerciseGoals, exercises, isWeekly, selectedYear, selectedMonth, weekStartDay, periodDates]);

  const totalGoalTarget = categoryGoalTotals.reduce((a, b) => a + b, 0);

  const goalsConfigured = Object.values(goalSettings).some(g => g.enabled);

  const { onTrackCompleted, onTrackGoal } = useMemo(() => {
    return { onTrackCompleted: periodTotal, onTrackGoal: Math.max(1, totalGoalTarget) };
  }, [periodTotal, totalGoalTarget]);


  const scoreSparkData = useMemo(() => {
    const dailyTotals = periodElapsedTotals;

    const periodStart = isWeekly ? formatDateKey(weekDates[0]) : formatDateKey(new Date(selectedYear, selectedMonth, 1));
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
  }, [periodElapsedTotals, goalSettings, exerciseGoals, exercises, gaugeValue, goalsConfigured, weekDates, selectedYear, selectedMonth, isWeekly]);

  const overallScore = scoreSparkData.at(-1) ?? 0;

  const bestDay = useMemo(() => {
    if (periodDailyTotals.length === 0) return null;
    const max = Math.max(...periodDailyTotals);
    if (max <= 0) return null;
    const idx = periodDailyTotals.indexOf(max);
    const date = periodDates[idx];
    return { day: DAY_NAMES[date.getDay()], date, count: max };
  }, [periodDailyTotals, periodDates]);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const toggleCat = (cat: string) => setExpandedCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stat cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label="Exercises Completed"
          value={`${periodTotal} / ${totalGoalTarget}`}
          sparkData={periodCumulativeTotals}
          periodLength={daysElapsed}
          sparkMax={Math.max(1, totalGoalTarget)}
          sparkLabels={sparkTooltipLabels}
          color={theme.palette.primary.main}
          tooltip={goalsConfigured ? "Exercises completed vs. total goal target for the period (sum of all exercise goals)" : "Exercises completed vs. total possible sessions in the period (exercises × days)"}

          sparkValueFormatter={v => `${v ?? 0} exercise${v !== 1 ? 's' : ''} done`}
        />
        <StatCard
          label="Goals Met"
          value={goalsConfigured ? `${goalsMet} / ${goalsTotal}` : '—'}
          sparkData={goalsSparkData}
          periodLength={isWeekly ? daysElapsed : undefined}
          sparkMax={Math.max(1, goalsTotal)}
          sparkLabels={isWeekly ? sparkTooltipLabels : goalsSparkData.map((_, i) => `Week ${i + 1}`)}
          plotType="line"
          color={theme.palette.warning.main}
          tooltip={goalsConfigured ? (isWeekly ? "Goals fully met by each day of the period (cumulative)" : "Goals fully met per week in the month") : "No goals configured — set goals in Settings to track progress"}
          sparkValueFormatter={v => `${v ?? 0} goal${v !== 1 ? 's' : ''} met`}
        />
        <StatCard
          label="Active Days"
          value={`${periodActiveDays} / ${daysElapsed}`}
          sparkData={periodActiveSparkData}
          periodLength={daysElapsed}
          sparkMax={1}
          sparkLabels={sparkTooltipLabels}
          plotType="bar"
          color={theme.palette.success.main}
          tooltip="Days where at least one exercise was completed, out of total days in the period"
          sparkValueFormatter={v => v === 1 ? 'Active' : 'Rest day'}
        />
        <StatCard
          label="Score"
          value={`${overallScore} / 100`}
          sparkData={scoreSparkData}
          periodLength={daysElapsed}
          sparkMax={100}
          sparkLabels={sparkTooltipLabels}
          color={theme.palette.info.main}
          tooltip={goalsConfigured ? "Overall score: 50% goals met (exercises that hit their goal) + 50% volume (exercises done vs expected)" : "Score: percentage of days with at least one exercise completed"}
          sparkValueFormatter={v => `${v ?? 0} / 100`}
        />
      </Box>

      {/* Main chart + right column */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left column */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {/* Goals + Exercises gauges side by side */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Exercises completed out of your total goal for this period." placement="bottom" arrow disableTouchListener>
            <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', textAlign: 'center', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Exercise Progress
              </Typography>
              {goalsConfigured ? (
                <>
                  <Gauge
                    value={onTrackCompleted}
                    valueMax={onTrackGoal}
                    startAngle={-110}
                    endAngle={110}
                    height={120}
                    text={({ value }) => `${Math.round((value / onTrackGoal) * 100)}%`}
                    sx={{
                      [`& .${gaugeClasses.valueText}`]: { fontSize: theme.typography.h4.fontSize, fontWeight: 700 },
                      [`& .${gaugeClasses.valueArc}`]: { fill: onTrackCompleted >= onTrackGoal ? theme.palette.success.main : theme.palette.chartColors[1] },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {onTrackCompleted} of {onTrackGoal} Completed
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary', py: 3 }}>
                  No Goals Configured
                </Typography>
              )}
            </Box>
            </Tooltip>

            <Tooltip title="How many of your exercises have hit their goal for this period. 100% means every exercise has met its goal." placement="bottom" arrow disableTouchListener>
            <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', textAlign: 'center', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Goal Progress
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
                      [`& .${gaugeClasses.valueArc}`]: { fill: gaugeValue >= 100 ? theme.palette.success.main : theme.palette.chartColors[1] },
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
          </Box>

          {/* Completed by Category for the current period */}
          <Box sx={{ flex: 1, borderRadius: 2, boxShadow: 2, p: 2, backgroundColor: 'background.paper', transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
            <Tooltip title={goalsConfigured ? "Completions vs. goal target per category. The denominator is the sum of each exercise's weekly goal (multiplied by full weeks for monthly view). Categories without goals show total possible sessions." : "Completions vs. total possible sessions per category (exercises × days in period)"} placement="bottom" arrow disableTouchListener>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'inline-block' }}>Completed by Category</Typography>
            </Tooltip>
            {categories.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>No exercises configured</Typography>
            ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {categories.map((cat, idx) => {
                const completed = categoryPeriodData[idx];
                const possible = categoryGoalTotals[idx];
                const pct = possible > 0 ? Math.min((completed / possible) * 100, 100) : 0;
                const color = theme.palette.chartColors[idx % theme.palette.chartColors.length];
                const isExpanded = expandedCats.has(cat);
                const exData = exercisePeriodData[idx];
                return (
                  <Box key={cat}>
                    <Box sx={{ cursor: 'pointer' }} onClick={() => toggleCat(cat)}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{cat}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{completed}/{possible}</Typography>
                          {isExpanded
                            ? <KeyboardArrowUp sx={{ fontSize: 14, color: 'text.disabled' }} />
                            : <KeyboardArrowDown sx={{ fontSize: 14, color: 'text.disabled' }} />}
                        </Box>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, backgroundColor: 'divider' }}>
                        <Box sx={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: color }} />
                      </Box>
                    </Box>
                    <Collapse in={isExpanded}>
                      <Box sx={{ mt: 1.25, ml: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {exData.map(ex => {
                          const exPct = ex.goal > 0 ? Math.min((ex.completed / ex.goal) * 100, 100) : 0;
                          return (
                            <Box key={ex.name}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{ex.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>{ex.completed}/{ex.goal}</Typography>
                              </Box>
                              <Box sx={{ height: 5, borderRadius: 3, backgroundColor: 'divider' }}>
                                <Box sx={{ height: '100%', borderRadius: 3, width: `${exPct}%`, backgroundColor: alpha(color, 0.65) }} />
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
            )}
          </Box>
        </Box>

        {/* Stacked bar chart */}
        <Box sx={{ flex: 3, borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: 'background.paper', minWidth: 0, transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: 4 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Completed by Day
          </Typography>
          <BarChart
            colors={theme.palette.chartColors}
            xAxis={[{ data: mainXLabels, scaleType: 'band' }]}
            yAxis={[{ tickMinStep: 1, valueFormatter: (value) => String(Math.round(value)) }]}
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

        {/* Calendar grid — quantized into discrete steps (rather than a continuous alpha blend) so the
            legend swatches below are an exact, honest key for the colors actually shown in the grid. */}
        {(() => {
          const dailyTotals = periodDailyTotals;
          const maxCount = Math.max(totalExercises, 1);
          const offset = isWeekly ? 0 : (new Date(selectedYear, selectedMonth, 1).getDay() - weekStartDay + 7) % 7;
          const heatSteps = [0.3, 0.55, 0.8, 1];
          const heatColor = (intensity: number): string =>
            intensity <= 0 ? '' : alpha(theme.palette.primary.main, heatSteps.find(s => intensity <= s) ?? 1);
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
                      backgroundColor: count === 0 ? 'action.hover' : heatColor(intensity),
                      border: isToday ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                      cursor: 'default',
                    }} />
                  </Tooltip>
                );
              })}
            </Box>
          );
        })()}

        {/* Legend — same quantization as the grid above (0, and the top of each of the 4 heat steps) */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Less</Typography>
          {[0, 0.3, 0.55, 0.8, 1].map(intensity => (
            <Box key={intensity} sx={{
              width: 14,
              height: 14,
              borderRadius: '3px',
              backgroundColor: intensity === 0 ? 'action.hover' : alpha(theme.palette.primary.main, intensity),
            }} />
          ))}
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>More</Typography>
        </Box>

        {bestDay && (
          <Box sx={{
            mt: 2, px: 2, py: 1.25, borderRadius: 2,
            backgroundColor: alpha(theme.palette.warning.main, 0.08),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>⭐</Typography>
            <Typography variant="caption" sx={{ color: 'text.primary' }}>
              Best day:{' '}
              <strong>
                {bestDay.day}{showDateNumber ? ` ${bestDay.date.getDate()}` : ''}
              </strong>
              {' '}—{' '}
              <strong>{bestDay.count}</strong> exercise{bestDay.count !== 1 ? 's' : ''} completed
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StatsView;
