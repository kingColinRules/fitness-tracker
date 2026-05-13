import React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { months, formatDateKey, formatRange, generateWeekDates } from '../utils/dateUtils';
import { isCompleted as isCompletedUtil } from '../utils/completionUtils';

interface ChartViewProps {
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  chartMode: 'weekly' | 'monthly';
  weekStartDate: Date;
  dates: Date[];
  selectedMonth: number;
  selectedYear: number;
}

const ChartView: React.FC<ChartViewProps> = ({
  exercises,
  completions,
  chartMode,
  weekStartDate,
  dates,
  selectedMonth,
  selectedYear,
}) => {
  const theme = useTheme();
  const categories = Object.keys(exercises);

  const buildSeries = (dayDates: Date[]) =>
    categories.map((category, idx) => ({
      label: category,
      data: dayDates.map(date => {
        const dateStr = formatDateKey(date);
        return exercises[category].filter(ex => isCompletedUtil(completions, category, ex, dateStr)).length;
      }),
      color: theme.palette.chartColors[idx % theme.palette.chartColors.length],
      curve: 'linear' as const,
    }));

  const dayDates = chartMode === 'weekly' ? generateWeekDates(weekStartDate) : dates;
  const xLabels = dayDates.map(date =>
    chartMode === 'weekly'
      ? `${date.getDate()}/${date.getMonth() + 1}`
      : `${date.getMonth() + 1}/${date.getDate()}`
  );

  const weekEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6);
  const periodLabel = chartMode === 'weekly'
    ? formatRange(weekStartDate, weekEnd)
    : `${months[selectedMonth]} ${selectedYear}`;

  return (
    <Box sx={{ borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>Progress Chart</Typography>
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, color: 'text.secondary' }}>{periodLabel}</Box>
      </Box>
      <LineChart
        xAxis={[{ data: xLabels, scaleType: 'point' }]}
        yAxis={[{ tickMinStep: 1 }]}
        series={buildSeries(dayDates)}
        height={400}
        sx={{ width: '100%' }}
      />
    </Box>
  );
};

export default ChartView;
