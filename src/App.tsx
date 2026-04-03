import React, { useState, useEffect, useRef } from 'react';
import { Settings, Award, Save } from 'lucide-react';
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs, { Dayjs } from 'dayjs';

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

const DEFAULT_EXERCISES = {
  weight: ['Bench Press', 'Squats', 'Deadlifts', 'Overhead Press', 'Rows'],
  isometric: ['Plank', 'Wall Sit', 'Hollow Body Hold', 'L-Sit'],
  stretch: ['Hamstring Stretch', 'Quad Stretch', 'Shoulder Stretch', 'Hip Flexor Stretch'],
};

const ExerciseTracker = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [activeView, setActiveView] = useState('table');
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [hasUnsavedExport, setHasUnsavedExport] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [pickerOpen, setPickerOpen] = useState(false);

  const [goalSettings, setGoalSettings] = useState<Record<string, { enabled: boolean; required: number }>>({
    weight: { enabled: true, required: 3 },
    isometric: { enabled: true, required: 2 },
    stretch: { enabled: true, required: 2 },
  });
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [defaultChartMode, setDefaultChartMode] = useState<'weekly' | 'monthly'>('weekly');
  const [weekStartDay, setWeekStartDay] = useState<number>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).weekStartDay ?? 1;
    } catch {}
    return 1;
  });

  const [exercises, setExercises] = useState<Record<string, string[]>>(DEFAULT_EXERCISES);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const exerciseHeaderRef = useRef<HTMLTableCellElement>(null);
  const calendarAnchorRef = useRef<HTMLButtonElement>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const [streakLeft, setStreakLeft] = useState<number>(compactView ? 72 : 200);
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).defaultChartMode || 'weekly';
    } catch {}
    return 'weekly';
  });
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => startOfWeek(new Date(), weekStartDay));
  const [selectedDateValue, setSelectedDateValue] = useState<Dayjs | null>(dayjs(new Date()));

  // Load persisted data
  useEffect(() => {
    try {
      const savedCompletions = localStorage.getItem('exerciseCompletions');
      const savedExercises = localStorage.getItem('exerciseList');
      const savedSettings = localStorage.getItem('exerciseSettings');

      if (savedCompletions) setCompletions(JSON.parse(savedCompletions));
      if (savedExercises) setExercises(JSON.parse(savedExercises));
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDarkMode(settings.darkMode || false);
        setCompactView(settings.compactView || false);
        setGoalSettings(prev => settings.goalSettings || prev);
        setDefaultChartMode(settings.defaultChartMode || 'weekly');
        setWeekStartDay(settings.weekStartDay ?? 1);
      }
    } catch (e) {
      console.error('Failed to load:', e);
    }
  }, []);

  // Scroll to today when month/year/compactView changes
  useEffect(() => {
    const t = setTimeout(scrollToTodayImmediate, 150);
    return () => clearTimeout(t);
  }, [selectedMonth, selectedYear, compactView]);

  // Measure sticky exercise column width
  useEffect(() => {
    const measure = () => {
      try {
        const el = exerciseHeaderRef.current as HTMLElement | null;
        if (el) setStreakLeft(el.offsetWidth);
      } catch {}
    };
    measure();
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | null = null;
    if (exerciseHeaderRef.current && (window as any).ResizeObserver) {
      ro = new ResizeObserver(measure);
      ro.observe(exerciseHeaderRef.current);
    }
    return () => {
      window.removeEventListener('resize', measure);
      if (ro && exerciseHeaderRef.current) ro.unobserve(exerciseHeaderRef.current);
    };
  }, [compactView, selectedMonth, selectedYear]);

  // Persist completions
  useEffect(() => {
    try {
      localStorage.setItem('exerciseCompletions', JSON.stringify(completions));
      localStorage.setItem('lastChangeDate', new Date().toISOString());
      const lastExport = localStorage.getItem('lastExportDate');
      if (lastExport) {
        const lastChange = new Date(localStorage.getItem('lastChangeDate')!);
        setHasUnsavedExport(lastChange > new Date(lastExport));
      } else {
        setHasUnsavedExport(true);
      }
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

  // Re-anchor week when weekStartDay changes
  useEffect(() => {
    setWeekStartDate(prev => startOfWeek(prev, weekStartDay));
  }, [weekStartDay]);

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
    try {
      const dateStr = formatDateKey(date);
      const container = tableWrapperRef.current;
      if (!container) return;
      const el = container.querySelector(`th[data-date="${dateStr}"]`) as HTMLElement | null;
      if (el) {
        const offset = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
      }
    } catch {}
  };

  const scrollToTodayImmediate = () => {
    try {
      const todayStr = formatDateKey(new Date());
      const container = tableWrapperRef.current;
      if (!container) return;
      const el = container.querySelector(`th[data-date="${todayStr}"]`) as HTMLElement | null;
      if (el) {
        const offset = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
      }
    } catch {}
  };

  const toggleCompletion = (category: string, exercise: string, dateStr: string) => {
    const key = `${category}-${exercise}-${dateStr}`;
    setCompletions(prev => ({ ...prev, [key]: !prev[key] }));
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
    if (!(window as any).showSaveFilePicker) {
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
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'exercise-tracker.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      fileHandleRef.current = handle;
      await storeHandle(handle);
      await writeJSON(handle);
    } catch {}
  };

  const saveToFile = async () => {
    if (fileHandleRef.current) {
      const perm = await (fileHandleRef.current as any).queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') { await writeJSON(fileHandleRef.current); return; }
    }
    const stored = await getStoredHandle();
    if (stored) {
      const perm = await (stored as any).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        fileHandleRef.current = stored;
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
      let parsed: any;
      try {
        parsed = JSON.parse(result);
      } catch {
        setImportFeedback({ open: true, message: 'Invalid JSON file.', severity: 'error' });
        return;
      }
      if (!parsed.version || !parsed.exercises || !parsed.completions) {
        setImportFeedback({ open: true, message: 'Unrecognised file format — missing required fields.', severity: 'error' });
        return;
      }
      setExercises(parsed.exercises);
      setCompletions(parsed.completions);
      if (parsed.goalSettings) setGoalSettings(parsed.goalSettings);
      setImportFeedback({
        open: true,
        message: `Imported ${Object.keys(parsed.completions).length} completions across ${Object.keys(parsed.exercises).length} categories`,
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

  const containerBg = darkMode ? 'rgba(17,24,39,1)' : 'rgba(249,250,251,1)';

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', overflow: 'auto', backgroundColor: containerBg }}>
      <AppBar position="static" elevation={2} sx={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: '#ffffff' }}>
        <Toolbar disableGutters sx={{ px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Fitness Tracker</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MuiTooltip title={hasUnsavedExport ? 'Click to export' : 'All saved'}>
                <span>
                  <IconButton onClick={hasUnsavedExport ? saveToFile : undefined} disabled={!hasUnsavedExport} color="inherit">
                    <Save size={20} />
                  </IconButton>
                </span>
              </MuiTooltip>
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
              darkMode={darkMode}
              streakLeft={streakLeft}
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
              darkMode={darkMode}
              exercises={exercises}
              completions={completions}
            />
          )}

          {activeView === 'chart' && (
            <ChartView
              exercises={exercises}
              completions={completions}
              darkMode={darkMode}
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
        setWeekStartDay={setWeekStartDay}
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
        fileHandleRef={fileHandleRef}
        exportToJSON={exportToJSON}
        importFromJSON={importFromJSON}
      />

      <AddCategoryModal
        key={showAddCategory ? 'open' : 'closed'}
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onAdd={addCategory}
        darkMode={darkMode}
      />

      <AddExerciseModal
        key={showAddExercise ? 'open' : 'closed'}
        open={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAdd={addExercise}
        exercises={exercises}
        darkMode={darkMode}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        darkMode={darkMode}
        exercises={exercises}
        completions={completions}
        dates={dates}
      />

      <BadgesModal
        open={showBadges}
        onClose={() => setShowBadges(false)}
        darkMode={darkMode}
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
  );
};

export default ExerciseTracker;
