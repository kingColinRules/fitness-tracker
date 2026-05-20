import React, { useState, useEffect, useRef, useMemo } from 'react';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs, { Dayjs } from 'dayjs';
import { createAppTheme } from './theme';
import { useAppStore } from './store';

import { generateDates, generateWeekDates, startOfWeek, formatDateKey, formatRange } from './utils/dateUtils';
import { getStoredHandle, storeHandle, generateExportJSON } from './utils/fileSystem';
import ExerciseTable from './components/ExerciseTable';
import StatsView from './components/StatsView';
import ScheduleView from './components/ScheduleView';
import SettingsModal from './components/SettingsModal';
import AddCategoryModal from './components/AddCategoryModal';
import AddExerciseModal from './components/AddExerciseModal';
import BadgesModal from './components/BadgesModal';

const ExerciseTracker = () => {
  const {
    exercises, completions, exerciseDescriptions, exerciseGoals, goalSettings, weeklySchedule,
    darkMode, compactView, chartMode, weekStartDay, defaultChartMode, animationsEnabled, showScheduleInLog, useCustomAppName, appName,
    hasUnsavedExport, setHasUnsavedExport, setChartMode,
    setExercises, setCompletions, setGoalSettings, setExerciseDescriptions,
  } = useAppStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [activeView, setActiveView] = useState('table');
  const [showSettings, setShowSettings] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => startOfWeek(new Date(), weekStartDay));
  const [selectedDateValue, setSelectedDateValue] = useState<Dayjs | null>(dayjs(new Date()));
  const [exerciseColumnWidth, setExerciseColumnWidth] = useState<number>(compactView ? 72 : 200);

  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const exerciseHeaderRef = useRef<HTMLTableCellElement>(null);
  const calendarAnchorRef = useRef<HTMLButtonElement>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  // Sync weekStartDate when weekStartDay setting changes
  useEffect(() => {
    setWeekStartDate(prev => startOfWeek(prev, weekStartDay)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [weekStartDay]);

  // Measure sticky exercise column width
  useEffect(() => {
    const measure = () => {
      const el = exerciseHeaderRef.current;
      if (el) setExerciseColumnWidth(el.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    const el = exerciseHeaderRef.current;
    const ro = el ? new ResizeObserver(measure) : null;
    ro?.observe(el!);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [compactView, selectedMonth, selectedYear, chartMode]);

  // Persist completions
  useEffect(() => {
    try {
      localStorage.setItem('exerciseCompletions', JSON.stringify(completions));
      localStorage.setItem('lastChangeDate', new Date().toISOString());
    } catch (e) { console.error('Storage error:', e); }
  }, [completions]);

  // Persist exercise list
  useEffect(() => {
    try { localStorage.setItem('exerciseList', JSON.stringify(exercises)); }
    catch (e) { console.error('Storage error:', e); }
  }, [exercises]);

  // Persist descriptions
  useEffect(() => {
    try { localStorage.setItem('exerciseDescriptions', JSON.stringify(exerciseDescriptions)); }
    catch (e) { console.error('Storage error:', e); }
  }, [exerciseDescriptions]);

  // Persist exercise goals
  useEffect(() => {
    try { localStorage.setItem('exerciseGoals', JSON.stringify(exerciseGoals)); }
    catch (e) { console.error('Storage error:', e); }
  }, [exerciseGoals]);

  // Persist weekly schedule
  useEffect(() => {
    try { localStorage.setItem('weeklySchedule', JSON.stringify(weeklySchedule)); }
    catch (e) { console.error('Storage error:', e); }
  }, [weeklySchedule]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem('exerciseSettings', JSON.stringify({ darkMode, compactView, goalSettings, defaultChartMode, weekStartDay, animationsEnabled, showScheduleInLog, useCustomAppName, appName }));
    } catch (e) { console.error('Storage error:', e); }
  }, [darkMode, compactView, goalSettings, defaultChartMode, weekStartDay, animationsEnabled, showScheduleInLog, useCustomAppName, appName]);

  const scrollToTodayImmediate = () => {
    const todayStr = formatDateKey(new Date());
    const container = tableWrapperRef.current;
    if (!container) return;
    const el = container.querySelector(`th[data-date="${todayStr}"]`) as HTMLElement | null;
    if (el) {
      const offset = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  };

  // Scroll to today when month/year/compactView changes
  useEffect(() => {
    const t = setTimeout(scrollToTodayImmediate, 150);
    return () => clearTimeout(t);
  }, [selectedMonth, selectedYear, compactView]);

  const dates = generateDates(selectedYear, selectedMonth);
  const tableDates = chartMode === 'weekly' ? generateWeekDates(weekStartDate) : dates;

  const today = new Date();
  const currentWeekStart = startOfWeek(today, weekStartDay);
  const isAtLatestPeriod = chartMode === 'weekly'
    ? weekStartDate >= currentWeekStart
    : selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  const prevPeriod = () => {
    if (chartMode === 'weekly') {
      setWeekStartDate(d => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      const d = new Date(selectedYear, selectedMonth - 1, 1);
      setSelectedMonth(d.getMonth());
      setSelectedYear(d.getFullYear());
      setSelectedDateValue(dayjs(d));
    }
  };

  const nextPeriod = () => {
    if (isAtLatestPeriod) return;
    if (chartMode === 'weekly') {
      setWeekStartDate(d => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      const d = new Date(selectedYear, selectedMonth + 1, 1);
      setSelectedMonth(d.getMonth());
      setSelectedYear(d.getFullYear());
      setSelectedDateValue(dayjs(d));
    }
  };

  const scrollToDate = (date: Date) => {
    const dateStr = formatDateKey(date);
    const container = tableWrapperRef.current;
    if (!container) return;
    const el = container.querySelector(`th[data-date="${dateStr}"]`) as HTMLElement | null;
    if (el) {
      const offset = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  };

  const writeJSON = async (handle: FileSystemFileHandle) => {
    const state = useAppStore.getState();
    const json = generateExportJSON(state.exercises, state.completions, state.goalSettings, state.exerciseDescriptions, state.weeklySchedule);
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    localStorage.setItem('lastExportDate', new Date().toISOString());
    setHasUnsavedExport(false);
  };

  const exportToJSON = async () => {
    const state = useAppStore.getState();
    const json = generateExportJSON(state.exercises, state.completions, state.goalSettings, state.exerciseDescriptions, state.weeklySchedule);
    if (!('showSaveFilePicker' in window)) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exercise-tracker.json';
      a.click();
      window.URL.revokeObjectURL(url);
      localStorage.setItem('lastExportDate', new Date().toISOString());
      setHasUnsavedExport(false);
      return;
    }
    try {
      const handle = await (window as Window & { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: 'exercise-tracker.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      fileHandleRef.current = handle;
      setSavedFileName(handle.name);
      await storeHandle(handle);
      await writeJSON(handle);
    } catch { /* user cancelled */ }
  };

  const saveToFile = async () => {
    if (fileHandleRef.current) {
      const perm = await (fileHandleRef.current as FileSystemFileHandle & { queryPermission: (opts: object) => Promise<string> }).queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') { await writeJSON(fileHandleRef.current); return; }
    }
    const stored = await getStoredHandle();
    if (stored) {
      const perm = await (stored as FileSystemFileHandle & { requestPermission: (opts: object) => Promise<string> }).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        fileHandleRef.current = stored;
        setSavedFileName(stored.name);
        await writeJSON(stored);
        return;
      }
    }
    setImportFeedback({ open: true, message: 'No save file set — use Export in settings first.', severity: 'info' });
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setImportFeedback({ open: true, message: 'Failed to read file.', severity: 'error' });
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;
      let parsed: unknown;
      try { parsed = JSON.parse(result); }
      catch { setImportFeedback({ open: true, message: 'Invalid JSON file.', severity: 'error' }); return; }
      if (
        typeof parsed !== 'object' || parsed === null ||
        !('version' in parsed) || !('exercises' in parsed) || !('completions' in parsed)
      ) {
        setImportFeedback({ open: true, message: 'Unrecognised file format — missing required fields.', severity: 'error' });
        return;
      }
      const data = parsed as {
        exercises: Record<string, string[]>;
        completions: Record<string, boolean>;
        goalSettings?: Record<string, { enabled: boolean; required: number }>;
        exerciseDescriptions?: Record<string, string>;
        weeklySchedule?: Record<string, { category: string; name: string }[]>;
      };
      setExercises(data.exercises);
      setCompletions(data.completions);
      if (data.goalSettings) setGoalSettings(data.goalSettings);
      if (data.exerciseDescriptions) setExerciseDescriptions(data.exerciseDescriptions);
      if (data.weeklySchedule) useAppStore.setState({ weeklySchedule: data.weeklySchedule });
      setHasUnsavedExport(true);
      setImportFeedback({
        open: true,
        message: `Imported ${Object.keys(data.completions).length} completions across ${Object.keys(data.exercises).length} categories`,
        severity: 'success',
      });
    };
    reader.readAsText(file);
  };

  const addCategory = (name: string, goalEnabled: boolean, goalRequired: number) => {
    if (name && !exercises[name]) {
      setExercises(prev => ({ ...prev, [name]: [] }));
      setGoalSettings(prev => ({ ...prev, [name]: { enabled: goalEnabled, required: goalRequired } }));
      setShowAddCategory(false);
    }
  };

  const addExercise = (name: string, category: string) => {
    setExercises(prev => ({ ...prev, [category]: [...prev[category], name] }));
    setShowAddExercise(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100%', minHeight: '100vh', overflow: 'auto', backgroundColor: 'background.default' }}>
        <AppBar position="static" elevation={2}>
          <Toolbar disableGutters sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, mx: 'auto' }}>
              <Typography variant="h4" onClick={() => window.location.reload()} sx={{ fontWeight: 700, cursor: 'pointer' }}>{useCustomAppName ? appName : 'Fitness Tracker'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MuiTooltip title={hasUnsavedExport ? 'Click to export' : 'All saved'}>
                  <span>
                    <IconButton onClick={hasUnsavedExport ? saveToFile : undefined} disabled={!hasUnsavedExport} color="inherit">
                      <SaveIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </span>
                </MuiTooltip>
                <IconButton onClick={() => setShowBadges(true)} color="inherit"><EmojiEventsIcon sx={{ fontSize: 20 }} /></IconButton>
                <IconButton onClick={() => setShowSettings(true)} color="inherit"><SettingsIcon sx={{ fontSize: 20 }} /></IconButton>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Box>
                <ToggleButtonGroup color="primary" value={activeView} exclusive onChange={(_e, val) => { if (val) setActiveView(val); }} size="small" aria-label="View">
                  <ToggleButton value="table">Log</ToggleButton>
                  <ToggleButton value="schedule">Schedule</ToggleButton>
                  <ToggleButton value="stats">Insights</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    views={chartMode === 'weekly' ? ['year', 'month', 'day'] : ['year', 'month']}
                    openTo={chartMode === 'weekly' ? 'day' : 'month'}
                    value={chartMode === 'weekly' ? dayjs(weekStartDate) : selectedDateValue}
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    onChange={(newVal) => {
                      if (!newVal) return;
                      const d = (newVal as Dayjs).toDate();
                      if (chartMode === 'weekly') {
                        setWeekStartDate(startOfWeek(d, weekStartDay));
                      } else {
                        setSelectedDateValue(newVal as Dayjs);
                        setSelectedMonth(d.getMonth());
                        setSelectedYear(d.getFullYear());
                        setWeekStartDate(startOfWeek(d, weekStartDay));
                        setTimeout(() => scrollToDate(d), 150);
                      }
                    }}
                    maxDate={dayjs()}
                    slotProps={{
                      textField: { sx: { display: 'none' } },
                      popper: { anchorEl: () => calendarAnchorRef.current },
                    }}
                  />
                </LocalizationProvider>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'inherit' }}>
                  {chartMode === 'weekly'
                    ? formatRange(weekStartDate, new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6))
                    : dayjs(selectedDateValue).format('MMMM YYYY')}
                </Typography>
                <IconButton ref={calendarAnchorRef} size="small" color="inherit" onClick={() => setPickerOpen(true)} aria-label="Open calendar">
                  <CalendarMonthIcon fontSize="small" />
                </IconButton>
                <ToggleButtonGroup color="primary" value={chartMode} exclusive onChange={(_e, val) => { if (val) { setExerciseColumnWidth(val === 'weekly' ? 160 : 100); setChartMode(val); } }} size="small" aria-label="Chart Mode">
                  <ToggleButton value="weekly">Week</ToggleButton>
                  <ToggleButton value="monthly">Month</ToggleButton>
                </ToggleButtonGroup>
                <IconButton onClick={prevPeriod} color="inherit" size="small" aria-label="Previous period"><ChevronLeftIcon /></IconButton>
                <IconButton onClick={nextPeriod} color="inherit" size="small" disabled={isAtLatestPeriod} aria-label="Next period"><ChevronRightIcon /></IconButton>
              </Box>
            </Box>

            {activeView === 'table' && (
              <ExerciseTable
                tableDates={tableDates}
                exerciseColumnWidth={exerciseColumnWidth}
                tableWrapperRef={tableWrapperRef}
                exerciseHeaderRef={exerciseHeaderRef}
              />
            )}

            {activeView === 'stats' && (
              <StatsView
                weekStartDate={weekStartDate}
                dates={dates}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            )}

            {activeView === 'schedule' && <ScheduleView />}
          </Box>
        </Box>

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onOpenAddCategory={() => setShowAddCategory(true)}
          onOpenAddExercise={() => setShowAddExercise(true)}
          savedFileName={savedFileName}
          exportToJSON={exportToJSON}
          importFromJSON={importFromJSON}
        />

        <AddCategoryModal
          key={showAddCategory ? 'add-category-open' : 'add-category-closed'}
          open={showAddCategory}
          onClose={() => setShowAddCategory(false)}
          onAdd={addCategory}
        />

        <AddExerciseModal
          key={showAddExercise ? 'add-exercise-open' : 'add-exercise-closed'}
          open={showAddExercise}
          onClose={() => setShowAddExercise(false)}
          onAdd={addExercise}
        />

        <BadgesModal
          open={showBadges}
          onClose={() => setShowBadges(false)}
          dates={dates}
        />

        <Snackbar
          open={importFeedback.open}
          autoHideDuration={5000}
          onClose={() => setImportFeedback(f => ({ ...f, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setImportFeedback(f => ({ ...f, open: false }))} severity={importFeedback.severity} variant="filled" sx={{ width: '100%' }}>
            {importFeedback.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default ExerciseTracker;
