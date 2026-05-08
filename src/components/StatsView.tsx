import React, { useMemo } from 'react';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { formatDateKey, generateWeekDates, startOfWeek } from '../utils/dateUtils';

interface StatsViewProps {
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  goalSettings: Record<string, { enabled: boolean; required: number }>;
  exerciseGoals: Record<string, { override: boolean; required: number; disabled?: boolean }>;
  chartMode: 'weekly' | 'monthly';
  weekStartDate: Date;
  weekStartDay: number;
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
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sparkData, color, plotType = 'line' }) => (
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
      <SparkLineChart
        data={sparkData}
        height={50}
        width={120}
        color={color}
        plotType={plotType}
        curve="natural"
      />
    </Box>
  </Box>
);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StatsView: React.FC<StatsViewProps> = ({
  exercises,
  completions,
  goalSettings,
  exerciseGoals,
  chartMode,
  weekStartDate,
  weekStartDay,
  dates,
  selectedMonth,
  selectedYear,
}) => {
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


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stat cards */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <StatCard
          label={isWeekly ? 'This Week' : 'This Month'}
          value={isWeekly ? `${weekTotal}/${totalExercises * 7}` : `${monthTotal}/${totalExercises * dates.length}`}
          sparkData={isWeekly ? weekDailyTotals : monthDailyTotals}
          color={theme.palette.primary.main}
        />
        <StatCard
          label="Active Days"
          value={isWeekly ? `${weekActiveDays} / 7` : `${activeDays} / ${dates.length}`}
          sparkData={isWeekly ? weekActiveSparkData : monthActiveSparkData}
          plotType="bar"
          color={theme.palette.success.main}
        />
        <StatCard
          label="Longest Streak"
          value={bestStreak}
          sparkData={streakSparkData}
          color={theme.palette.warning.main}
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
                Goals
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
                Exercises
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
    </Box>
  );
};

export default StatsView;
