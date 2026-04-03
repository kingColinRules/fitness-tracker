import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { months, formatDateKey, formatRange, generateWeekDates } from '../utils/dateUtils';

interface ChartViewProps {
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  chartMode: 'weekly' | 'monthly';
  weekStartDate: Date;
  dates: Date[];
  selectedMonth: number;
  selectedYear: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  const isCompleted = (category: string, exercise: string, dateStr: string): boolean =>
    completions[`${category}-${exercise}-${dateStr}`] || false;

  const generateChartDataForWeek = (start: Date) =>
    generateWeekDates(start).map(date => {
      const dateStr = formatDateKey(date);
      const data: Record<string, unknown> = { date: `${date.getDate()}/${date.getMonth() + 1}` };
      Object.keys(exercises).forEach(category => {
        data[category] = exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
      });
      return data;
    });

  const generateChartData = (monthDates = dates) =>
    monthDates.map(date => {
      const dateStr = formatDateKey(date);
      const data: Record<string, unknown> = { date: `${date.getMonth() + 1}/${date.getDate()}` };
      Object.keys(exercises).forEach(category => {
        data[category] = exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
      });
      return data;
    });

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
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartMode === 'weekly' ? generateChartDataForWeek(weekStartDate) : generateChartData(dates)}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
          <YAxis stroke={theme.palette.text.secondary} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
            }}
          />
          <Legend />
          {Object.keys(exercises).map((category, idx) => (
            <Line key={category} type="monotone" dataKey={category} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ChartView;
