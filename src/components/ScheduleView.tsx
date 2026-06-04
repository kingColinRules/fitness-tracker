import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import { alpha, useTheme } from '@mui/material/styles';
import type {} from '../theme';
import { useAppStore } from '../store';
import type { WeeklyScheduleEntry } from '../store';
import { formatDateKey } from '../utils/dateUtils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY = new Date();
const TODAY_IDX = (TODAY.getDay() + 6) % 7;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Weight:    <FitnessCenterIcon sx={{ fontSize: 11 }} />,
  Isometric: <AccessibilityNewIcon sx={{ fontSize: 11 }} />,
  Stretch:   <SelfImprovementIcon sx={{ fontSize: 11 }} />,
};

// ─── Weekly view ───────────────────────────────────────────────────────────

const ExerciseChip: React.FC<{
  id: string;
  exercise: WeeklyScheduleEntry;
  color: string;
  onRemove: () => void;
  overlay?: boolean;
}> = ({ id, exercise, color, onRemove, overlay }) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{ opacity: isDragging ? 0 : 1 }}
    >
      <Chip
        size="small"
        label={exercise.name}
        onDelete={overlay ? undefined : onRemove}
        icon={
          <Box sx={{ display: 'flex', alignItems: 'center', color }}>
            {CATEGORY_ICONS[exercise.category] ?? null}
          </Box>
        }
        sx={{
          fontSize: theme.typography.labelSm.fontSize,
          height: 24,
          borderRadius: 1.5,
          cursor: 'grab',
          backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.1),
          color: 'text.primary',
          border: `1px solid ${alpha(color, 0.35)}`,
          '& .MuiChip-deleteIcon': { fontSize: 14, color: alpha(color, 0.6), '&:hover': { color } },
          '& .MuiChip-icon': { ml: '6px', mr: '-2px' },
          boxShadow: overlay ? 4 : 0,
        }}
        {...attributes}
        {...listeners}
      />
    </Box>
  );
};

const DroppableList: React.FC<{
  day: string;
  itemIds: string[];
  children: React.ReactNode;
}> = ({ day, itemIds, children }) => {
  const { setNodeRef } = useDroppable({ id: `col::${day}` });
  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <Box ref={setNodeRef} sx={{ flex: 1, p: 1, display: 'flex', flexDirection: 'column', gap: 0.75, minHeight: 80 }}>
        {children}
      </Box>
    </SortableContext>
  );
};

const WeekColumn: React.FC<{
  day: string;
  dayIdx: number;
  exercises: WeeklyScheduleEntry[];
  allExercises: Record<string, string[]>;
  weeklySchedule: Record<string, WeeklyScheduleEntry[]>;
  categoryColors: Record<string, string>;
  onRemove: (idx: number) => void;
  onAdd: (exs: WeeklyScheduleEntry[]) => void;
}> = ({ day, dayIdx, exercises, allExercises, weeklySchedule, categoryColors, onRemove, onAdd }) => {
  const theme = useTheme();
  const { exerciseGoals, goalSettings } = useAppStore();
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const getRemaining = (cat: string, name: string): number | null => {
    const eg = exerciseGoals[`${cat}-${name}`];
    if (!goalSettings[cat]?.enabled || eg?.disabled) return null;
    const required = (eg?.override && !eg?.disabled) ? eg.required : (goalSettings[cat]?.required ?? 3);
    const scheduled = Object.values(weeklySchedule).flat().filter(e => e.category === cat && e.name === name).length;
    return Math.max(0, required - scheduled);
  };
  const isToday = dayIdx === TODAY_IDX;
  const isRest = exercises.length === 0;

  const itemIds = exercises.map(ex => `${day}::${ex.category}::${ex.name}`);

  const grouped = Object.entries(allExercises).reduce<Record<string, string[]>>((acc, [cat, names]) => {
    const avail = names.filter(name => !exercises.some(s => s.category === cat && s.name === name));
    if (avail.length > 0) acc[cat] = avail;
    return acc;
  }, {});

  const available = Object.entries(grouped).flatMap(([cat, names]) =>
    names.map(name => ({ category: cat, name }))
  );

  const toggleKey = (cat: string, name: string) => {
    const key = `${cat}-${name}`;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const toAdd = available.filter(ex => selected.has(`${ex.category}-${ex.name}`));
    if (toAdd.length > 0) onAdd(toAdd);
    setPickerAnchor(null);
    setSelected(new Set());
  };

  const handleClose = () => {
    setPickerAnchor(null);
    setSelected(new Set());
  };

  return (
    <Box sx={{
      flex: 1, minWidth: 120,
      display: 'flex', flexDirection: 'column',
      borderRadius: 2,
      border: isToday ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
      backgroundColor: 'background.paper',
      overflow: 'hidden',
    }}>
      <Box sx={{
        px: 1.5, py: 1,
        backgroundColor: isToday ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.divider, 0.4),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography variant="labelLg" sx={{ fontWeight: 700, color: isToday ? 'primary.main' : 'text.secondary', letterSpacing: 0.5 }}>
          {day}
        </Typography>
      </Box>

      <Divider />

      <DroppableList day={day} itemIds={itemIds}>
        {isRest ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
            <Typography variant="labelSm" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Rest day</Typography>
          </Box>
        ) : (
          exercises.map((ex, i) => (
            <ExerciseChip
              key={`${ex.category}::${ex.name}`}
              id={`${day}::${ex.category}::${ex.name}`}
              exercise={ex}
              color={categoryColors[ex.category] ?? theme.palette.text.secondary}
              onRemove={() => onRemove(i)}
            />
          ))
        )}
      </DroppableList>

      <Divider />

      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
        <IconButton
          size="small"
          disabled={available.length === 0}
          onClick={(e) => setPickerAnchor(e.currentTarget)}
          sx={{ opacity: available.length === 0 ? 0.3 : 0.7, '&:hover': { opacity: 1 }, transition: 'opacity 0.2s ease' }}
        >
          <AddIcon sx={{ fontSize: theme.typography.iconSm.fontSize }} />
        </IconButton>
      </Box>

      <Popover
        open={Boolean(pickerAnchor)}
        anchorEl={pickerAnchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box sx={{ minWidth: 200, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ maxHeight: 280, overflowY: 'auto', py: 0.5 }}>
            {Object.entries(grouped).map(([cat, names]) => {
              const color = categoryColors[cat] ?? theme.palette.text.secondary;
              return (
                <Box key={cat}>
                  <Typography variant="labelXs" sx={{ px: 1.5, py: 0.5, display: 'block', color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {cat}
                  </Typography>
                  {names.map(name => {
                    const key = `${cat}-${name}`;
                    const isSelected = selected.has(key);
                    return (
                      <Box
                        key={name}
                        onClick={() => toggleKey(cat, name)}
                        sx={{ px: 1, py: 0.25, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' }, display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          disableRipple
                          sx={{ p: 0.5, color, '&.Mui-checked': { color } }}
                        />
                        <Typography variant="labelSm" sx={{ flex: 1 }}>{name}</Typography>
                        {(() => {
                          const rem = getRemaining(cat, name);
                          if (rem === null) return null;
                          if (rem === 0) return <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'success.main', flexShrink: 0 }} />;
                          return <Typography variant="labelXs" sx={{ color: alpha(color, 0.8), fontWeight: 700, flexShrink: 0 }}>+{rem}</Typography>;
                        })()}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
          <Divider />
          <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="contained"
              disabled={selected.size === 0}
              onClick={handleConfirm}
            >
              Add{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

const WeekView: React.FC<{
  weeklySchedule: Record<string, WeeklyScheduleEntry[]>;
  allExercises: Record<string, string[]>;
  categoryColors: Record<string, string>;
  onRemove: (day: string, idx: number) => void;
  onAdd: (day: string, exs: WeeklyScheduleEntry[]) => void;
  setWeeklySchedule: (v: ((prev: Record<string, WeeklyScheduleEntry[]>) => Record<string, WeeklyScheduleEntry[]>)) => void;
}> = ({ weeklySchedule, allExercises, categoryColors, onRemove, onAdd, setWeeklySchedule }) => {
  const theme = useTheme();
  const [activeItem, setActiveItem] = useState<{ exercise: WeeklyScheduleEntry; color: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = ({ active }: DragStartEvent) => {
    const [day, cat, name] = (active.id as string).split('::');
    const exercise = (weeklySchedule[day] ?? []).find(e => e.category === cat && e.name === name);
    if (exercise) setActiveItem({ exercise, color: categoryColors[exercise.category] ?? theme.palette.text.secondary });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveItem(null);
    if (!over || active.id === over.id) return;

    const [activeDay, activeCat, activeName] = (active.id as string).split('::');
    const overId = over.id as string;
    const isColDrop = overId.startsWith('col::');
    const overDay = isColDrop ? overId.slice(5) : overId.split('::')[0];
    const [, overCat, overName] = isColDrop ? [] : overId.split('::');

    setWeeklySchedule(prev => {
      const sourceArr = [...(prev[activeDay] ?? [])];
      const fromIdx = sourceArr.findIndex(e => e.category === activeCat && e.name === activeName);
      if (fromIdx === -1) return prev;

      if (activeDay === overDay) {
        const toIdx = sourceArr.findIndex(e => e.category === overCat && e.name === overName);
        if (toIdx === -1) return prev;
        return { ...prev, [activeDay]: arrayMove(sourceArr, fromIdx, toIdx) };
      }

      const [moved] = sourceArr.splice(fromIdx, 1);
      const destArr = [...(prev[overDay] ?? [])];
      const toIdx = isColDrop ? destArr.length : destArr.findIndex(e => e.category === overCat && e.name === overName);
      destArr.splice(toIdx === -1 ? destArr.length : toIdx, 0, moved);
      return { ...prev, [activeDay]: sourceArr, [overDay]: destArr };
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
        {DAYS.map((day, i) => (
          <WeekColumn
            key={day} day={day} dayIdx={i}
            exercises={weeklySchedule[day] ?? []}
            allExercises={allExercises}
            weeklySchedule={weeklySchedule}
            categoryColors={categoryColors}
            onRemove={(idx) => onRemove(day, idx)}
            onAdd={(exs) => onAdd(day, exs)}
          />
        ))}
      </Box>
      <DragOverlay>
        {activeItem && (
          <ExerciseChip
            id="overlay"
            exercise={activeItem.exercise}
            color={activeItem.color}
            onRemove={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

// ─── Monthly view ──────────────────────────────────────────────────────────

const buildCalendarGrid = (year: number, month: number): (Date | null)[][] => {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
};

const MAX_VISIBLE = 2;

const CalendarCell: React.FC<{
  date: Date | null;
  weeklySchedule: Record<string, WeeklyScheduleEntry[]>;
  completions: Record<string, boolean>;
  categoryColors: Record<string, string>;
  allExercises: Record<string, string[]>;
}> = ({ date, weeklySchedule, completions, categoryColors, allExercises }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!date) return <Box sx={{ flex: 1, minWidth: 0 }} />;

  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const t = new Date(TODAY); t.setHours(0, 0, 0, 0);

  const isTodayCell = d.getTime() === t.getTime();
  const isPast = d < t;
  const isFuture = d > t;

  const dayName = DAYS[(date.getDay() + 6) % 7];
  const catOrder = Object.keys(allExercises);
  const planned = [...(weeklySchedule[dayName] ?? [])].sort((a, b) => {
    const catDiff = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    const list = allExercises[a.category] ?? [];
    return list.indexOf(a.name) - list.indexOf(b.name);
  });
  const isRest = planned.length === 0;
  const dateStr = formatDateKey(date);

  const exDone = (ex: WeeklyScheduleEntry) => !!completions[`${ex.category}-${ex.name}-${dateStr}`];

  const doneCount = isPast ? planned.filter(exDone).length : 0;
  const total = planned.length;
  const pct = total > 0 ? doneCount / total : 0;

  const barColor = !isPast || isRest ? 'transparent'
    : pct === 1 ? theme.palette.success.main
    : pct > 0   ? theme.palette.warning.main
    : theme.palette.error.main;

  const visible = planned.slice(0, MAX_VISIBLE);
  const overflow = planned.length - MAX_VISIBLE;

  const tooltipContent = overflow > 0 ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', py: 0.5 }}>
      {planned.map((ex, i) => {
        const done = exDone(ex);
        const color = categoryColors[ex.category] ?? '#888';
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, backgroundColor: color }} />
            <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{ex.name}</span>
          </Box>
        );
      })}
    </Box>
  ) : '';

  return (
    <Tooltip title={tooltipContent} placement="top" arrow disableInteractive>
    <Box sx={{
      flex: 1, minWidth: 0,
      border: isTodayCell ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
      borderRadius: 1.5,
      backgroundColor: 'background.paper',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      minHeight: { xs: 64, sm: 110 },
    }}>
      <Box sx={{
        px: 1, py: 0.5,
        backgroundColor: isTodayCell ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.divider, 0.4),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography variant="labelLg" sx={{ fontWeight: 700, color: isTodayCell ? 'primary.main' : 'text.secondary', letterSpacing: 0.5 }}>
          {date.getDate()}
        </Typography>
        {isPast && !isRest && total > 0 && (
          <Typography variant="labelXs" sx={{ color: barColor, fontWeight: 700, lineHeight: 1 }}>
            {doneCount}/{total}
          </Typography>
        )}
      </Box>

      <Divider />

      <Box sx={{ flex: 1, px: 0.75, pt: 0.5, pb: 0.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {isRest ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
            <Typography variant="labelSm" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Rest day</Typography>
          </Box>
        ) : (
          <>
            {visible.map((ex, i) => {
              const done = exDone(ex);
              const color = categoryColors[ex.category] ?? theme.palette.text.secondary;
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0, backgroundColor: alpha(color, 0.9) }} />
                  <Typography variant="labelSm" sx={{
                    lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'text.primary',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {ex.name}
                  </Typography>
                </Box>
              );
            })}
            {overflow > 0 && (
              <Typography variant="labelXs" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>+{overflow} more</Typography>
            )}
          </>
        )}
      </Box>

      {isPast && !isRest && total > 0 && (
        <Box sx={{ height: 3, backgroundColor: alpha(barColor, 0.15) }}>
          <Box sx={{ height: '100%', width: `${pct * 100}%`, backgroundColor: barColor }} />
        </Box>
      )}
    </Box>
    </Tooltip>
  );
};

const MonthView: React.FC<{
  weeklySchedule: Record<string, WeeklyScheduleEntry[]>;
  completions: Record<string, boolean>;
  categoryColors: Record<string, string>;
  allExercises: Record<string, string[]>;
  year: number;
  month: number;
}> = ({ weeklySchedule, completions, categoryColors, allExercises, year, month }) => {
  const theme = useTheme();
  const weeks = buildCalendarGrid(year, month);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75 }}>
        {DAYS.map(d => (
          <Box key={d} sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="labelXs" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5 }}>{d}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {weeks.map((week, wi) => (
          <Box key={wi} sx={{ display: 'flex', gap: 0.75 }}>
            {week.map((date, di) => (
              <CalendarCell key={di} date={date} weeklySchedule={weeklySchedule} completions={completions} categoryColors={categoryColors} allExercises={allExercises} />
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: 'All done', color: theme.palette.success.main },
          { label: 'Partial',  color: theme.palette.warning.main },
          { label: 'Missed',   color: theme.palette.error.main },
        ].map(({ label, color }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 3, borderRadius: 99, backgroundColor: color }} />
            <Typography variant="labelXs" sx={{ color: 'text.secondary' }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Root ──────────────────────────────────────────────────────────────────

const ScheduleView: React.FC<{ selectedMonth: number; selectedYear: number }> = ({ selectedMonth, selectedYear }) => {
  const { chartMode, weeklySchedule, setWeeklySchedule, exercises, completions, goalSettings, exerciseGoals } = useAppStore();
  const theme = useTheme();
  const isMonth = chartMode === 'monthly';

  const categoryColors = useMemo(
    () => Object.fromEntries(
      Object.keys(exercises).map((cat, idx) => [cat, theme.palette.chartColors[idx % theme.palette.chartColors.length]])
    ),
    [exercises, theme.palette.chartColors],
  );

  const scheduleProgress = useMemo(
    () => Object.fromEntries(
      Object.entries(exercises).map(([cat, names]) => {
        if (!goalSettings[cat]?.enabled) return [cat, null];
        const sessions = Object.values(weeklySchedule).flat().filter(e => e.category === cat).length;
        const goal = names.reduce((sum, name) => {
          const eg = exerciseGoals[`${cat}-${name}`];
          if (eg?.disabled) return sum;
          return sum + (eg?.override ? eg.required : goalSettings[cat].required);
        }, 0);
        return [cat, { sessions, goal }];
      })
    ),
    [exercises, weeklySchedule, goalSettings, exerciseGoals],
  );

  const handleRemove = (day: string, idx: number) =>
    setWeeklySchedule(prev => ({ ...prev, [day]: (prev[day] ?? []).filter((_, i) => i !== idx) }));

  const catOrder = Object.keys(exercises);
  const sortByCategory = (arr: WeeklyScheduleEntry[]) =>
    [...arr].sort((a, b) => {
      const catDiff = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      const list = exercises[a.category] ?? [];
      return list.indexOf(a.name) - list.indexOf(b.name);
    });

  useEffect(() => {
    setWeeklySchedule(prev =>
      Object.fromEntries(Object.entries(prev).map(([day, exs]) => [day, sortByCategory(exs)]))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (day: string, exs: WeeklyScheduleEntry[]) =>
    setWeeklySchedule(prev => ({ ...prev, [day]: sortByCategory([...(prev[day] ?? []), ...exs]) }));

  return (
    <Box sx={{ borderRadius: 2, boxShadow: 2, px: 3, pt: 2, pb: 3, backgroundColor: 'background.paper' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {isMonth ? 'Monthly Schedule' : 'Weekly Schedule'}
        </Typography>
        <Typography variant="labelSm" sx={{ color: 'text.secondary' }}>
          {isMonth
            ? 'How your weekly schedule maps across this month'
            : 'Your repeating weekly plan'}
        </Typography>
      </Box>

      {isMonth
        ? <MonthView weeklySchedule={weeklySchedule} completions={completions} categoryColors={categoryColors} allExercises={exercises} year={selectedYear} month={selectedMonth} />
        : <WeekView weeklySchedule={weeklySchedule} allExercises={exercises} categoryColors={categoryColors} onRemove={handleRemove} onAdd={handleAdd} setWeeklySchedule={setWeeklySchedule} />}

      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        {Object.keys(exercises).map(cat => {
          const progress = scheduleProgress[cat];
          return (
            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: categoryColors[cat] }} />
              <Typography variant="labelSm" sx={{ color: 'text.secondary' }}>{cat}</Typography>
              {progress && (
                <Typography variant="labelXs" sx={{ color: progress.sessions < progress.goal ? 'warning.main' : 'success.main' }}>
                  ({progress.sessions}/{progress.goal} scheduled)
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ScheduleView;
