import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatDate, formatDateKey, isToday } from '../utils/dateUtils';

interface HeatmapViewProps {
  dates: Date[];
  selectedMonth: number;
  selectedYear: number;
  weekStartDay: number;
  darkMode: boolean;
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
}

const HeatmapView: React.FC<HeatmapViewProps> = ({
  dates,
  selectedMonth,
  selectedYear,
  weekStartDay,
  darkMode,
  exercises,
  completions,
}) => {
  const cardBg = darkMode ? 'rgba(31,41,55,1)' : '#ffffff';
  const colorsLight = ['#f3f4f6', '#ffedd5', '#fdba74', '#fb923c', '#ef4444'];
  const colorsDark = ['#374151', '#7c2d12', '#b45309', '#f97316', '#dc2626'];

  const getHeatmapIntensity = (date: Date): number => {
    const dateStr = formatDateKey(date);
    const count = Object.keys(exercises).reduce((sum, category) => {
      return sum + exercises[category].filter(ex => completions[`${category}-${ex}-${dateStr}`]).length;
    }, 0);
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const orderedDayLabels = [...dayLabels.slice(weekStartDay), ...dayLabels.slice(0, weekStartDay)];
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
  const leadingEmpties = (firstDayOfMonth - weekStartDay + 7) % 7;

  return (
    <Box sx={{ borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: cardBg }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: darkMode ? '#ffffff' : '#1f2937' }}>Exercise Heatmap</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {orderedDayLabels.map(label => (
          <Box key={label} sx={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, pb: 0.5, color: darkMode ? '#9ca3af' : '#6b7280' }}>{label}</Box>
        ))}
        {Array.from({ length: leadingEmpties }).map((_, i) => <Box key={`empty-${i}`} />)}
        {dates.map(date => {
          const intensity = getHeatmapIntensity(date);
          const bg = darkMode ? colorsDark[intensity] : colorsLight[intensity];
          const textColor = darkMode ? '#ffffff' : (intensity >= 3 ? '#ffffff' : '#1f2937');
          const today = isToday(date);
          return (
            <Box key={date.toISOString()} sx={{ backgroundColor: bg, borderRadius: 1, p: 1, textAlign: 'center', color: textColor, outline: today ? '2px solid #3b82f6' : 'none', outlineOffset: '-2px' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(date)}</div>
              <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{intensity > 0 ? `${intensity} ex` : ''}</div>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
        <span style={{ fontSize: 13, color: darkMode ? '#9ca3af' : '#4b5563' }}>Less</span>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} style={{ width: 24, height: 24, backgroundColor: darkMode ? colorsDark[level] : colorsLight[level], borderRadius: 6 }} />
          ))}
        </Box>
        <span style={{ fontSize: 13, color: darkMode ? '#9ca3af' : '#4b5563' }}>More</span>
      </Box>
    </Box>
  );
};

export default HeatmapView;
