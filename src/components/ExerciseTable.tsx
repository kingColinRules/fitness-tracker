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
  streakLeft,
  weekStartDay,
  tableWrapperRef,
  exerciseHeaderRef,
  toggleCompletion,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const headerBg = isDark ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)';
  const categoryBg = isDark ? 'rgba(2,6,23,1)' : 'rgba(239,246,255,1)';
  const rowBg = theme.palette.background.paper;

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
    <TableContainer ref={tableWrapperRef} component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflowX: 'auto' }}>
      <Table sx={{ width: '100%', borderCollapse: 'collapse' }} size={compactView ? 'small' : 'medium'}>
        <TableHead>
          <TableRow sx={{ backgroundColor: headerBg }}>
            <TableCell ref={exerciseHeaderRef} sx={{ fontWeight: 600, position: 'sticky', left: 0, zIndex: 70, minWidth: 120, backgroundColor: headerBg, color: 'text.primary' }}>Exercise</TableCell>
            <TableCell sx={{ fontWeight: 600, position: 'sticky', left: `${streakLeft}px`, zIndex: 60, textAlign: 'center', minWidth: 80, backgroundColor: headerBg, color: 'text.primary' }}>Weekly <br />Progress</TableCell>
            {tableDates.map(date => (
              <TableCell key={date.toISOString()} data-date={formatDateKey(date)} align="center" sx={{ fontWeight: 600, minWidth: chartMode === 'weekly' ? 80 : 24, borderColor: 'divider', backgroundColor: isToday(date) ? theme.palette.action.selected : undefined, color: 'text.primary', lineHeight: 1.2, px: 0.25 }}>
                <Box sx={{ fontSize: '0.65rem', opacity: 0.7 }}>{dayjs(date).format('ddd')}</Box>
                <Box sx={{ fontSize: '0.75rem' }}>{chartMode === 'weekly' ? dayjs(date).format('DD MMM') : String(date.getDate()).padStart(2, '0')}</Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(exercises).map(([category, exerciseList]) => (
            <React.Fragment key={category}>
              <TableRow sx={{ backgroundColor: categoryBg }}>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', position: 'sticky', left: 0, zIndex: 80, backgroundColor: categoryBg, color: isDark ? '#bfdbfe' : 'text.primary' }}>{category}</TableCell>
                <TableCell colSpan={tableDates.length + 1} sx={{ backgroundColor: categoryBg }} />
              </TableRow>
              {exerciseList.map((exercise) => {
                const streakCount = calculateStreak(category, exercise);
                const requiredCount = goalSettings[category]?.required || 3;
                const showStreak = goalSettings[category]?.enabled;
                return (
                  <TableRow key={exercise}>
                    <TableCell sx={{ fontWeight: 500, position: 'sticky', left: 0, zIndex: 70, backgroundColor: rowBg, color: 'text.primary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{exercise}</Box>
                    </TableCell>
                    <TableCell title={showStreak ? `${streakCount} / ${requiredCount}` : undefined} sx={{ position: 'sticky', left: `${streakLeft}px`, zIndex: 60, textAlign: 'center', backgroundColor: rowBg, px: 1 }}>
                      {showStreak && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                          <Box sx={{ width: compactView ? 28 : 36, height: compactView ? 4 : 6, borderRadius: 99, backgroundColor: 'divider', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${Math.min(streakCount / requiredCount, 1) * 100}%`, borderRadius: 99, backgroundColor: streakCount >= requiredCount ? 'success.main' : 'warning.main', transition: 'width 0.3s ease' }} />
                          </Box>
                          <Box sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1 }}>{streakCount}/{requiredCount}</Box>
                        </Box>
                      )}
                    </TableCell>
                    {tableDates.map(date => {
                      const dateStr = formatDateKey(date);
                      const completed = isCompleted(category, exercise, dateStr);
                      const isTodayColumn = isToday(date);
                      const isFuture = isFutureDate(date);
                      return (
                        <TableCell key={date.toISOString()} data-date-cell align="center" sx={{ borderColor: 'divider', backgroundColor: isTodayColumn ? theme.palette.action.selected : undefined, px: 0.5, py: 0.5 }}>
                          <Button
                            onClick={() => !isFuture && toggleCompletion(category, exercise, dateStr)}
                            disabled={isFuture}
                            fullWidth
                            size={compactView ? 'small' : 'medium'}
                            sx={{
                              borderRadius: 1,
                              minHeight: compactView ? 32 : 44,
                              py: 0,
                              backgroundColor: isFuture
                                ? theme.palette.action.disabledBackground
                                : completed
                                  ? 'success.main'
                                  : theme.palette.action.hover,
                              '&:hover': { backgroundColor: completed ? 'success.dark' : undefined },
                            }}
                          >
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
