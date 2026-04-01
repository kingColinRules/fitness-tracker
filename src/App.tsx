import React, { useState, useEffect, useRef } from 'react';
import { Check, GripVertical, Settings, X, Plus, Trash2, Download, Upload, Award, Save, Edit2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs, { Dayjs } from 'dayjs';

// IndexedDB helpers for persisting FileSystemFileHandle across sessions
const FS_DB_NAME = 'exercise-tracker-fs';
const FS_DB_VERSION = 1;
const FS_STORE = 'handles';
const FS_KEY = 'csv-export-handle';

function openFSDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, FS_DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(FS_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openFSDB();
    return new Promise((resolve) => {
      const tx = db.transaction(FS_STORE, 'readonly');
      const req = tx.objectStore(FS_STORE).get(FS_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openFSDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      const req = tx.objectStore(FS_STORE).put(handle, FS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB unavailable (e.g. private browsing)
  }
}


const ExerciseTracker = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [draggedItem, setDraggedItem] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState('weight');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editingExercise, setEditingExercise] = useState(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [activeView, setActiveView] = useState('table');
  const [hasUnsavedExport, setHasUnsavedExport] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [pickerOpen, setPickerOpen] = useState(false);

  const [goalSettings, setGoalSettings] = useState<Record<string, { enabled: boolean; required: number }>>({
    weight: { enabled: true, required: 3 },
    isometric: { enabled: true, required: 2 },
    stretch: { enabled: true, required: 2 }
  });
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [defaultChartMode, setDefaultChartMode] = useState<'weekly' | 'monthly'>('weekly');
  const [weekStartDay, setWeekStartDay] = useState<number>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).weekStartDay ?? 1;
    } catch {}
    return 1; // Monday default
  });

  const [exercises, setExercises] = useState<Record<string, string[]>>({
    weight: ['Bench Press', 'Squats', 'Deadlifts', 'Overhead Press', 'Rows'],
    isometric: ['Plank', 'Wall Sit', 'Hollow Body Hold', 'L-Sit'],
    stretch: ['Hamstring Stretch', 'Quad Stretch', 'Shoulder Stretch', 'Hip Flexor Stretch']
  });

  const [completions, setCompletions] = useState<Record<string, boolean>>({});

  const theme = useTheme();

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

  // Ensure the current month/year defaults and scroll today's column into view
  useEffect(() => {
    const t = setTimeout(scrollToTodayImmediate, 150);
    return () => clearTimeout(t);
  }, [selectedMonth, selectedYear, compactView]);

  // Measure exercise column width and update streak left offset
  useEffect(() => {
    const measure = () => {
      try {
        const el = exerciseHeaderRef.current as HTMLElement | null;
        if (el) {
          const w = el.offsetWidth;
          setStreakLeft(w);
        }
      } catch (e) {
        // ignore
      }
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

  useEffect(() => {
    try {
      localStorage.setItem('exerciseCompletions', JSON.stringify(completions));
      localStorage.setItem('lastChangeDate', new Date().toISOString());

      const lastExport = localStorage.getItem('lastExportDate');
      if (lastExport) {
        const lastChange = new Date(localStorage.getItem('lastChangeDate'));
        const lastExportDate = new Date(lastExport);
        setHasUnsavedExport(lastChange > lastExportDate);
      } else {
        setHasUnsavedExport(true);
      }
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [completions]);

  useEffect(() => {
    try {
      localStorage.setItem('exerciseList', JSON.stringify(exercises));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [exercises]);


  useEffect(() => {
    try {
      localStorage.setItem('exerciseSettings', JSON.stringify({ darkMode, compactView, goalSettings, defaultChartMode, weekStartDay }));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [darkMode, compactView, goalSettings, defaultChartMode, weekStartDay]);

  useEffect(() => {
    setWeekStartDate(prev => startOfWeek(prev));
  }, [weekStartDay]);

  const generateDates = () => {
    const dates = [];
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      dates.push(new Date(selectedYear, selectedMonth, day));
    }
    return dates;
  };

  const dates = generateDates();
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const exerciseHeaderRef = useRef<HTMLTableCellElement | null>(null);
  const calendarAnchorRef = useRef<HTMLButtonElement | null>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const [streakLeft, setStreakLeft] = useState<number>(compactView ? 72 : 200);
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>(() => {
    try {
      const s = localStorage.getItem('exerciseSettings');
      if (s) return JSON.parse(s).defaultChartMode || 'weekly';
    } catch {}
    return 'weekly';
  });
  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day - weekStartDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDateValue, setSelectedDateValue] = useState<Dayjs | null>(dayjs(new Date()));

  const prevWeek = () => setWeekStartDate(d => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = () => setWeekStartDate(d => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000));
  const formatRange = (start: Date, end: Date) => `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;

  const generateWeekDates = (start: Date) => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  };

  const tableDates = chartMode === 'weekly' ? generateWeekDates(weekStartDate) : dates;

  const generateChartDataForWeek = (start: Date) => {
    const weekDates = generateWeekDates(start);
    return weekDates.map(date => {
      const dateStr = formatDateKey(date);
      const data: any = { date: `${date.getDate()}/${date.getMonth() + 1}` };
      Object.keys(exercises).forEach(category => {
        data[category] = exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
      });
      return data;
    });
  };

  const generateChartData = (monthDates = dates) => {
    return monthDates.map(date => {
      const dateStr = formatDateKey(date);
      const data: any = { date: `${date.getMonth() + 1}/${date.getDate()}` };
      Object.keys(exercises).forEach(category => {
        data[category] = exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
      });
      return data;
    });
  };

  const scrollToDate = (date: Date) => {
    try {
      const dateStr = formatDateKey(date);
      const container = tableWrapperRef.current as HTMLElement | null;
      if (!container) return;
      const el = container.querySelector(`th[data-date="${dateStr}"]`) as HTMLElement | null;
      if (el) {
        const offset = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
      }
    } catch (e) {
      // ignore
    }
  };

  const prevPeriod = () => {
    if (chartMode === 'weekly') prevWeek();
    else {
      const d = new Date(selectedYear, selectedMonth - 1, 1);
      setSelectedMonth(d.getMonth());
      setSelectedYear(d.getFullYear());
      setSelectedDateValue(dayjs(d));
    }
  };
  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  const isAtLatestPeriod = chartMode === 'weekly'
    ? weekStartDate >= currentWeekStart
    : selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  const nextPeriod = () => {
    if (isAtLatestPeriod) return;
    if (chartMode === 'weekly') nextWeek();
    else {
      const d = new Date(selectedYear, selectedMonth + 1, 1);
      setSelectedMonth(d.getMonth());
      setSelectedYear(d.getFullYear());
      setSelectedDateValue(dayjs(d));
    }
  };

  const scrollToTodayImmediate = () => {
    try {
      const todayStr = formatDateKey(new Date());
      const container = tableWrapperRef.current as HTMLElement | null;
      if (!container) return;
      const el = container.querySelector(`th[data-date="${todayStr}"]`) as HTMLElement | null;
      if (el) {
        const offset = el.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
      }
    } catch (e) {
      // ignore
    }
  };
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const toggleCompletion = (category, exercise, dateStr) => {
    const key = `${category}-${exercise}-${dateStr}`;
    setCompletions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isCompleted = (category, exercise, dateStr) => {
    const key = `${category}-${exercise}-${dateStr}`;
    return completions[key] || false;
  };

  const calculateStreak = (category: string, exercise: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today);
    let count = 0;
    const checkDate = new Date(today);
    while (checkDate >= weekStart) {
      if (isCompleted(category, exercise, formatDateKey(checkDate))) count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  };

  const formatDate = (date) => date.getDate();
  const formatDateKey = (date) => date.toISOString().split('T')[0];

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const handleDragStart = (e, category, index) => {
    setDraggedItem({ category, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetCategory, targetIndex) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.category !== targetCategory) {
      setDraggedItem(null);
      return;
    }
    const newExercises = { ...exercises };
    const categoryExercises = [...newExercises[targetCategory]];
    const [movedExercise] = categoryExercises.splice(draggedItem.index, 1);
    categoryExercises.splice(targetIndex, 0, movedExercise);
    newExercises[targetCategory] = categoryExercises;
    setExercises(newExercises);
    setDraggedItem(null);
  };

  const toggleStreakSetting = (category) => {
    setGoalSettings(prev => ({ ...prev, [category]: { ...prev[category], enabled: !prev[category].enabled } }));
  };

  const updateStreakRequired = (category, value) => {
    const numValue = parseInt(value) || 1;
    const maxValue = exercises[category].length * 7;
    const clampedValue = Math.min(Math.max(1, numValue), maxValue);
    setGoalSettings(prev => ({ ...prev, [category]: { ...prev[category], required: clampedValue } }));
  };

  const addExercise = () => {
    if (newExerciseName.trim()) {
      setExercises(prev => ({ ...prev, [newExerciseCategory]: [...prev[newExerciseCategory], newExerciseName.trim()] }));
      setNewExerciseName('');
      setShowAddExercise(false);
    }
  };

  const deleteExercise = (category, exerciseName) => {
    if (confirm(`Delete "${exerciseName}"?`)) {
      setExercises(prev => ({ ...prev, [category]: prev[category].filter(ex => ex !== exerciseName) }));
      const newCompletions = { ...completions };
      Object.keys(newCompletions).forEach(key => {
        if (key.includes(`${category}-${exerciseName}-`)) delete newCompletions[key];
      });
      setCompletions(newCompletions);
    }
  };

  const addCategory = () => {
    const categoryKey = newCategoryName.toLowerCase().replace(/\s+/g, '_');
    if (categoryKey && !exercises[categoryKey]) {
      setExercises(prev => ({ ...prev, [categoryKey]: [] }));
      setGoalSettings(prev => ({ ...prev, [categoryKey]: { enabled: true, required: 3 } }));
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const deleteCategory = (category) => {
    if (confirm(`Delete "${category}"?`)) {
      const newExercises = { ...exercises };
      delete newExercises[category];
      setExercises(newExercises);
      const newStreakSettings = { ...goalSettings };
      delete newStreakSettings[category];
      setGoalSettings(newStreakSettings);
      const newCompletions = { ...completions };
      Object.keys(newCompletions).forEach(key => {
        if (key.startsWith(`${category}-`)) delete newCompletions[key];
      });
      setCompletions(newCompletions);
    }
  };

  const startEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category);
  };

  const saveEditCategory = () => {
    if (editCategoryName && editingCategory !== editCategoryName) {
      const newKey = editCategoryName.toLowerCase().replace(/\s+/g, '_');
      if (!exercises[newKey]) {
        const newExercises: Record<string, string[]> = {};
        Object.keys(exercises).forEach(key => {
          newExercises[key === editingCategory ? newKey : key] = exercises[key];
        });
        setExercises(newExercises);
        const newStreakSettings: Record<string, { enabled: boolean; required: number }> = {};
        Object.keys(goalSettings).forEach(key => {
          newStreakSettings[key === editingCategory ? newKey : key] = goalSettings[key];
        });
        setGoalSettings(newStreakSettings);
        const newCompletions: Record<string, boolean> = {};
        Object.keys(completions).forEach(key => {
          if (key.startsWith(`${editingCategory}-`)) {
            newCompletions[key.replace(`${editingCategory}-`, `${newKey}-`)] = completions[key];
          } else {
            newCompletions[key] = completions[key];
          }
        });
        setCompletions(newCompletions);
      }
    }
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const startEditExercise = (category, exerciseName) => {
    setEditingExercise({ category, name: exerciseName });
    setEditExerciseName(exerciseName);
  };

  const saveEditExercise = () => {
    if (editExerciseName && editingExercise && editExerciseName !== editingExercise.name) {
      const { category, name: oldName } = editingExercise;
      if (!exercises[category].includes(editExerciseName)) {
        const newExercises = { ...exercises };
        const index = newExercises[category].indexOf(oldName);
        if (index !== -1) {
          newExercises[category][index] = editExerciseName;
          setExercises(newExercises);
        }
        const newCompletions = {};
        Object.keys(completions).forEach(key => {
          if (key.startsWith(`${category}-${oldName}-`)) {
            newCompletions[key.replace(`${category}-${oldName}-`, `${category}-${editExerciseName}-`)] = completions[key];
          } else {
            newCompletions[key] = completions[key];
          }
        });
        setCompletions(newCompletions);
      }
    }
    setEditingExercise(null);
    setEditExerciseName('');
  };

  type MonthlySummary = { totalCompletions: number; completionsByCategory: Record<string, number>; activeDays: number };
  const calculateMonthlySummary = (): MonthlySummary => {
    const totalCompletions = dates.reduce((sum, date) => {
      const dateStr = formatDateKey(date);
      return sum + Object.keys(exercises).reduce((catSum, category) => {
        return catSum + exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
      }, 0);
    }, 0);
    const completionsByCategory: Record<string, number> = {};
    Object.keys(exercises).forEach(category => {
      completionsByCategory[category] = dates.reduce((sum, date) => {
        const dateStr = formatDateKey(date);
        return sum + exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
      }, 0);
    });
    const activeDays = dates.filter(date => {
      const dateStr = formatDateKey(date);
      return Object.keys(exercises).some(category => exercises[category].some(ex => isCompleted(category, ex, dateStr)));
    }).length;
    return { totalCompletions, completionsByCategory, activeDays };
  };

  const renderMonthlySummary = (): React.ReactNode => {
    const summary = calculateMonthlySummary();
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: darkMode ? '#374151' : '#eff6ff' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: darkMode ? '#bfdbfe' : '#1e40af' }}>Total Completions</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>{summary.totalCompletions}</Typography>
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: darkMode ? '#374151' : '#ecfdf5' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: darkMode ? '#86efac' : '#065f46' }}>Active Days</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>{summary.activeDays} / {dates.length}</Typography>
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: darkMode ? '#374151' : '#f5f3ff' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#c4b5fd' : '#6b21a8' }}>By Category</Typography>
          {Object.entries(summary.completionsByCategory).map(([cat, count]) => (
            <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <span style={{ textTransform: 'capitalize', color: darkMode ? '#d1d5db' : '#374151' }}>{cat}:</span>
              <span style={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>{count}</span>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };



  const getHeatmapIntensity = (date) => {
    const dateStr = formatDateKey(date);
    const count = Object.keys(exercises).reduce((sum, category) => {
      return sum + exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
    }, 0);
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  type Badge = { name: string; icon: React.ReactNode; color: string; earned: boolean; progress: number; target: number };
  const calculateBadges = (): Badge[] => {
    const summary = calculateMonthlySummary();
    return [
      { name: '50 Completions', icon: '🏆', color: 'bg-yellow-100 text-yellow-700', earned: summary.totalCompletions >= 50, progress: summary.totalCompletions, target: 50 },
      { name: '100 Completions', icon: '💯', color: 'bg-purple-100 text-purple-700', earned: summary.totalCompletions >= 100, progress: summary.totalCompletions, target: 100 },
      { name: '20 Active Days', icon: '📅', color: 'bg-blue-100 text-blue-700', earned: summary.activeDays >= 20, progress: summary.activeDays, target: 20 },
      { name: 'Perfect Month', icon: '⭐', color: 'bg-green-100 text-green-700', earned: summary.activeDays === dates.length, progress: summary.activeDays, target: dates.length }
    ];
  };

  const generateExportJSON = (): string => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exercises,
      goalSettings,
      completions,
    };
    return JSON.stringify(payload, null, 2);
  };

  const writeJSON = async (handle: FileSystemFileHandle) => {
    const json = generateExportJSON();
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    localStorage.setItem('lastExportDate', new Date().toISOString());
    setHasUnsavedExport(false);
  };

  // Settings "Export" button — always shows file picker
  const exportToJSON = async () => {
    const json = generateExportJSON();
    if (!(window as any).showSaveFilePicker) {
      // Fallback for browsers without File System Access API
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
    } catch {
      // user cancelled
    }
  };

  // Save icon — writes to the already-chosen file silently, no picker
  const saveToFile = async () => {
    // Try session ref first
    if (fileHandleRef.current) {
      const perm = await (fileHandleRef.current as any).queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') { await writeJSON(fileHandleRef.current); return; }
    }
    // Try IndexedDB handle
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

  const importFromJSON = (event) => {
    const file = event.target.files[0];
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

      const newCompletionCount = Object.keys(parsed.completions).length;
      const newExerciseCategoryCount = Object.keys(parsed.exercises).length;

      setExercises(parsed.exercises);
      setCompletions(parsed.completions);
      if (parsed.goalSettings) setGoalSettings(parsed.goalSettings);

      setImportFeedback({
        open: true,
        message: `Imported ${newCompletionCount} completions across ${newExerciseCategoryCount} categories`,
        severity: 'success',
      });
    };
    reader.readAsText(file);
  };

  const getLastExportInfo = () => {
    const lastExport = localStorage.getItem('lastExportDate');
    if (!lastExport) return 'Never';
    const daysAgo = Math.floor((Date.now() - new Date(lastExport).getTime()) / (1000*60*60*24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  };

  const containerBg = darkMode ? 'rgba(17,24,39,1)' : 'rgba(249,250,251,1)';
  const cardBg = darkMode ? 'rgba(31,41,55,1)' : '#ffffff';

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', overflow: 'auto', backgroundColor: containerBg }}>
      <AppBar position="static" elevation={2} sx={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: '#ffffff' }}>
          <Toolbar disableGutters sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, mx: 'auto' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{'Fitness Tracker'}</Typography>
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
            <ToggleButtonGroup
              color="primary"
              value={activeView}
              exclusive
              onChange={(_e, val) => { if (val) setActiveView(val); }}
              size="small"
              aria-label="View"
            >
              <ToggleButton value="table">Table</ToggleButton>
              <ToggleButton value="heatmap">Heatmap</ToggleButton>
              <ToggleButton value="chart">Chart</ToggleButton>
            </ToggleButtonGroup>
          </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  views={chartMode === 'weekly' ? ["year", "month", "day"] : ["year", "month"]}
                  openTo={chartMode === 'weekly' ? "day" : "month"}
                  value={chartMode === 'weekly' ? dayjs(weekStartDate) : selectedDateValue}
                  open={pickerOpen}
                  onClose={() => setPickerOpen(false)}
                  onChange={(newVal) => {
                    if (!newVal) return;
                    const d = (newVal as Dayjs).toDate();
                    if (chartMode === 'weekly') {
                      setWeekStartDate(startOfWeek(d));
                    } else {
                      setSelectedDateValue(newVal as Dayjs);
                      setSelectedMonth(d.getMonth());
                      setSelectedYear(d.getFullYear());
                      setWeekStartDate(startOfWeek(d));
                      setTimeout(() => scrollToDate(d), 150);
                    }
                  }}
                  maxDate={dayjs()}
                  slotProps={{
                    textField: { sx: { display: 'none' } },
                    popper: { anchorEl: () => calendarAnchorRef.current }
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
            <ToggleButtonGroup
              color="primary"
              value={chartMode}
              exclusive
              onChange={(_e, val) => { if (val) setChartMode(val); }}
              size="small"
              aria-label="Chart Mode"
            >
              <ToggleButton value="weekly">Week</ToggleButton>
              <ToggleButton value="monthly">Month</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={prevPeriod} color="inherit" size="small"><ChevronLeftIcon /></IconButton>
            <IconButton onClick={nextPeriod} color="inherit" size="small" disabled={isAtLatestPeriod}><ChevronRightIcon /></IconButton>
          </Box>
        </Box>

        {activeView === 'table' && (
          <TableContainer ref={tableWrapperRef} component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflowX: 'auto', backgroundColor: cardBg }}>
            <Table sx={{ width: '100%', borderCollapse: 'collapse' }} size={compactView ? 'small' : 'medium'}>
              <TableHead>
                <TableRow sx={{ backgroundColor: darkMode ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)' }}>
                  <TableCell ref={exerciseHeaderRef} sx={{ fontWeight: 600, position: 'sticky', left: 0, zIndex: 70, minWidth: 120, backgroundColor: darkMode ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)', color: darkMode ? '#e5e7eb' : '#374151' }}>Exercise</TableCell>
                  <TableCell sx={{ fontWeight: 600, position: 'sticky', left: `${streakLeft}px`, zIndex: 60, textAlign: 'center', minWidth: 80, backgroundColor: darkMode ? 'rgba(55,65,81,1)' : 'rgba(243,244,246,1)', color: darkMode ? '#e5e7eb' : '#374151' }}>Weekly <br/>Progress</TableCell>
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
                    {exerciseList.map((exercise, index) => {
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
        )}

        {activeView === 'heatmap' && (() => {
          const colorsLight = ['#f3f4f6', '#ffedd5', '#fdba74', '#fb923c', '#ef4444'];
          const colorsDark  = ['#374151', '#7c2d12', '#b45309', '#f97316', '#dc2626'];
          const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          const orderedDayLabels = [...dayLabels.slice(weekStartDay), ...dayLabels.slice(0, weekStartDay)];
          const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
          const leadingEmpties = (firstDayOfMonth - weekStartDay + 7) % 7;
          return (
            <Box sx={{ borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: cardBg }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: darkMode ? '#ffffff' : '#1f2937' }}>Exercise Heatmap</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {orderedDayLabels.map(label => (
                  <Box key={label} sx={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, pb: 0.5, color: darkMode ? '#9ca3af' : '#6b7280' }}>{label}</Box>
                ))}
                {Array.from({ length: leadingEmpties }).map((_, i) => <Box key={`empty-${i}`} />)}
                {dates.map(date => {
                  const intensity = getHeatmapIntensity(date);
                  const bg = darkMode ? colorsDark[intensity] : colorsLight[intensity];
                  const textColor = darkMode ? '#ffffff' : (intensity >= 3 ? '#ffffff' : '#1f2937');
                  const today = isToday(date);
                  return (
                    <Box key={date.toISOString()} sx={{ backgroundColor: bg, borderRadius: 1, p: 1, textAlign: 'center', color: textColor, outline: today ? '2px solid #3b82f6' : 'none', outlineOffset: '-2px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(date)}</div>
                      <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{intensity > 0 ? `${intensity} ex` : ''}</div>
                    </Box>
                  );
                })}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
                <span style={{ fontSize: 13, color: darkMode ? '#9ca3af' : '#4b5563' }}>Less</span>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[0, 1, 2, 3, 4].map(level => (
                    <div key={level} style={{ width: 24, height: 24, backgroundColor: darkMode ? colorsDark[level] : colorsLight[level], borderRadius: 6 }} />
                  ))}
                </Box>
                <span style={{ fontSize: 13, color: darkMode ? '#9ca3af' : '#4b5563' }}>More</span>
              </Box>
            </Box>
          );
        })()}

        {activeView === 'chart' && (
          <Box sx={{ borderRadius: 2, boxShadow: 2, p: 3, backgroundColor: cardBg }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#1f2937' }}>Progress Chart</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>{chartMode === 'weekly' ? formatRange(weekStartDate, new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6)) : `${months[selectedMonth]} ${selectedYear}`}</Box>
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartMode === 'weekly' ? generateChartDataForWeek(weekStartDate) : generateChartData(dates)}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="date" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
                <Legend />
                {Object.keys(exercises).map((category, idx) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                  return <Line key={category} type="monotone" dataKey={category} stroke={colors[idx % colors.length]} strokeWidth={2} />;
                })}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
        </Box>
      </Box>

      {showSettings && (
        <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
              <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, width: '100%', maxWidth: 960, mx: 2, display: 'flex', flexDirection: 'column', backgroundColor: darkMode ? '#1f2937' : '#ffffff', color: darkMode ? '#e5e7eb' : '#111827', maxHeight: '90vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, flexShrink: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>Settings</Typography>
              <IconButton onClick={() => setShowSettings(false)} sx={{ p: 1 }}>
                <X size={24} style={{ color: darkMode ? '#d1d5db' : '#4b5563' }} />
              </IconButton>
            </Box>
            <Box sx={{ overflowY: 'auto', p: 3, flex: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>Appearance</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                    <Typography sx={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}>Theme</Typography>
                    <ToggleButtonGroup
                      color="primary"
                      value={darkMode ? 'dark' : 'light'}
                      exclusive
                      onChange={(_e, val) => { if (val) setDarkMode(val === 'dark'); }}
                      size="small"
                    >
                      <ToggleButton value="light">Light Mode</ToggleButton>
                      <ToggleButton value="dark">Dark Mode</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, mt: 1 }}>
                    <Typography sx={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}>Density</Typography>
                    <ToggleButtonGroup
                      color="primary"
                      value={compactView ? 'compact' : 'normal'}
                      exclusive
                      onChange={(_e, val) => { if (val) setCompactView(val === 'compact'); }}
                      size="small"
                    >
                      <ToggleButton value="normal">Normal</ToggleButton>
                      <ToggleButton value="compact">Compact</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, mt: 1 }}>
                    <Typography sx={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}>Default Calendar View</Typography>
                    <ToggleButtonGroup
                      color="primary"
                      value={defaultChartMode}
                      exclusive
                      onChange={(_e, val) => { if (val) { setDefaultChartMode(val); setChartMode(val); } }}
                      size="small"
                    >
                      <ToggleButton value="weekly">Week</ToggleButton>
                      <ToggleButton value="monthly">Month</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, mt: 1 }}>
                    <Typography sx={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}>Week Starts On</Typography>
                    <ToggleButtonGroup
                      color="primary"
                      value={weekStartDay}
                      exclusive
                      onChange={(_e, val) => { if (val !== null) setWeekStartDay(val); }}
                      size="small"
                    >
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                        <ToggleButton key={i} value={i}>{label}</ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                </div>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>Data & Backup</Typography>
                  <Box sx={{ p: 1.5, borderRadius: 1, mb: 1, backgroundColor: darkMode ? '#374151' : '#f8fafc' }}>
                    <Typography variant="body2" sx={{ color: darkMode ? '#d1d5db' : '#4b5563' }}><strong>Last export:</strong> {getLastExportInfo()}</Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? '#d1d5db' : '#4b5563', mt: 0.5 }}>
                      <strong>Save file:</strong> {fileHandleRef.current ? fileHandleRef.current.name : 'Not set — click Export to choose'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button onClick={exportToJSON} variant="contained" color="success" startIcon={<Download size={18} />}>
                      Export
                    </Button>
                    <Button component="label" variant="contained" sx={{ backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } }} startIcon={<Upload size={18} />}>
                      Import
                      <input type="file" accept=".json" onChange={importFromJSON} hidden />
                    </Button>
                  </Box>
                  <Button onClick={() => { if (confirm('Clear ALL data?')) { localStorage.clear(); setCompletions({}); setExercises({weight: ['Bench Press', 'Squats', 'Deadlifts', 'Overhead Press', 'Rows'], isometric: ['Plank', 'Wall Sit', 'Hollow Body Hold', 'L-Sit'], stretch: ['Hamstring Stretch', 'Quad Stretch', 'Shoulder Stretch', 'Hip Flexor Stretch']}); } }} variant="contained" color="error" sx={{ mt: 2 }}>
                    Clear All Data
                  </Button>
                </div>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>Manage Categories</Typography>
                  <Button onClick={() => setShowAddCategory(true)} variant="contained" startIcon={<Plus size={18} />} sx={{ mb: 1 }}>Add Category</Button>
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.keys(exercises).map(category => (
                      <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, backgroundColor: darkMode ? '#0f172a' : '#ffffff' }}>
                        {editingCategory === category ? (
                          <>
                            <TextField value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} variant="outlined" size="small" sx={{ flex: 1 }} />
                            <Button onClick={saveEditCategory} variant="contained" sx={{ ml: 1 }}>Save</Button>
                            <Button onClick={() => setEditingCategory(null)} variant="outlined" sx={{ ml: 1 }}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Typography sx={{ flex: 1, fontWeight: 600, textTransform: 'capitalize' }}>{category}</Typography>
                            <IconButton onClick={() => startEditCategory(category)}><Edit2 size={18} /></IconButton>
                            <IconButton onClick={() => deleteCategory(category)}><Trash2 size={18} /></IconButton>
                          </>
                        )}
                      </Box>
                    ))}
                  </Box>
                </div>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>Manage Exercises</Typography>
                  <Button onClick={() => setShowAddExercise(true)} variant="contained" startIcon={<Plus size={18} />} sx={{ mb: 1 }}>Add Exercise</Button>
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.keys(exercises).map(category => (
                      <Box key={category} sx={{ borderRadius: 1, p: 1.5, border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, backgroundColor: darkMode ? '#0b1220' : '#ffffff' }}>
                        <Typography sx={{ fontWeight: 700, textTransform: 'capitalize', mb: 1, color: darkMode ? '#e5e7eb' : '#111827' }}>{category}</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {exercises[category].length === 0 ? (
                            <Typography sx={{ color: darkMode ? '#9ca3af' : '#6b7280', fontStyle: 'italic' }}>No exercises</Typography>
                          ) : (
                            exercises[category].map((exercise, index) => (
                              <Box key={exercise} draggable onDragStart={(e) => handleDragStart(e, category, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, category, index)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, '&:hover': { backgroundColor: darkMode ? '#1f2937' : '#f8fafc' } }} style={{ cursor: 'grab' }}>
                                <GripVertical style={{ color: darkMode ? '#6b7280' : '#9ca3af' }} size={compactView ? 12 : 16} />
                                {editingExercise?.category === category && editingExercise?.name === exercise ? (
                                  <>
                                    <TextField value={editExerciseName} onChange={(e) => setEditExerciseName(e.target.value)} size="small" sx={{ flex: 1 }} />
                                    <Button onClick={saveEditExercise} variant="contained" size="small">Save</Button>
                                    <Button onClick={() => { setEditingExercise(null); setEditExerciseName(''); }} variant="outlined" size="small">Cancel</Button>
                                  </>
                                ) : (
                                  <>
                                    <Typography sx={{ flex: 1 }}>{exercise}</Typography>
                                    <IconButton onClick={() => startEditExercise(category, exercise)}><Edit2 size={16} /></IconButton>
                                    <IconButton onClick={() => deleteExercise(category, exercise)}><Trash2 size={16} /></IconButton>
                                  </>
                                )}
                              </Box>
                            ))
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </div>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>Goals</Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: darkMode ? '#9ca3af' : '#4b5563' }}>Set how many exercises must be completed each week</Typography>
                  {Object.keys(exercises).map(category => (
                    <Box key={category} sx={{ mb: 2, p: 2, borderRadius: 1, border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, backgroundColor: darkMode ? '#0b1220' : '#ffffff' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <input type="checkbox" checked={goalSettings[category]?.enabled} onChange={() => toggleStreakSetting(category)} style={{ width: 20, height: 20 }} />
                        <Typography sx={{ fontWeight: 600, textTransform: 'capitalize', color: darkMode ? '#e5e7eb' : '#374151' }}>{category}</Typography>
                      </Box>
                      {goalSettings[category]?.enabled && (
                        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>Exercises required per week:</Typography>
                          <TextField type="number" inputProps={{ min: 1, max: exercises[category].length * 7 }} value={goalSettings[category]?.required} onChange={(e) => updateStreakRequired(category, e.target.value)} size="small" sx={{ width: 80 }} />
                        </Box>
                      )}
                    </Box>
                  ))}
                </div>
              </Box>
            </Box>
            <Box sx={{ p: 3, borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, flexShrink: 0 }}>
              <Button onClick={() => setShowSettings(false)} variant="contained" color="primary" fullWidth>Done</Button>
            </Box>
          </Box>
        </Box>
      )}

      {showAddCategory && (
        <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
          <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 480, width: '100%', mx: 2, backgroundColor: darkMode ? '#111827' : '#ffffff', color: darkMode ? '#e5e7eb' : '#111827' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Category</Typography>
              <IconButton onClick={() => setShowAddCategory(false)}><X size={24} style={{ color: darkMode ? '#c7c7c7' : '#374151' }} /></IconButton>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: darkMode ? '#e5e7eb' : '#374151' }}>Category Name</Typography>
              <TextField value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g., Cardio" fullWidth />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setShowAddCategory(false)} variant="outlined">Cancel</Button>
              <Button onClick={addCategory} variant="contained">Add</Button>
            </Box>
          </Box>
        </Box>
      )}

      {showAddExercise && (
        <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
          <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 480, width: '100%', mx: 2, backgroundColor: darkMode ? '#0f172a' : '#ffffff', color: darkMode ? '#e5e7eb' : '#111827' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Exercise</Typography>
              <IconButton onClick={() => setShowAddExercise(false)}><X size={24} style={{ color: darkMode ? '#c7c7c7' : '#374151' }} /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Exercise Name</Typography>
                <TextField value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder="e.g., Pull-ups" fullWidth />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Category</Typography>
                <TextField select value={newExerciseCategory} onChange={(e) => setNewExerciseCategory(e.target.value)} SelectProps={{ native: true }} fullWidth>
                  {Object.keys(exercises).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </TextField>
              </Box>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setShowAddExercise(false)} variant="outlined">Cancel</Button>
              <Button onClick={addExercise} variant="contained">Add</Button>
            </Box>
          </Box>
        </Box>
      )}

      {showStats && (
        <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
          <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 960, width: '100%', mx: 2, backgroundColor: darkMode ? '#0b1220' : '#ffffff', color: darkMode ? '#e5e7eb' : '#111827' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Monthly Summary</Typography>
              <IconButton onClick={() => setShowStats(false)}><X size={24} style={{ color: darkMode ? '#c7c7c7' : '#374151' }} /></IconButton>
            </Box>
            {renderMonthlySummary()}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowStats(false)} variant="contained">Close</Button>
            </Box>
          </Box>
        </Box>
      )}

      {showBadges && (
        <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
          <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 960, width: '100%', mx: 2, maxHeight: '90vh', overflowY: 'auto', backgroundColor: darkMode ? '#0b1220' : '#ffffff', color: darkMode ? '#e5e7eb' : '#111827' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Achievement Badges</Typography>
              <IconButton onClick={() => setShowBadges(false)}><X size={24} style={{ color: darkMode ? '#c7c7c7' : '#374151' }} /></IconButton>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              {calculateBadges().map((badge, index) => (
                <Box key={index} sx={{ p: 2, borderRadius: 1, border: `2px solid ${badge.earned ? 'transparent' : (darkMode ? '#374151' : '#e5e7eb')}`, backgroundColor: badge.earned ? undefined : (darkMode ? '#111827' : '#f8fafc'), color: badge.earned ? undefined : (darkMode ? '#9ca3af' : '#6b7280') }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <span style={{ fontSize: 28, opacity: !badge.earned ? 0.3 : 1 }}>{badge.icon as React.ReactNode}</span>
                    <Box sx={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{badge.name}</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>{badge.progress} / {badge.target} {badge.name.includes('Day') ? 'days' : 'completions'}</div>
                    </Box>
                    {badge.earned && <div style={{ fontSize: 20 }}>✓</div>}
                  </Box>
                  <Box sx={{ width: '100%', height: 8, borderRadius: 1, backgroundColor: darkMode ? '#374151' : '#e5e7eb' }}>
                    <Box sx={{ height: '100%', borderRadius: 1, transition: 'width 300ms', backgroundColor: badge.earned ? '#16a34a' : (darkMode ? '#3b82f6' : '#60a5fa'), width: `${Math.min((badge.progress / badge.target) * 100, 100)}%` }} />
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowBadges(false)} variant="contained">Close</Button>
            </Box>
          </Box>
        </Box>
      )}

      <Snackbar
        open={importFeedback.open}
        autoHideDuration={5000}
        onClose={() => setImportFeedback(f => ({ ...f, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setImportFeedback(f => ({ ...f, open: false }))}
          severity={importFeedback.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {importFeedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExerciseTracker;
