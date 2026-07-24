import React, { useState, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CheckIcon from '@mui/icons-material/Check';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { alpha, useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { formatDateKey, isToday, isFutureDate, startOfWeek, generateWeekDates } from '../utils/dateUtils';
import { isCompleted as isCompletedUtil } from '../utils/completionUtils';
import { useAppStore } from '../store';
import LogLegend from './LogLegend';

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const MobileDayView: React.FC = () => {
  const { exercises, completions, goalSettings, exerciseGoals, weekStartDay, weeklySchedule, showScheduleInLog, toggleCompletion, exerciseDescriptions, showDescriptionsInLog, animationsEnabled } = useAppStore();
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const calendarAnchorRef = useRef<HTMLButtonElement>(null);

  const dateStr = formatDateKey(selectedDate);
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selectedDate.getDay()];

  const weekDates = useMemo(
    () => generateWeekDates(startOfWeek(selectedDate, weekStartDay)),
    [selectedDate, weekStartDay],
  );

  const isCompleted = (category: string, exercise: string): boolean =>
    isCompletedUtil(completions, category, exercise, dateStr);

  const calculateWeeklyCount = (category: string, exercise: string): number =>
    weekDates.filter(date =>
      !isFutureDate(date) && isCompletedUtil(completions, category, exercise, formatDateKey(date))
    ).length;

  const goToDay = (delta: number) => {
    setSelectedDate(d => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta);
      return next;
    });
  };

  const atToday = isToday(selectedDate);

  return (
    <Box>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
        <IconButton
          ref={calendarAnchorRef}
          onClick={() => setPickerOpen(true)}
          size="small"
          aria-label="Pick a date"
          sx={{ position: 'absolute', left: 0, p: 1.5 }}
        >
          <CalendarMonthIcon fontSize="small" />
        </IconButton>
        <IconButton onClick={() => goToDay(-1)} size="small" aria-label="Previous day" sx={{ p: 1.5 }}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 160, textAlign: 'center' }}>
          {atToday ? 'Today' : dayjs(selectedDate).format('ddd, MMM D')}
        </Typography>
        <IconButton onClick={() => goToDay(1)} size="small" aria-label="Next day" disabled={isFutureDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))} sx={{ p: 1.5 }}>
          <ChevronRightIcon />
        </IconButton>
        <IconButton
          onClick={() => setSelectedDate(startOfDay(new Date()))}
          size="small"
          disabled={atToday}
          aria-label="Jump to today"
          sx={{ position: 'absolute', right: 0, p: 1.5 }}
        >
          <LastPageIcon />
        </IconButton>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          value={dayjs(selectedDate)}
          onChange={(newVal) => { if (newVal) setSelectedDate(startOfDay((newVal as Dayjs).toDate())); }}
          maxDate={dayjs()}
          slotProps={{
            textField: { sx: { display: 'none' } },
            popper: { anchorEl: () => calendarAnchorRef.current },
          }}
        />
      </LocalizationProvider>

      {Object.entries(exercises).map(([category, exerciseList]) => (
        <Box key={category} sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', pl: 1, letterSpacing: '0.03em' }}
          >
            {category}
          </Typography>
          <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
            {exerciseList.map((exercise, i) => {
              const completed = isCompleted(category, exercise);
              const eg = exerciseGoals[`${category}-${exercise}`];
              const showProgress = goalSettings[category]?.enabled && !eg?.disabled;
              const weeklyRequired = (eg?.override && !eg?.disabled) ? eg.required : (goalSettings[category]?.required || 3);
              const weeklyCount = calculateWeeklyCount(category, exercise);
              const isFuture = isFutureDate(selectedDate);
              const scheduled = (weeklySchedule[dayName] ?? []).some(e => e.category === category && e.name === exercise);
              return (
                <Box
                  key={exercise}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.25,
                    borderTop: i > 0 ? `1px solid ${theme.palette.divider}` : 'none',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: isFuture ? 'text.disabled' : 'text.primary' }}>
                      {exercise}
                    </Typography>
                    {showDescriptionsInLog && exerciseDescriptions[`${category}-${exercise}`] && (
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, mt: 0.25 }}
                      >
                        {exerciseDescriptions[`${category}-${exercise}`]}
                      </Typography>
                    )}
                    {showProgress && (
                      <Typography variant="caption" sx={{ color: weeklyCount >= weeklyRequired ? 'success.main' : weeklyCount > 0 ? 'warning.main' : 'text.secondary' }}>
                        Goal: {weeklyCount}/{weeklyRequired} this week
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title={scheduled && !completed && !isFuture && showScheduleInLog ? (atToday ? 'Scheduled for today' : 'Scheduled') : ''} placement="top" arrow>
                    <ButtonBase
                      onClick={(e) => {
                        if (isFuture) return;
                        if (animationsEnabled && showProgress && !completed && weeklyCount === weeklyRequired - 1) {
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
                      disabled={isFuture}
                      aria-pressed={!isFuture && completed}
                      aria-label={`${exercise}, ${dayjs(selectedDate).format('MMM D')}`}
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isFuture
                          ? theme.palette.action.disabledBackground
                          : completed
                            ? 'success.main'
                            : scheduled && showScheduleInLog
                              ? alpha(theme.palette.primary.main, 0.1)
                              : theme.palette.action.hover,
                      }}
                    >
                      {completed && <CheckIcon sx={{ color: theme.palette.primary.contrastText }} />}
                    </ButtonBase>
                  </Tooltip>
                </Box>
              );
            })}
          </Paper>
        </Box>
      ))}

      <LogLegend />
    </Box>
  );
};

export default MobileDayView;
