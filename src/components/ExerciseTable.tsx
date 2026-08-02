import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import CheckIcon from '@mui/icons-material/Check';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import { useTheme, alpha } from '@mui/material/styles';
import dayjs from 'dayjs';
import { formatDateKey, isToday, isFutureDate } from '../utils/dateUtils';
import { isCompleted as isCompletedUtil } from '../utils/completionUtils';
import { useAppStore } from '../store';
import LogLegend from './LogLegend';


interface ExerciseTableProps {
  tableDates: Date[];
  exerciseColumnWidth: number;
  tableWrapperRef: React.RefObject<HTMLDivElement>;
  exerciseHeaderRef: React.RefObject<HTMLTableCellElement>;
}

const ExerciseTable: React.FC<ExerciseTableProps> = ({
  tableDates,
  exerciseColumnWidth,
  tableWrapperRef,
  exerciseHeaderRef,
}) => {
  const {
    exercises, completions, goalSettings, exerciseGoals, exerciseDescriptions, weeklySchedule,
    chartMode, weekStartDay, animationsEnabled, showScheduleInLog, showDescriptionsInLog,
    toggleCompletion, updateExerciseDescription,
  } = useAppStore();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverExercise, setPopoverExercise] = useState<{ category: string; name: string } | null>(null);
  const [popoverDesc, setPopoverDesc] = useState('');

  const openDescriptionPopover = (e: React.MouseEvent<HTMLElement>, category: string, exercise: string) => {
    setPopoverAnchor(e.currentTarget);
    setPopoverExercise({ category, name: exercise });
    setPopoverDesc(exerciseDescriptions[`${category}-${exercise}`] || '');
  };

  const closePopover = () => {
    setPopoverAnchor(null);
    setPopoverExercise(null);
    setPopoverDesc('');
  };

  const headerBg = theme.palette.stickyHeaderBg;
  const categoryBg = theme.palette.stickyCategoryBg;
  const rowBg = theme.palette.background.paper;


  const isCompleted = (category: string, exercise: string, dateStr: string): boolean =>
    isCompletedUtil(completions, category, exercise, dateStr);

  const calculateWeeklyCount = (category: string, exercise: string): number =>
    tableDates.filter(date =>
      !isFutureDate(date) && isCompleted(category, exercise, formatDateKey(date))
    ).length;

  // For confetti: always count within the current ISO week, not the full month range.
  const calculateCurrentWeekCount = (category: string, exercise: string): number => {
    if (chartMode !== 'monthly') return calculateWeeklyCount(category, exercise);
    const today = new Date();
    const startOffset = (today.getDay() - weekStartDay + 7) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - startOffset);
    weekStart.setHours(0, 0, 0, 0);
    return tableDates.filter(date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d >= weekStart && !isFutureDate(date) && isCompleted(category, exercise, formatDateKey(date));
    }).length;
  };

  const monthlyWeekGroups = useMemo(() => {
    if (chartMode !== 'monthly') return [];
    const groups: Date[][] = [];
    let week: Date[] = [];
    for (const d of tableDates) {
      if (week.length > 0 && d.getDay() === weekStartDay) {
        groups.push(week);
        week = [];
      }
      week.push(d);
    }
    if (week.length > 0) groups.push(week);
    return groups.filter(w => w.length === 7);
  }, [tableDates, chartMode, weekStartDay]);

  return (
    <>
    <TableContainer ref={tableWrapperRef} component={Paper}>
      <Table sx={{ width: '100%' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: headerBg }}>
            <TableCell ref={exerciseHeaderRef} sx={{ position: 'sticky', left: 0, zIndex: 70, minWidth: chartMode === 'weekly' ? 160 : 100, backgroundColor: headerBg, color: 'text.primary' }}>Exercise</TableCell>
            <TableCell data-sticky-end sx={{ position: 'sticky', left: `${exerciseColumnWidth}px`, zIndex: 60, textAlign: 'center', minWidth: 44, backgroundColor: headerBg, color: 'text.primary' }}>{chartMode === 'monthly' ? 'Wk Goals' : 'Goal'}</TableCell>
            {tableDates.map(date => (
              <TableCell key={date.toISOString()} data-date={formatDateKey(date)} align="center" sx={{ minWidth: chartMode === 'weekly' ? 80 : 24, borderColor: 'divider', borderBottom: isToday(date) ? `2px solid ${theme.palette.primary.main}` : undefined, color: 'text.primary', lineHeight: 1.2, px: 0.25, ...(chartMode === 'monthly' && date.getDay() === weekStartDay && { borderLeft: `2px solid ${theme.palette.divider}`, pl: 1 }), ...(chartMode === 'monthly' && date.getDay() === (weekStartDay + 6) % 7 && { pr: 1 }) }}>
                <Box sx={{ fontSize: theme.typography.labelXs.fontSize, opacity: 0.7 }}>{dayjs(date).format('ddd')}</Box>
                <Box sx={{ fontSize: theme.typography.caption.fontSize }}>{chartMode === 'weekly' ? dayjs(date).format('DD MMM') : String(date.getDate()).padStart(2, '0')}</Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(exercises).map(([category, exerciseList]) => (
            <React.Fragment key={category}>
              <TableRow sx={{ backgroundColor: categoryBg }}>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', position: 'sticky', left: 0, zIndex: 80, backgroundColor: categoryBg, color: isDark ? theme.palette.primary.light : 'text.primary', py: 1.25 }}>{category}</TableCell>
                <TableCell colSpan={tableDates.length + 1} sx={{ backgroundColor: categoryBg }} />
              </TableRow>
              {exerciseList.map((exercise) => {
                const weeklyCount = calculateWeeklyCount(category, exercise);
                const currentWeekCount = calculateCurrentWeekCount(category, exercise);
                const eg = exerciseGoals[`${category}-${exercise}`];
                const showProgress = goalSettings[category]?.enabled && !eg?.disabled;
                const weeklyRequired = (eg?.override && !eg?.disabled) ? eg.required : (goalSettings[category]?.required || 3);
                return (
                  <TableRow key={exercise}>
                    <TableCell sx={{ fontWeight: 500, position: 'sticky', left: 0, zIndex: 70, backgroundColor: rowBg, color: 'text.primary', maxWidth: chartMode === 'weekly' ? 200 : 130, pr: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exercise}</Box>
                      {showDescriptionsInLog && (
                        <Typography
                          variant="caption"
                          onClick={(e) => openDescriptionPopover(e, category, exercise)}
                          sx={{ color: exerciseDescriptions[`${category}-${exercise}`] ? 'text.secondary' : 'text.disabled', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, mt: 0.25, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                        >
                          {exerciseDescriptions[`${category}-${exercise}`] || 'Add description…'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: `${exerciseColumnWidth}px`, zIndex: 60, textAlign: 'center', backgroundColor: rowBg, px: 1 }}>
                      {showProgress && (
                        chartMode === 'monthly' ? (
                          <Box sx={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {monthlyWeekGroups.map((week, wi) => {
                              const wCount = week.filter(d => !isFutureDate(d) && isCompleted(category, exercise, formatDateKey(d))).length;
                              const allFuture = week.every(d => isFutureDate(d));
                              const met = wCount >= weeklyRequired;
                              const partial = wCount > 0 && !met;
                              return (
                                <Box
                                  key={wi}
                                  title={allFuture ? 'Upcoming' : met ? 'Goal met' : `${wCount}/${weeklyRequired}`}
                                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}
                                >
                                  <Box sx={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    backgroundColor: met ? 'success.main' : partial ? 'warning.main' : 'divider',
                                    opacity: allFuture ? 0.35 : 1,
                                  }} />
                                  <Box sx={{ fontSize: theme.typography.labelMicro.fontSize, color: 'text.disabled', lineHeight: 1, opacity: allFuture ? 0.35 : 1 }}>{wi + 1}</Box>
                                </Box>
                              );
                            })}
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                            <Box sx={{ width: 28, height: 6, borderRadius: 99, backgroundColor: 'divider', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${Math.min(weeklyCount / weeklyRequired, 1) * 100}%`, borderRadius: 99, backgroundColor: weeklyCount >= weeklyRequired ? 'success.main' : weeklyCount > 0 ? 'warning.main' : 'text.secondary', transition: 'width 0.3s ease' }} />
                            </Box>
                            <Box sx={{ fontSize: theme.typography.labelMicro.fontSize, color: 'text.secondary', lineHeight: 1 }}>{weeklyCount}/{weeklyRequired}</Box>
                          </Box>
                        )
                      )}
                    </TableCell>
                    {tableDates.map(date => {
                      const dateStr = formatDateKey(date);
                      const completed = isCompleted(category, exercise, dateStr);
                      const isFuture = isFutureDate(date);
                      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
                      const scheduled = (weeklySchedule[dayName] ?? []).some(e => e.category === category && e.name === exercise);
                      return (
                        <TableCell key={date.toISOString()} data-date-cell align="center" sx={{ borderColor: 'divider', px: chartMode === 'monthly' ? 0.25 : 0.5, py: 0.5, ...(chartMode === 'monthly' && date.getDay() === weekStartDay && { borderLeft: `2px solid ${theme.palette.divider}`, pl: 1 }), ...(chartMode === 'monthly' && date.getDay() === (weekStartDay + 6) % 7 && { pr: 1 }) }}>
                          <Tooltip title={scheduled && !completed && !isFuture && showScheduleInLog ? (isToday(date) ? 'Scheduled for today' : 'Scheduled') : ''} placement="top" arrow>
                          <Button
                            onClick={(e) => {
                              if (isFuture) return;
                              if (animationsEnabled && showProgress && !completed && currentWeekCount === weeklyRequired - 1) {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                confetti({
                                  particleCount: 80,
                                  spread: 60,
                                  origin: {
                                    x: (rect.left + rect.width / 2) / window.innerWidth,
                                    y: (rect.top + rect.height / 2) / window.innerHeight,
                                  },
                                  zIndex: 9999,
                                });
                              }
                              toggleCompletion(category, exercise, dateStr);
                            }}
                            aria-label={`${exercise}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            aria-pressed={!isFuture && completed}
                            disabled={isFuture}
                            fullWidth
                            sx={{
                              borderRadius: 1,
                              height: 44,
                              minWidth: 0,
                              p: 0,
                              overflow: 'hidden',
                              backgroundColor: isFuture
                                ? theme.palette.action.disabledBackground
                                : completed
                                  ? 'success.main'
                                  : scheduled && showScheduleInLog
                                    ? alpha(theme.palette.primary.main, 0.1)
                                    : theme.palette.action.hover,
                              '&:hover': { backgroundColor: completed ? 'success.dark' : undefined },
                            }}
                          >
                            {completed
                              ? <CheckIcon sx={{ color: theme.palette.primary.contrastText, fontSize: chartMode === 'monthly' ? 16 : 20 }} />
                              : null}
                          </Button>
                          </Tooltip>
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

    <LogLegend />

    <Popover
      open={Boolean(popoverAnchor)}
      anchorEl={popoverAnchor}
      onClose={closePopover}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <Box sx={{ p: 2.5, width: { xs: 'calc(100vw - 32px)', sm: 360 }, maxWidth: 'calc(100vw - 32px)' }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>{popoverExercise?.name}</Typography>
        <TextField
          value={popoverDesc}
          onChange={(e) => setPopoverDesc(e.target.value)}
          multiline
          rows={5}
          fullWidth
          size="small"
          placeholder="Add a description..."
          autoFocus
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={closePopover}>Cancel</Button>
          <Button size="small" variant="contained" onClick={() => { if (popoverExercise) updateExerciseDescription(popoverExercise.category, popoverExercise.name, popoverDesc.trim()); closePopover(); }}>Save</Button>
        </Box>
      </Box>
    </Popover>
    </>
  );
};

export default ExerciseTable;
