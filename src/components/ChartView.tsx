import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { months, formatDateKey, formatRange, generateWeekDates } from '../utils/dateUtils';

interface ChartViewProps {
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  darkMode: boolean;
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
  darkMode,
  chartMode,
  weekStartDate,
  dates,
  selectedMonth,
  selectedYear,
}) => {
  const cardBg = darkMode ? 'rgba(31,41,55,1)' : '#ffffff';

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
    <Box sx={{ borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: cardBg }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#1f2937' }}>Progress Chart</Typography>
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>{periodLabel}</Box>
      </Box>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartMode === 'weekly' ? generateChartDataForWeek(weekStartDate) : generateChartData(dates)}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="date" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
          <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
          <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
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
