import React, { useState, useEffect, useRef, useMemo } from 'react';
import MuiBadge from '@mui/material/Badge';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
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
import LastPageIcon from '@mui/icons-material/LastPage';
import dayjs, { Dayjs } from 'dayjs';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createAppTheme } from './theme';
import { useAppStore } from './store';

import { generateDates, generateWeekDates, startOfWeek, formatDateKey, formatRange } from './utils/dateUtils';
import { getStoredHandle, storeHandle, generateExportJSON } from './utils/fileSystem';
import { validateImportData, validateCurrentImportData } from './utils/importValidation';
import { migrateExerciseData } from './utils/migration';
import { generateId } from './utils/id';
import type { Exercise, WeeklyScheduleEntry } from './types';
import ExerciseTable from './components/ExerciseTable';
import MobileDayView from './components/MobileDayView';
import StatsView from './components/StatsView';
import ScheduleView from './components/ScheduleView';
import SettingsModal from './components/SettingsModal';
import AddCategoryModal from './components/AddCategoryModal';
import AddExerciseModal from './components/AddExerciseModal';
import BadgesModal from './components/BadgesModal';
import { useBadges } from './hooks/useBadges';

const ExerciseTracker = () => {
  const {
    exercises, completions, exerciseDescriptions, exerciseGoals, goalSettings, weeklySchedule,
    darkMode, chartMode, weekStartDay, defaultChartMode, animationsEnabled, showScheduleInLog, showDescriptionsInLog, useCustomAppName, appName,
    hasUnsavedExport, setHasUnsavedExport, setChartMode,
    setExercises, setCompletions, setGoalSettings, setExerciseDescriptions, setExerciseGoals,
    setDarkMode, setDefaultChartMode, setWeekStartDay, setAnimationsEnabled,
    setShowScheduleInLog, setShowDescriptionsInLog, setUseCustomAppName, setAppName, setSeenBadges,
    seenBadges,
  } = useAppStore();

  const { hasNewBadges } = useBadges();

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
  const [exerciseColumnWidth, setExerciseColumnWidth] = useState<number>(200);

  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  }, [selectedMonth, selectedYear, chartMode]);

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
      localStorage.setItem('exerciseSettings', JSON.stringify({ darkMode, goalSettings, defaultChartMode, weekStartDay, animationsEnabled, showScheduleInLog, showDescriptionsInLog, useCustomAppName, appName }));
    } catch (e) { console.error('Storage error:', e); }
  }, [darkMode, goalSettings, defaultChartMode, weekStartDay, animationsEnabled, showScheduleInLog, showDescriptionsInLog, useCustomAppName, appName]);

  useEffect(() => {
    try { localStorage.setItem('seenBadges', JSON.stringify(seenBadges)); }
    catch (e) { console.error('Storage error:', e); }
  }, [seenBadges]);

  // Sticky "Exercise"/"Goal" header columns cover the left edge of the
  // scroll container at every scroll position — centering against the
  // full clientWidth can land a target column underneath them.
  const getStickyWidth = (container: HTMLElement): number => {
    const el = container.querySelector('[data-sticky-end]') as HTMLElement | null;
    return el ? el.offsetLeft + el.offsetWidth : 0;
  };

  const scrollToTodayImmediate = () => {
    const todayStr = formatDateKey(new Date());
    const container = tableWrapperRef.current;
    if (!container) return;
    const el = container.querySelector(`th[data-date="${todayStr}"]`) as HTMLElement | null;
    if (el) {
      const stickyWidth = getStickyWidth(container);
      const freeWidth = container.clientWidth - stickyWidth;
      const offset = el.offsetLeft - stickyWidth - (freeWidth / 2) + (el.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  };

  // Scroll to today when month/year changes
  useEffect(() => {
    const t = setTimeout(scrollToTodayImmediate, 150);
    return () => clearTimeout(t);
  }, [selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const jumpToToday = () => {
    const now = new Date();
    if (chartMode === 'weekly') {
      setWeekStartDate(startOfWeek(now, weekStartDay));
    } else {
      setSelectedMonth(now.getMonth());
      setSelectedYear(now.getFullYear());
      setSelectedDateValue(dayjs(now));
    }
    setTimeout(scrollToTodayImmediate, 150);
  };

  // Mobile Insights: independent Week/Month period, separate from the Log/Schedule chartMode
  // so switching it doesn't affect what those tabs show (same relationship the old custom-range
  // picker had — mobile-Insights-only, no cross-tab effects).
  const [insightsMobileMode, setInsightsMobileMode] = useState<'weekly' | 'monthly'>('weekly');
  const [insightsMobileWeekStart, setInsightsMobileWeekStart] = useState<Date>(() => startOfWeek(new Date(), weekStartDay));
  const [insightsMobileMonth, setInsightsMobileMonth] = useState(() => new Date().getMonth());
  const [insightsMobileYear, setInsightsMobileYear] = useState(() => new Date().getFullYear());
  const [insightsMobilePickerOpen, setInsightsMobilePickerOpen] = useState(false);
  const insightsMobileCalendarAnchorRef = useRef<HTMLButtonElement>(null);
  const insightsMobileDates = generateDates(insightsMobileYear, insightsMobileMonth);

  const insightsMobileToday = new Date();
  const insightsMobileCurrentWeekStart = startOfWeek(insightsMobileToday, weekStartDay);
  const insightsMobileIsAtLatest = insightsMobileMode === 'weekly'
    ? insightsMobileWeekStart >= insightsMobileCurrentWeekStart
    : insightsMobileYear === insightsMobileToday.getFullYear() && insightsMobileMonth === insightsMobileToday.getMonth();

  const insightsMobilePrevPeriod = () => {
    if (insightsMobileMode === 'weekly') {
      setInsightsMobileWeekStart(d => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      const d = new Date(insightsMobileYear, insightsMobileMonth - 1, 1);
      setInsightsMobileMonth(d.getMonth());
      setInsightsMobileYear(d.getFullYear());
    }
  };

  const insightsMobileNextPeriod = () => {
    if (insightsMobileIsAtLatest) return;
    if (insightsMobileMode === 'weekly') {
      setInsightsMobileWeekStart(d => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      const d = new Date(insightsMobileYear, insightsMobileMonth + 1, 1);
      setInsightsMobileMonth(d.getMonth());
      setInsightsMobileYear(d.getFullYear());
    }
  };

  const insightsMobileJumpToToday = () => {
    const now = new Date();
    if (insightsMobileMode === 'weekly') {
      setInsightsMobileWeekStart(startOfWeek(now, weekStartDay));
    } else {
      setInsightsMobileMonth(now.getMonth());
      setInsightsMobileYear(now.getFullYear());
    }
  };

  const scrollToDate = (date: Date) => {
    const dateStr = formatDateKey(date);
    const container = tableWrapperRef.current;
    if (!container) return;
    const el = container.querySelector(`th[data-date="${dateStr}"]`) as HTMLElement | null;
    if (el) {
      const stickyWidth = getStickyWidth(container);
      const freeWidth = container.clientWidth - stickyWidth;
      const offset = el.offsetLeft - stickyWidth - (freeWidth / 2) + (el.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  };

  const writeJSON = async (handle: FileSystemFileHandle) => {
    const state = useAppStore.getState();
    const json = generateExportJSON(
      state.exercises, state.completions, state.goalSettings, state.exerciseDescriptions, state.weeklySchedule,
      state.exerciseGoals,
      { darkMode: state.darkMode, defaultChartMode: state.defaultChartMode, weekStartDay: state.weekStartDay, animationsEnabled: state.animationsEnabled, showScheduleInLog: state.showScheduleInLog, showDescriptionsInLog: state.showDescriptionsInLog, useCustomAppName: state.useCustomAppName, appName: state.appName, seenBadges: state.seenBadges },
    );
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    localStorage.setItem('lastExportDate', new Date().toISOString());
    setHasUnsavedExport(false);
  };

  const exportToJSON = async () => {
    const state = useAppStore.getState();
    const json = generateExportJSON(
      state.exercises, state.completions, state.goalSettings, state.exerciseDescriptions, state.weeklySchedule,
      state.exerciseGoals,
      { darkMode: state.darkMode, defaultChartMode: state.defaultChartMode, weekStartDay: state.weekStartDay, animationsEnabled: state.animationsEnabled, showScheduleInLog: state.showScheduleInLog, showDescriptionsInLog: state.showDescriptionsInLog, useCustomAppName: state.useCustomAppName, appName: state.appName, seenBadges: state.seenBadges },
    );
    if (!('showSaveFilePicker' in window)) {
      // iOS Safari requires the anchor to actually be in the DOM to honor a
      // synthetic click, and revoking the object URL synchronously can race
      // the download before it starts — so append/remove and delay the revoke.
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exercise-tracker.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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
    if (!('showSaveFilePicker' in window)) { await exportToJSON(); return; }
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
      const validation = validateImportData(parsed);
      if (validation.valid === false) {
        setImportFeedback({ open: true, message: `Import failed: ${validation.error}`, severity: 'error' });
        return;
      }
      type Preferences = {
        darkMode?: boolean;
        defaultChartMode?: 'weekly' | 'monthly';
        weekStartDay?: number;
        animationsEnabled?: boolean;
        showScheduleInLog?: boolean;
        showDescriptionsInLog?: boolean;
        useCustomAppName?: boolean;
        appName?: string;
        seenBadges?: string[];
      };
      const versioned = parsed as { version: number };
      let data: {
        exercises: Record<string, Exercise[]>;
        completions: Record<string, boolean>;
        goalSettings?: Record<string, { enabled: boolean; required: number }>;
        exerciseDescriptions?: Record<string, string>;
        weeklySchedule?: Record<string, WeeklyScheduleEntry[]>;
        exerciseGoals?: Record<string, { override: boolean; required: number; disabled?: boolean }>;
        preferences?: Preferences;
      };
      if (versioned.version === 1) {
        // The legacy (pre-id-migration) export shape — this branch must never be removed, since a
        // file exported before the migration can be imported at any point in the future.
        const legacy = parsed as {
          exercises: Record<string, string[]>;
          completions: Record<string, boolean>;
          goalSettings?: Record<string, { enabled: boolean; required: number }>;
          exerciseDescriptions?: Record<string, string>;
          weeklySchedule?: Record<string, { category: string; name: string }[]>;
          exerciseGoals?: Record<string, { override: boolean; required: number; disabled?: boolean }>;
          preferences?: Preferences;
        };
        const migrated = migrateExerciseData({
          exercises: legacy.exercises,
          completions: legacy.completions,
          exerciseDescriptions: legacy.exerciseDescriptions ?? {},
          exerciseGoals: legacy.exerciseGoals ?? {},
          weeklySchedule: legacy.weeklySchedule ?? {},
        });
        data = {
          ...legacy,
          exercises: migrated.exercises,
          completions: migrated.completions,
          exerciseDescriptions: migrated.exerciseDescriptions,
          exerciseGoals: migrated.exerciseGoals,
          weeklySchedule: migrated.weeklySchedule,
        };
      } else {
        data = parsed as typeof data;
      }
      const revalidation = validateCurrentImportData(data as unknown as Record<string, unknown>);
      if (revalidation.valid === false) {
        setImportFeedback({ open: true, message: `Import failed: ${revalidation.error}`, severity: 'error' });
        return;
      }
      setExercises(data.exercises);
      setCompletions(data.completions);
      if (data.goalSettings) setGoalSettings(data.goalSettings);
      if (data.exerciseDescriptions) setExerciseDescriptions(data.exerciseDescriptions);
      if (data.weeklySchedule) useAppStore.setState({ weeklySchedule: data.weeklySchedule });
      if (data.exerciseGoals) setExerciseGoals(data.exerciseGoals);
      if (data.preferences) {
        const p = data.preferences;
        if (p.darkMode !== undefined) setDarkMode(p.darkMode);
        if (p.defaultChartMode !== undefined) setDefaultChartMode(p.defaultChartMode);
        if (p.weekStartDay !== undefined) setWeekStartDay(p.weekStartDay);
        if (p.animationsEnabled !== undefined) setAnimationsEnabled(p.animationsEnabled);
        if (p.showScheduleInLog !== undefined) setShowScheduleInLog(p.showScheduleInLog);
        if (p.showDescriptionsInLog !== undefined) setShowDescriptionsInLog(p.showDescriptionsInLog);
        if (p.useCustomAppName !== undefined) setUseCustomAppName(p.useCustomAppName);
        if (p.appName !== undefined) setAppName(p.appName);
        if (p.seenBadges !== undefined) setSeenBadges(p.seenBadges);
      }
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
    setExercises(prev => ({ ...prev, [category]: [...prev[category], { id: generateId(), name }] }));
    setShowAddExercise(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100%', minHeight: '100vh', overflow: 'auto', backgroundColor: 'background.default' }}>
        <AppBar position="static" elevation={2}>
          <Toolbar disableGutters sx={{ px: { xs: 1.5, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, mx: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" onClick={() => window.location.reload()} sx={{ fontWeight: 700, cursor: 'pointer', fontSize: { xs: '1.25rem', md: '2.125rem' } }}>{useCustomAppName ? appName : 'Fitness Tracker'}</Typography>
                <Chip label="BETA" size="small" sx={{ fontSize: '0.6rem', fontWeight: 700, height: 18, letterSpacing: '0.05em', bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', border: '1px solid rgba(255,255,255,0.4)', '& .MuiChip-label': { px: '6px' } }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MuiTooltip title={hasUnsavedExport ? 'Click to export' : 'All saved'}>
                  <span>
                    <IconButton onClick={hasUnsavedExport ? saveToFile : undefined} disabled={!hasUnsavedExport} color="inherit">
                      <SaveIcon sx={{ fontSize: { xs: 22, md: 20 } }} />
                    </IconButton>
                  </span>
                </MuiTooltip>
                <IconButton onClick={() => setShowBadges(true)} color="inherit">
                  <MuiBadge variant="dot" color="warning" invisible={!hasNewBadges}>
                    <EmojiEventsIcon sx={{ fontSize: { xs: 22, md: 20 } }} />
                  </MuiBadge>
                </IconButton>
                <IconButton onClick={() => setShowSettings(true)} color="inherit"><SettingsIcon sx={{ fontSize: { xs: 22, md: 20 } }} /></IconButton>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: { xs: 1.5, sm: 3 }, pb: isMobile ? 8 : { xs: 1.5, sm: 3 } }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'space-between' }, gap: 2, mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Box sx={{ display: isMobile ? 'none' : 'block' }}>
                <ToggleButtonGroup color="primary" value={activeView} exclusive onChange={(_e, val) => { if (val) setActiveView(val); }} size="small" aria-label="View">
                  <ToggleButton value="table">Log</ToggleButton>
                  <ToggleButton value="schedule">Schedule</ToggleButton>
                  <ToggleButton value="stats">Insights</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: isMobile && (activeView === 'table' || activeView === 'schedule') ? 'none' : 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', width: isMobile ? '100%' : 'auto', gap: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
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
                {isMobile ? (
                  <>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        views={insightsMobileMode === 'weekly' ? ['year', 'month', 'day'] : ['year', 'month']}
                        openTo={insightsMobileMode === 'weekly' ? 'day' : 'month'}
                        value={insightsMobileMode === 'weekly' ? dayjs(insightsMobileWeekStart) : dayjs(new Date(insightsMobileYear, insightsMobileMonth, 1))}
                        open={insightsMobilePickerOpen}
                        onClose={() => setInsightsMobilePickerOpen(false)}
                        onChange={(newVal) => {
                          if (!newVal) return;
                          const d = (newVal as Dayjs).toDate();
                          if (insightsMobileMode === 'weekly') {
                            setInsightsMobileWeekStart(startOfWeek(d, weekStartDay));
                          } else {
                            setInsightsMobileMonth(d.getMonth());
                            setInsightsMobileYear(d.getFullYear());
                          }
                        }}
                        maxDate={dayjs()}
                        slotProps={{
                          textField: { sx: { display: 'none' } },
                          popper: { anchorEl: () => insightsMobileCalendarAnchorRef.current },
                        }}
                      />
                    </LocalizationProvider>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                      <IconButton
                        ref={insightsMobileCalendarAnchorRef}
                        size="small"
                        onClick={() => setInsightsMobilePickerOpen(true)}
                        aria-label="Open calendar"
                        sx={{ position: 'absolute', left: 0, p: 1.5 }}
                      >
                        <CalendarMonthIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={insightsMobilePrevPeriod} size="small" aria-label="Previous period" sx={{ p: 1.5 }}><ChevronLeftIcon /></IconButton>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 160, textAlign: 'center' }}>
                        {insightsMobileMode === 'weekly'
                          ? formatRange(insightsMobileWeekStart, new Date(insightsMobileWeekStart.getFullYear(), insightsMobileWeekStart.getMonth(), insightsMobileWeekStart.getDate() + 6))
                          : dayjs(new Date(insightsMobileYear, insightsMobileMonth, 1)).format('MMMM YYYY')}
                      </Typography>
                      <IconButton onClick={insightsMobileNextPeriod} size="small" disabled={insightsMobileIsAtLatest} aria-label="Next period" sx={{ p: 1.5 }}><ChevronRightIcon /></IconButton>
                      <IconButton onClick={insightsMobileJumpToToday} size="small" disabled={insightsMobileIsAtLatest} aria-label="Jump to today" sx={{ position: 'absolute', right: 0, p: 1.5 }}><LastPageIcon /></IconButton>
                    </Box>
                    <Tabs
                      value={insightsMobileMode}
                      onChange={(_e, val) => setInsightsMobileMode(val)}
                      centered
                      sx={{ minHeight: 36, mt: 1, mb: 1.5 }}
                    >
                      <Tab value="weekly" label="Week" sx={{ minHeight: 36, py: 0.5 }} />
                      <Tab value="monthly" label="Month" sx={{ minHeight: 36, py: 0.5 }} />
                    </Tabs>
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'inherit', whiteSpace: 'nowrap' }}>
                        {chartMode === 'weekly'
                          ? formatRange(weekStartDate, new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6))
                          : dayjs(selectedDateValue).format('MMMM YYYY')}
                      </Typography>
                      <IconButton ref={calendarAnchorRef} size="small" color="inherit" onClick={() => setPickerOpen(true)} aria-label="Open calendar">
                        <CalendarMonthIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ToggleButtonGroup color="primary" value={chartMode} exclusive onChange={(_e, val) => { if (val) { setExerciseColumnWidth(val === 'weekly' ? 160 : 100); setChartMode(val); } }} size="small" aria-label="Chart Mode">
                        <ToggleButton value="weekly">Week</ToggleButton>
                        <ToggleButton value="monthly">Month</ToggleButton>
                      </ToggleButtonGroup>
                      <IconButton onClick={prevPeriod} color="inherit" size="small" aria-label="Previous period"><ChevronLeftIcon /></IconButton>
                      <IconButton onClick={nextPeriod} color="inherit" size="small" disabled={isAtLatestPeriod} aria-label="Next period"><ChevronRightIcon /></IconButton>
                      {(activeView === 'table' || activeView === 'stats' || activeView === 'schedule') && (
                        <IconButton onClick={jumpToToday} color="inherit" size="small" disabled={isAtLatestPeriod} aria-label="Jump to today"><LastPageIcon /></IconButton>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Box>

            {activeView === 'table' && (
              isMobile ? (
                <MobileDayView />
              ) : (
                <ExerciseTable
                  tableDates={tableDates}
                  exerciseColumnWidth={exerciseColumnWidth}
                  tableWrapperRef={tableWrapperRef}
                  exerciseHeaderRef={exerciseHeaderRef}
                />
              )
            )}

            {activeView === 'stats' && (
              <StatsView
                weekStartDate={isMobile ? insightsMobileWeekStart : weekStartDate}
                dates={isMobile ? insightsMobileDates : dates}
                selectedMonth={isMobile ? insightsMobileMonth : selectedMonth}
                selectedYear={isMobile ? insightsMobileYear : selectedYear}
                chartModeOverride={isMobile ? insightsMobileMode : undefined}
              />
            )}

            {activeView === 'schedule' && <ScheduleView selectedMonth={selectedMonth} selectedYear={selectedYear} />}
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

        {isMobile && (
          <BottomNavigation
            value={activeView}
            onChange={(_e, val) => setActiveView(val)}
            showLabels
            sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: 1, borderColor: 'divider', zIndex: (t) => t.zIndex.appBar }}
          >
            <BottomNavigationAction label="Log" value="table" icon={<ListAltOutlinedIcon />} />
            <BottomNavigationAction label="Schedule" value="schedule" icon={<EventNoteOutlinedIcon />} />
            <BottomNavigationAction label="Insights" value="stats" icon={<InsightsOutlinedIcon />} />
          </BottomNavigation>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default ExerciseTracker;
