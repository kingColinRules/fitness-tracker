import React from 'react';
import { Check } from 'lucide-react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { formatDateKey, isToday, isFutureDate, startOfWeek } from '../utils/dateUtils';

interface ExerciseTableProps {
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  goalSettings: Record<string, { enabled: boolean; required: number }>;
  tableDates: Date[];
  chartMode: 'weekly' | 'monthly';
  compactView: boolean;
  darkMode: boolean;
  streakLeft: number;
  weekStartDay: number;
  tableWrapperRef: React.RefObject<HTMLDivElement>;
  exerciseHeaderRef: React.RefObject<HTMLTableCellElement>;
  toggleCompletion: (category: string, exercise: string, dateStr: string) => void;
}

const ExerciseTable: React.FC<ExerciseTableProps> = ({
  exercises,
  completions,
  goalSettings,
  tableDates,
  chartMode,
  compactView,
  darkMode,
  streakLeft,
  weekStartDay,
  tableWrapperRef,
  exerciseHeaderRef,
  toggleCompletion,
}) => {
  const theme = useTheme();
  const cardBg = darkMode ? 'rgba(31,41,55,1)' : '#ffffff';

  const isCompleted = (category: string, exercise: string, dateStr: string): boolean =>
    completions[`${category}-${exercise}-${dateStr}`] || false;

  const calculateStreak = (category: string, exercise: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today, weekStartDay);
    let count = 0;
    const checkDate = new Date(today);
    while (checkDate >= weekStart) {
      if (isCompleted(category, exercise, formatDateKey(checkDate))) count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  };

  return (
    <TableContainer ref={tableWrapperRef} component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflowX: 'auto', backgroundColor: cardBg }}>
      <Table sx={{ width: '100%', borderCollapse: 'collapse' }} size={compactView ? 'small' : 'medium'}>
        <TableHead>
          <TableRow sx={{ backgroundColor: darkMode ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)' }}>
            <TableCell ref={exerciseHeaderRef} sx={{ fontWeight: 600, position: 'sticky', left: 0, zIndex: 70, minWidth: 120, backgroundColor: darkMode ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)', color: darkMode ? '#e5e7eb' : '#374151' }}>Exercise</TableCell>
            <TableCell sx={{ fontWeight: 600, position: 'sticky', left: `${streakLeft}px`, zIndex: 60, textAlign: 'center', minWidth: 80, backgroundColor: darkMode ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)', color: darkMode ? '#e5e7eb' : '#374151' }}>Weekly <br />Progress</TableCell>
            {tableDates.map(date => (
              <TableCell key={date.toISOString()} data-date={formatDateKey(date)} align="center" sx={{ fontWeight: 600, minWidth: chartMode === 'weekly' ? 80 : 24, borderColor: darkMode ? '#4b5563' : '#d1d5db', backgroundColor: isToday(date) ? theme.palette.action.selected : undefined, color: darkMode ? '#e5e7eb' : '#374151', lineHeight: 1.2, px: 0.25 }}>
                <Box sx={{ fontSize: '0.65rem', opacity: 0.7 }}>{dayjs(date).format('ddd')}</Box>
                <Box sx={{ fontSize: '0.75rem' }}>{chartMode === 'weekly' ? dayjs(date).format('DD MMM') : String(date.getDate()).padStart(2, '0')}</Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(exercises).map(([category, exerciseList]) => (
            <React.Fragment key={category}>
              <TableRow sx={{ backgroundColor: darkMode ? 'rgba(2,6,23,1)' : 'rgba(239,246,255,1)' }}>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', position: 'sticky', left: 0, zIndex: 80, backgroundColor: darkMode ? 'rgba(2,6,23,1)' : 'rgba(239,246,255,1)', color: darkMode ? '#bfdbfe' : '#1f2937' }}>{category}</TableCell>
                <TableCell colSpan={tableDates.length + 1} sx={{ backgroundColor: darkMode ? 'rgba(2,6,23,1)' : 'rgba(239,246,255,1)' }} />
              </TableRow>
              {exerciseList.map((exercise) => {
                const streakCount = calculateStreak(category, exercise);
                const requiredCount = goalSettings[category]?.required || 3;
                const showStreak = goalSettings[category]?.enabled;
                return (
                  <TableRow key={exercise}>
                    <TableCell sx={{ fontWeight: 500, position: 'sticky', left: 0, zIndex: 70, backgroundColor: darkMode ? '#111827' : '#ffffff', color: darkMode ? '#e5e7eb' : '#374151' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{exercise}</Box>
                    </TableCell>
                    <TableCell title={showStreak ? `${streakCount} / ${requiredCount}` : undefined} sx={{ position: 'sticky', left: `${streakLeft}px`, zIndex: 60, textAlign: 'center', backgroundColor: darkMode ? '#111827' : '#ffffff', px: 1 }}>
                      {showStreak && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                          <Box sx={{ width: compactView ? 28 : 36, height: compactView ? 4 : 6, borderRadius: 99, backgroundColor: darkMode ? '#374151' : '#e5e7eb', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${Math.min(streakCount / requiredCount, 1) * 100}%`, borderRadius: 99, backgroundColor: streakCount >= requiredCount ? '#16a34a' : '#f97316', transition: 'width 0.3s ease' }} />
                          </Box>
                          <Box sx={{ fontSize: '0.6rem', color: darkMode ? '#9ca3af' : '#6b7280', lineHeight: 1 }}>{streakCount}/{requiredCount}</Box>
                        </Box>
                      )}
                    </TableCell>
                    {tableDates.map(date => {
                      const dateStr = formatDateKey(date);
                      const completed = isCompleted(category, exercise, dateStr);
                      const isTodayColumn = isToday(date);
                      const isFuture = isFutureDate(date);
                      return (
                        <TableCell key={date.toISOString()} data-date-cell align="center" sx={{ borderColor: darkMode ? '#4b5563' : '#d1d5db', backgroundColor: isTodayColumn ? theme.palette.action.selected : undefined, px: 0.5, py: 0.5 }}>
                          <Button onClick={() => !isFuture && toggleCompletion(category, exercise, dateStr)} disabled={isFuture} fullWidth size={compactView ? 'small' : 'medium'} sx={{ borderRadius: 1, minHeight: compactView ? 32 : 44, py: 0, backgroundColor: isFuture ? (darkMode ? '#111827' : '#f9fafb') : completed ? '#16a34a' : (darkMode ? '#374151' : '#f3f4f6'), '&:hover': { backgroundColor: completed ? '#159c43' : undefined } }}>
                            {completed ? <Check color="#fff" size={compactView ? 14 : 20} /> : null}
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExerciseTable;
