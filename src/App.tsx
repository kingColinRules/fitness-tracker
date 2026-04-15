import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, Award, Save, BarChart2 } from 'lucide-react';
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
import { APP_NAME, DEFAULT_EXERCISES } from './constants';

import { generateDates, generateWeekDates, startOfWeek, formatDateKey, formatRange } from './utils/dateUtils';
import { getStoredHandle, storeHandle, generateExportJSON } from './utils/fileSystem';
import ExerciseTable from './components/ExerciseTable';
import HeatmapView from './components/HeatmapView';
import ChartView from './components/ChartView';
import SettingsModal from './components/SettingsModal';
import AddCategoryModal from './components/AddCategoryModal';
import AddExerciseModal from './components/AddExerciseModal';
import StatsModal from './components/StatsModal';
import BadgesModal from './components/BadgesModal';

const ExerciseTracker = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [activeView, setActiveView] = useState('table');
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [hasUnsavedExport, setHasUnsavedExport] = useState<boolean>(() => {
    try {
      const lastExport = localStorage.getItem('lastExportDate');
      const lastChange = localStorage.getItem('lastChangeDate');
      if (!lastExport) return false;
      if (lastChange) return new Date(lastChange) > new Date(lastExport);
    } catch { /* ignore */ }
    return false;
  });
  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [pickerOpen, setPickerOpen] = useState(false);

  const [goalSettings, setGoalSettings] = useState<Record<string, { enabled: boolean; required: number }>>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).goalSettings ?? { weight: { enabled: true, required: 3 }, isometric: { enabled: true, required: 2 }, stretch: { enabled: true, required: 2 } };
    } catch { /* ignore */ }
    return { weight: { enabled: true, required: 3 }, isometric: { enabled: true, required: 2 }, stretch: { enabled: true, required: 2 } };
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).darkMode ?? false;
    } catch { /* ignore */ }
    return false;
  });
  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);
  const [compactView, setCompactView] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).compactView ?? false;
    } catch { /* ignore */ }
    return false;
  });
  const [defaultChartMode, setDefaultChartMode] = useState<'weekly' | 'monthly'>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).defaultChartMode ?? 'weekly';
    } catch { /* ignore */ }
    return 'weekly';
  });
  const [weekStartDay, setWeekStartDay] = useState<number>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).weekStartDay ?? 1;
    } catch { /* ignore */ }
    return 1;
  });

  const [exercises, setExercises] = useState<Record<string, string[]>>(() => {
    try {
      const s = localStorage.getItem('exerciseList');
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return DEFAULT_EXERCISES;
  });
  const [completions, setCompletions] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('exerciseCompletions');
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return {};
  });

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const exerciseHeaderRef = useRef<HTMLTableCellElement>(null);
  const calendarAnchorRef = useRef<HTMLButtonElement>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const [exerciseColumnWidth, setExerciseColumnWidth] = useState<number>(compactView ? 72 : 200);
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>(defaultChartMode);
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => startOfWeek(new Date(), weekStartDay));
  const [selectedDateValue, setSelectedDateValue] = useState<Dayjs | null>(dayjs(new Date()));

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
  }, [compactView, selectedMonth, selectedYear]);

  // Persist completions
  useEffect(() => {
    try {
      localStorage.setItem('exerciseCompletions', JSON.stringify(completions));
      localStorage.setItem('lastChangeDate', new Date().toISOString());
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [completions]);

  // Persist exercise list
  useEffect(() => {
    try {
      localStorage.setItem('exerciseList', JSON.stringify(exercises));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [exercises]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem('exerciseSettings', JSON.stringify({ darkMode, compactView, goalSettings, defaultChartMode, weekStartDay }));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [darkMode, compactView, goalSettings, defaultChartMode, weekStartDay]);

  const handleWeekStartDayChange = (day: number) => {
    setWeekStartDay(day);
    setWeekStartDate(prev => startOfWeek(prev, day));
  };

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

  const toggleCompletion = (category: string, exercise: string, dateStr: string) => {
    const key = `${category}-${exercise}-${dateStr}`;
    setCompletions(prev => ({ ...prev, [key]: !prev[key] }));
    setHasUnsavedExport(true);
  };

  const writeJSON = async (handle: FileSystemFileHandle) => {
    const json = generateExportJSON(exercises, completions, goalSettings);
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    localStorage.setItem('lastExportDate', new Date().toISOString());
    setHasUnsavedExport(false);
  };

  const exportToJSON = async () => {
    const json = generateExportJSON(exercises, completions, goalSettings);
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
      try {
        parsed = JSON.parse(result);
      } catch {
        setImportFeedback({ open: true, message: 'Invalid JSON file.', severity: 'error' });
        return;
      }
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
      };
      setExercises(data.exercises);
      setCompletions(data.completions);
      if (data.goalSettings) setGoalSettings(data.goalSettings);
      setHasUnsavedExport(true);
      setImportFeedback({
        open: true,
        message: `Imported ${Object.keys(data.completions).length} completions across ${Object.keys(data.exercises).length} categories`,
        severity: 'success',
      });
    };
    reader.readAsText(file);
  };

  const addCategory = (name: string) => {
    const categoryKey = name.toLowerCase().replace(/\s+/g, '_');
    if (categoryKey && !exercises[categoryKey]) {
      setExercises(prev => ({ ...prev, [categoryKey]: [] }));
      setGoalSettings(prev => ({ ...prev, [categoryKey]: { enabled: true, required: 3 } }));
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
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{APP_NAME}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MuiTooltip title={hasUnsavedExport ? 'Click to export' : 'All saved'}>
                <span>
                  <IconButton onClick={hasUnsavedExport ? saveToFile : undefined} disabled={!hasUnsavedExport} color="inherit">
                    <Save size={20} />
                  </IconButton>
                </span>
              </MuiTooltip>
              <IconButton onClick={() => setShowStats(true)} color="inherit"><BarChart2 size={20} /></IconButton>
              <IconButton onClick={() => setShowBadges(true)} color="inherit"><Award size={20} /></IconButton>
              <IconButton onClick={() => setShowSettings(true)} color="inherit"><Settings size={20} /></IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box>
              <ToggleButtonGroup color="primary" value={activeView} exclusive onChange={(_e, val) => { if (val) setActiveView(val); }} size="small" aria-label="View">
                <ToggleButton value="table">Table</ToggleButton>
                <ToggleButton value="heatmap">Heatmap</ToggleButton>
                <ToggleButton value="chart">Chart</ToggleButton>
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
              <IconButton ref={calendarAnchorRef} size="small" color="inherit" onClick={() => setPickerOpen(true)}>
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
              <ToggleButtonGroup color="primary" value={chartMode} exclusive onChange={(_e, val) => { if (val) setChartMode(val); }} size="small" aria-label="Chart Mode">
                <ToggleButton value="weekly">Week</ToggleButton>
                <ToggleButton value="monthly">Month</ToggleButton>
              </ToggleButtonGroup>
              <IconButton onClick={prevPeriod} color="inherit" size="small"><ChevronLeftIcon /></IconButton>
              <IconButton onClick={nextPeriod} color="inherit" size="small" disabled={isAtLatestPeriod}><ChevronRightIcon /></IconButton>
            </Box>
          </Box>

          {activeView === 'table' && (
            <ExerciseTable
              exercises={exercises}
              completions={completions}
              goalSettings={goalSettings}
              tableDates={tableDates}
              chartMode={chartMode}
              compactView={compactView}
              exerciseColumnWidth={exerciseColumnWidth}
              weekStartDay={weekStartDay}
              tableWrapperRef={tableWrapperRef}
              exerciseHeaderRef={exerciseHeaderRef}
              toggleCompletion={toggleCompletion}
            />
          )}

          {activeView === 'heatmap' && (
            <HeatmapView
              dates={dates}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              weekStartDay={weekStartDay}
              exercises={exercises}
              completions={completions}
            />
          )}

          {activeView === 'chart' && (
            <ChartView
              exercises={exercises}
              completions={completions}
              chartMode={chartMode}
              weekStartDate={weekStartDate}
              dates={dates}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </Box>
      </Box>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        compactView={compactView}
        setCompactView={setCompactView}
        defaultChartMode={defaultChartMode}
        setDefaultChartMode={setDefaultChartMode}
        weekStartDay={weekStartDay}
        setWeekStartDay={handleWeekStartDayChange}
        setChartMode={setChartMode}
        exercises={exercises}
        setExercises={setExercises}
        completions={completions}
        setCompletions={setCompletions}
        goalSettings={goalSettings}
        setGoalSettings={setGoalSettings}
        onOpenAddCategory={() => setShowAddCategory(true)}
        onOpenAddExercise={() => setShowAddExercise(true)}
        hasUnsavedExport={hasUnsavedExport}
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
        exercises={exercises}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        exercises={exercises}
        completions={completions}
        dates={dates}
      />

      <BadgesModal
        open={showBadges}
        onClose={() => setShowBadges(false)}
        exercises={exercises}
        completions={completions}
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
