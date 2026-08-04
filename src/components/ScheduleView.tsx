import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import { alpha, useTheme } from '@mui/material/styles';
import { useAppStore } from '../store';
import type { WeeklyScheduleEntry, WeeklySchedule } from '../store';
import type { Exercise } from '../types';
import { formatDateKey } from '../utils/dateUtils';
import { isCompleted as isCompletedUtil } from '../utils/completionUtils';
import { buildExerciseIndex, sortByExerciseOrder, getRemainingForExercise } from '../utils/scheduleUtils';
import type { ExerciseIndex } from '../utils/scheduleUtils';
import { CHART_COLORS } from '../theme';

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
  name: string;
  category: string;
  color: string;
  onRemove: () => void;
  overlay?: boolean;
}> = ({ id, name, category, color, onRemove, overlay }) => {
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
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
            <DragIndicatorIcon sx={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }} />
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </Box>
          </Box>
        }
        onDelete={overlay ? undefined : onRemove}
        icon={
          <Box sx={{ display: 'flex', alignItems: 'center', color }}>
            {CATEGORY_ICONS[category] ?? null}
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

const ExercisePickerContent: React.FC<{
  grouped: Record<string, Exercise[]>;
  categoryColors: Record<string, string>;
  getRemaining: (exerciseId: string) => number | null;
  onConfirm: (exs: WeeklyScheduleEntry[]) => void;
}> = ({ grouped, categoryColors, getRemaining, onConfirm }) => {
  const theme = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleId = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const toAdd = Object.values(grouped).flat()
      .filter(ex => selected.has(ex.id))
      .map(ex => ({ exerciseId: ex.id }));
    if (toAdd.length > 0) onConfirm(toAdd);
  };

  return (
    <Box sx={{ minWidth: 200, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ maxHeight: 280, overflowY: 'auto', py: 0.5 }}>
        {Object.entries(grouped).map(([cat, exs]) => {
          const color = categoryColors[cat] ?? theme.palette.text.secondary;
          return (
            <Box key={cat}>
              <Typography variant="labelXs" sx={{ px: 1.5, py: 0.5, display: 'block', color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {cat}
              </Typography>
              {exs.map(ex => {
                const isSelected = selected.has(ex.id);
                return (
                  <Box
                    key={ex.id}
                    onClick={() => toggleId(ex.id)}
                    sx={{ px: 1, py: 0.25, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' }, display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Checkbox
                      checked={isSelected}
                      size="small"
                      disableRipple
                      sx={{ p: 0.5, color, '&.Mui-checked': { color } }}
                    />
                    <Typography variant="labelSm" sx={{ flex: 1 }}>{ex.name}</Typography>
                    {(() => {
                      const rem = getRemaining(ex.id);
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
        <Button size="small" variant="contained" disabled={selected.size === 0} onClick={handleConfirm}>
          Add{selected.size > 0 ? ` (${selected.size})` : ''}
        </Button>
      </Box>
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
  allExercises: Record<string, Exercise[]>;
  weeklySchedule: WeeklySchedule;
  exerciseIndex: ExerciseIndex;
  categoryColors: Record<string, string>;
  onRemove: (idx: number) => void;
  onAdd: (exs: WeeklyScheduleEntry[]) => void;
}> = ({ day, dayIdx, exercises, allExercises, weeklySchedule, exerciseIndex, categoryColors, onRemove, onAdd }) => {
  const theme = useTheme();
  const { exerciseGoals, goalSettings } = useAppStore();
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);

  // Filter out stale references (e.g. an imported file referencing an exercise deleted elsewhere)
  // before sorting/rendering — see plan's "orphan handling at render time".
  const visible = exercises.filter(e => exerciseIndex.has(e.exerciseId));

  const getRemaining = (exerciseId: string): number | null =>
    getRemainingForExercise(exerciseId, exerciseIndex, weeklySchedule, goalSettings, exerciseGoals);

  const isToday = dayIdx === TODAY_IDX;
  const isRest = visible.length === 0;

  const itemIds = visible.map(ex => `${day}::${ex.exerciseId}`);

  const scheduledIds = new Set(visible.map(e => e.exerciseId));
  const grouped = Object.entries(allExercises).reduce<Record<string, Exercise[]>>((acc, [cat, exs]) => {
    const avail = exs.filter(ex => !scheduledIds.has(ex.id));
    if (avail.length > 0) acc[cat] = avail;
    return acc;
  }, {});

  const available = Object.values(grouped).flat();

  const handleClose = () => setPickerAnchor(null);

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
          visible.map((ex) => {
            const info = exerciseIndex.get(ex.exerciseId)!;
            return (
              <ExerciseChip
                key={ex.exerciseId}
                id={`${day}::${ex.exerciseId}`}
                name={info.name}
                category={info.category}
                color={categoryColors[info.category] ?? theme.palette.text.secondary}
                onRemove={() => onRemove(exercises.findIndex(e => e.exerciseId === ex.exerciseId))}
              />
            );
          })
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
        <ExercisePickerContent
          grouped={grouped}
          categoryColors={categoryColors}
          getRemaining={getRemaining}
          onConfirm={(exs) => { onAdd(exs); setPickerAnchor(null); }}
        />
      </Popover>
    </Box>
  );
};

const WeekView: React.FC<{
  weeklySchedule: WeeklySchedule;
  allExercises: Record<string, Exercise[]>;
  exerciseIndex: ExerciseIndex;
  categoryColors: Record<string, string>;
  onRemove: (day: string, idx: number) => void;
  onAdd: (day: string, exs: WeeklyScheduleEntry[]) => void;
  setWeeklySchedule: (v: ((prev: WeeklySchedule) => WeeklySchedule)) => void;
}> = ({ weeklySchedule, allExercises, exerciseIndex, categoryColors, onRemove, onAdd, setWeeklySchedule }) => {
  const theme = useTheme();
  const [activeItem, setActiveItem] = useState<{ name: string; category: string; color: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = ({ active }: DragStartEvent) => {
    const [, exerciseId] = (active.id as string).split('::');
    const info = exerciseIndex.get(exerciseId);
    if (info) setActiveItem({ name: info.name, category: info.category, color: categoryColors[info.category] ?? theme.palette.text.secondary });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveItem(null);
    if (!over || active.id === over.id) return;

    const [activeDay, activeExerciseId] = (active.id as string).split('::');
    const overId = over.id as string;
    const isColDrop = overId.startsWith('col::');
    const overDay = isColDrop ? overId.slice(5) : overId.split('::')[0];
    const overExerciseId = isColDrop ? undefined : overId.split('::')[1];

    setWeeklySchedule(prev => {
      const sourceArr = [...(prev[activeDay] ?? [])];
      const fromIdx = sourceArr.findIndex(e => e.exerciseId === activeExerciseId);
      if (fromIdx === -1) return prev;

      if (activeDay === overDay) {
        if (isColDrop) {
          return { ...prev, [activeDay]: arrayMove(sourceArr, fromIdx, sourceArr.length - 1) };
        }
        const toIdx = sourceArr.findIndex(e => e.exerciseId === overExerciseId);
        if (toIdx === -1) return prev;
        return { ...prev, [activeDay]: arrayMove(sourceArr, fromIdx, toIdx) };
      }

      const [moved] = sourceArr.splice(fromIdx, 1);
      const destArr = [...(prev[overDay] ?? [])];
      const toIdx = isColDrop ? destArr.length : destArr.findIndex(e => e.exerciseId === overExerciseId);
      destArr.splice(toIdx === -1 ? destArr.length : toIdx, 0, moved);
      return { ...prev, [activeDay]: sourceArr, [overDay]: destArr };
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', overflowX: 'auto', pb: 0.5 }}>
        {DAYS.map((day, i) => (
          <WeekColumn
            key={day} day={day} dayIdx={i}
            exercises={weeklySchedule[day] ?? []}
            allExercises={allExercises}
            weeklySchedule={weeklySchedule}
            exerciseIndex={exerciseIndex}
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
            name={activeItem.name}
            category={activeItem.category}
            color={activeItem.color}
            onRemove={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

// ─── Mobile weekly editor ───────────────────────────────────────────────────

const MobileScheduleRow: React.FC<{
  id: string;
  name: string;
  color: string;
  isLast: boolean;
  onRemove: () => void;
  onMoveClick: (anchor: HTMLElement) => void;
}> = ({ id, name, color, isLast, onRemove, onMoveClick }) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25,
        borderBottom: isLast ? 'none' : `1px solid ${theme.palette.divider}`,
        opacity: isDragging ? 0.3 : 1,
        backgroundColor: 'background.paper',
      }}
    >
      <Box {...attributes} {...listeners} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', cursor: 'grab', touchAction: 'none', p: 1.5, m: -1.5 }}>
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, backgroundColor: color }} />
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{name}</Typography>
      <Tooltip title="Reorder or move to another day">
        <IconButton size="small" onClick={(e) => onMoveClick(e.currentTarget)} aria-label="Reorder or move to another day" sx={{ p: 1.5 }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <IconButton size="small" onClick={onRemove} aria-label="Remove" sx={{ p: 1.5 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

const MobileWeekEditor: React.FC<{
  weeklySchedule: WeeklySchedule;
  allExercises: Record<string, Exercise[]>;
  exerciseIndex: ExerciseIndex;
  categoryColors: Record<string, string>;
  setWeeklySchedule: (v: ((prev: WeeklySchedule) => WeeklySchedule)) => void;
}> = ({ weeklySchedule, allExercises, exerciseIndex, categoryColors, setWeeklySchedule }) => {
  const theme = useTheme();
  const { exerciseGoals, goalSettings } = useAppStore();
  const [dayIdx, setDayIdx] = useState(TODAY_IDX);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [moveMenu, setMoveMenu] = useState<{ anchor: HTMLElement; idx: number } | null>(null);

  const day = DAYS[dayIdx];
  // Filter out stale references before rendering — see plan's "orphan handling at render time".
  const exercises = (weeklySchedule[day] ?? []).filter(e => exerciseIndex.has(e.exerciseId));
  const itemIds = exercises.map(ex => ex.exerciseId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setWeeklySchedule(prev => {
      const list = (prev[day] ?? []).filter(e => exerciseIndex.has(e.exerciseId));
      const fromIdx = list.findIndex(ex => ex.exerciseId === active.id);
      const toIdx = list.findIndex(ex => ex.exerciseId === over.id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      return { ...prev, [day]: arrayMove(list, fromIdx, toIdx) };
    });
  };

  const handleRemove = (idx: number) =>
    setWeeklySchedule(prev => {
      const list = (prev[day] ?? []).filter(e => exerciseIndex.has(e.exerciseId));
      return { ...prev, [day]: list.filter((_, i) => i !== idx) };
    });

  const handleMoveTo = (idx: number, toDay: string) => {
    setWeeklySchedule(prev => {
      const src = (prev[day] ?? []).filter(e => exerciseIndex.has(e.exerciseId));
      const moved = src[idx];
      if (!moved) return prev;
      const newSrc = src.filter((_, i) => i !== idx);
      const dest = sortByExerciseOrder([...(prev[toDay] ?? []), moved], exerciseIndex);
      return { ...prev, [day]: newSrc, [toDay]: dest };
    });
    setMoveMenu(null);
  };

  const handleReorder = (idx: number, delta: -1 | 1) => {
    setWeeklySchedule(prev => {
      const list = (prev[day] ?? []).filter(e => exerciseIndex.has(e.exerciseId));
      return { ...prev, [day]: arrayMove(list, idx, idx + delta) };
    });
    setMoveMenu(null);
  };

  const handleAdd = (exs: WeeklyScheduleEntry[]) => {
    setWeeklySchedule(prev => ({ ...prev, [day]: sortByExerciseOrder([...(prev[day] ?? []), ...exs], exerciseIndex) }));
    setPickerAnchor(null);
  };

  const getRemaining = (exerciseId: string): number | null =>
    getRemainingForExercise(exerciseId, exerciseIndex, weeklySchedule, goalSettings, exerciseGoals);

  const scheduledIds = new Set(exercises.map(e => e.exerciseId));
  const grouped = Object.entries(allExercises).reduce<Record<string, Exercise[]>>((acc, [cat, exs]) => {
    const avail = exs.filter(ex => !scheduledIds.has(ex.id));
    if (avail.length > 0) acc[cat] = avail;
    return acc;
  }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.375, mb: 1.5, overflowX: 'auto' }}>
        {DAYS.map((d, i) => {
          const hasExercises = (weeklySchedule[d] ?? []).length > 0;
          const isSelected = i === dayIdx;
          const isTodayCol = i === TODAY_IDX;
          return (
            <ButtonBase
              key={d}
              onClick={() => setDayIdx(i)}
              aria-label={`Go to ${d}`}
              sx={{
                width: 36, minHeight: 52, flexShrink: 0, borderRadius: 1.5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                backgroundColor: isSelected ? 'primary.main' : 'transparent',
                border: `1px solid ${isSelected ? theme.palette.primary.main : isTodayCol ? theme.palette.primary.main : 'transparent'}`,
              }}
            >
              <Typography variant="labelXs" sx={{ fontWeight: 700, color: isSelected ? 'primary.contrastText' : isTodayCol ? 'primary.main' : 'text.secondary' }}>
                {d}
              </Typography>
              <Box sx={{
                width: 4, height: 4, borderRadius: '50%',
                backgroundColor: hasExercises ? (isSelected ? theme.palette.primary.contrastText : theme.palette.success.main) : 'transparent',
              }} />
            </ButtonBase>
          );
        })}
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {exercises.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="labelSm" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Rest day</Typography>
              </Box>
            ) : (
              exercises.map((ex, i) => {
                const info = exerciseIndex.get(ex.exerciseId)!;
                return (
                  <MobileScheduleRow
                    key={ex.exerciseId}
                    id={ex.exerciseId}
                    name={info.name}
                    color={categoryColors[info.category] ?? theme.palette.text.secondary}
                    isLast={i === exercises.length - 1}
                    onRemove={() => handleRemove(i)}
                    onMoveClick={(anchor) => setMoveMenu({ anchor, idx: i })}
                  />
                );
              })
            )}
          </Paper>
        </SortableContext>
      </DndContext>

      <Button
        fullWidth
        startIcon={<AddIcon />}
        onClick={(e) => setPickerAnchor(e.currentTarget)}
        disabled={Object.keys(grouped).length === 0}
        sx={{ mt: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'divider', color: 'text.secondary' }}
      >
        Add exercise
      </Button>

      <Popover
        open={Boolean(pickerAnchor)}
        anchorEl={pickerAnchor}
        onClose={() => setPickerAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <ExercisePickerContent grouped={grouped} categoryColors={categoryColors} getRemaining={getRemaining} onConfirm={handleAdd} />
      </Popover>

      <Menu open={Boolean(moveMenu)} anchorEl={moveMenu?.anchor} onClose={() => setMoveMenu(null)}>
        <MenuItem disabled={moveMenu?.idx === 0} onClick={() => moveMenu && handleReorder(moveMenu.idx, -1)}>Move up</MenuItem>
        <MenuItem disabled={moveMenu?.idx === exercises.length - 1} onClick={() => moveMenu && handleReorder(moveMenu.idx, 1)}>Move down</MenuItem>
        <Divider />
        {DAYS.filter(d => d !== day).map(d => (
          <MenuItem key={d} onClick={() => moveMenu && handleMoveTo(moveMenu.idx, d)}>Move to {d}</MenuItem>
        ))}
      </Menu>
    </Box>
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
  weeklySchedule: WeeklySchedule;
  completions: Record<string, boolean>;
  categoryColors: Record<string, string>;
  exerciseIndex: ExerciseIndex;
}> = ({ date, weeklySchedule, completions, categoryColors, exerciseIndex }) => {
  const theme = useTheme();

  if (!date) return <Box sx={{ flex: 1, minWidth: 0 }} />;

  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const t = new Date(TODAY); t.setHours(0, 0, 0, 0);

  const isTodayCell = d.getTime() === t.getTime();
  const isPast = d < t;

  const dayName = DAYS[(date.getDay() + 6) % 7];
  const planned = sortByExerciseOrder(
    (weeklySchedule[dayName] ?? []).filter(e => exerciseIndex.has(e.exerciseId)),
    exerciseIndex,
  );
  const isRest = planned.length === 0;
  const dateStr = formatDateKey(date);

  const exDone = (ex: WeeklyScheduleEntry) => isCompletedUtil(completions, ex.exerciseId, dateStr);

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
        const info = exerciseIndex.get(ex.exerciseId)!;
        const color = categoryColors[info.category] ?? '#888';
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, backgroundColor: color }} />
            <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{info.name}</span>
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
              const info = exerciseIndex.get(ex.exerciseId)!;
              const color = categoryColors[info.category] ?? theme.palette.text.secondary;
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0, backgroundColor: alpha(color, 0.9) }} />
                  <Typography variant="labelSm" sx={{
                    flex: 1, minWidth: 0,
                    lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'text.primary',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {info.name}
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
  weeklySchedule: WeeklySchedule;
  completions: Record<string, boolean>;
  categoryColors: Record<string, string>;
  exerciseIndex: ExerciseIndex;
  year: number;
  month: number;
}> = ({ weeklySchedule, completions, categoryColors, exerciseIndex, year, month }) => {
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
              <CalendarCell key={di} date={date} weeklySchedule={weeklySchedule} completions={completions} categoryColors={categoryColors} exerciseIndex={exerciseIndex} />
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
  const isMonth = chartMode === 'monthly';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const categoryColors = useMemo(
    () => Object.fromEntries(
      Object.keys(exercises).map((cat, idx) => [cat, CHART_COLORS[idx % CHART_COLORS.length]])
    ),
    [exercises],
  );

  const exerciseIndex = useMemo(() => buildExerciseIndex(exercises), [exercises]);

  const scheduleProgress = useMemo(
    () => Object.fromEntries(
      Object.entries(exercises).map(([cat, exs]) => {
        if (!goalSettings[cat]?.enabled) return [cat, null];
        const sessions = Object.values(weeklySchedule).flat().filter(e => exerciseIndex.get(e.exerciseId)?.category === cat).length;
        const goal = exs.reduce((sum, ex) => {
          const eg = exerciseGoals[ex.id];
          if (eg?.disabled) return sum;
          return sum + (eg?.override ? eg.required : goalSettings[cat].required);
        }, 0);
        return [cat, { sessions, goal }];
      })
    ),
    [exercises, weeklySchedule, goalSettings, exerciseGoals, exerciseIndex],
  );

  const handleRemove = (day: string, idx: number) =>
    setWeeklySchedule(prev => ({ ...prev, [day]: (prev[day] ?? []).filter((_, i) => i !== idx) }));

  useEffect(() => {
    setWeeklySchedule(prev =>
      Object.fromEntries(Object.entries(prev).map(([day, exs]) => [day, sortByExerciseOrder(exs, exerciseIndex)]))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (day: string, exs: WeeklyScheduleEntry[]) =>
    setWeeklySchedule(prev => ({ ...prev, [day]: [...(prev[day] ?? []), ...sortByExerciseOrder(exs, exerciseIndex)] }));

  return (
    <Box sx={isMobile ? {} : { borderRadius: 2, boxShadow: 2, px: { xs: 1.5, sm: 3 }, pt: 2, pb: { xs: 2, sm: 3 }, backgroundColor: 'background.paper' }}>
      {!isMobile && (
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
      )}

      {isMobile ? (
        <MobileWeekEditor weeklySchedule={weeklySchedule} allExercises={exercises} exerciseIndex={exerciseIndex} categoryColors={categoryColors} setWeeklySchedule={setWeeklySchedule} />
      ) : isMonth ? (
        <MonthView weeklySchedule={weeklySchedule} completions={completions} categoryColors={categoryColors} exerciseIndex={exerciseIndex} year={selectedYear} month={selectedMonth} />
      ) : (
        <WeekView weeklySchedule={weeklySchedule} allExercises={exercises} exerciseIndex={exerciseIndex} categoryColors={categoryColors} onRemove={handleRemove} onAdd={handleAdd} setWeeklySchedule={setWeeklySchedule} />
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.keys(exercises).map(cat => {
          const progress = scheduleProgress[cat];
          return (
            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: categoryColors[cat] }} />
              <Typography variant="labelXs" sx={{ color: 'text.secondary' }}>{cat}</Typography>
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
