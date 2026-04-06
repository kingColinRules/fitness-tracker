import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, GripVertical, Download, Upload } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Checkbox from '@mui/material/Checkbox';
import { useTheme } from '@mui/material/styles';
import { getLastExportInfo } from '../utils/fileSystem';
import { DEFAULT_EXERCISES } from '../constants';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  compactView: boolean;
  setCompactView: (v: boolean) => void;
  defaultChartMode: 'weekly' | 'monthly';
  setDefaultChartMode: (v: 'weekly' | 'monthly') => void;
  weekStartDay: number;
  setWeekStartDay: (v: number) => void;
  setChartMode: (v: 'weekly' | 'monthly') => void;
  exercises: Record<string, string[]>;
  setExercises: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  completions: Record<string, boolean>;
  setCompletions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  goalSettings: Record<string, { enabled: boolean; required: number }>;
  setGoalSettings: React.Dispatch<React.SetStateAction<Record<string, { enabled: boolean; required: number }>>>;
  onOpenAddCategory: () => void;
  onOpenAddExercise: () => void;
  hasUnsavedExport: boolean;
  savedFileName: string | null;
  exportToJSON: () => Promise<void>;
  importFromJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open, onClose,
  darkMode, setDarkMode, compactView, setCompactView, defaultChartMode, setDefaultChartMode,
  weekStartDay, setWeekStartDay, setChartMode,
  exercises, setExercises, completions, setCompletions, goalSettings, setGoalSettings,
  onOpenAddCategory, onOpenAddExercise,
  savedFileName, exportToJSON, importFromJSON,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editingExercise, setEditingExercise] = useState<{ category: string; name: string } | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [draggedItem, setDraggedItem] = useState<{ category: string; index: number } | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const theme = useTheme();

  if (!open) return null;

  const handleCategoryDragStart = (e: React.DragEvent, category: string) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCategory) {
      setDraggedCategory(null);
      return;
    }
    const keys = Object.keys(exercises);
    const fromIndex = keys.indexOf(draggedCategory);
    const toIndex = keys.indexOf(targetCategory);
    const reordered = [...keys];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, draggedCategory);
    const newExercises: Record<string, string[]> = {};
    const newGoalSettings: Record<string, { enabled: boolean; required: number }> = {};
    reordered.forEach(key => {
      newExercises[key] = exercises[key];
      newGoalSettings[key] = goalSettings[key];
    });
    setExercises(newExercises);
    setGoalSettings(newGoalSettings);
    setDraggedCategory(null);
  };

  const startEditCategory = (category: string) => {
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
        const newGoalSettings: Record<string, { enabled: boolean; required: number }> = {};
        Object.keys(goalSettings).forEach(key => {
          newGoalSettings[key === editingCategory ? newKey : key] = goalSettings[key];
        });
        setGoalSettings(newGoalSettings);
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

  const deleteCategory = (category: string) => {
    if (confirm(`Delete "${category}"?`)) {
      const newExercises = { ...exercises };
      delete newExercises[category];
      setExercises(newExercises);
      const newGoalSettings = { ...goalSettings };
      delete newGoalSettings[category];
      setGoalSettings(newGoalSettings);
      const newCompletions = { ...completions };
      Object.keys(newCompletions).forEach(key => {
        if (key.startsWith(`${category}-`)) delete newCompletions[key];
      });
      setCompletions(newCompletions);
    }
  };

  const startEditExercise = (category: string, exerciseName: string) => {
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
        const newCompletions: Record<string, boolean> = {};
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

  const deleteExercise = (category: string, exerciseName: string) => {
    if (confirm(`Delete "${exerciseName}"?`)) {
      setExercises(prev => ({ ...prev, [category]: prev[category].filter(ex => ex !== exerciseName) }));
      const newCompletions = { ...completions };
      Object.keys(newCompletions).forEach(key => {
        if (key.includes(`${category}-${exerciseName}-`)) delete newCompletions[key];
      });
      setCompletions(newCompletions);
    }
  };

  const handleDragStart = (e: React.DragEvent, category: string, index: number) => {
    setDraggedItem({ category, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCategory: string, targetIndex: number) => {
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

  const toggleGoalSetting = (category: string) => {
    setGoalSettings(prev => ({ ...prev, [category]: { ...prev[category], enabled: !prev[category].enabled } }));
  };

  const updateGoalRequired = (category: string, value: string) => {
    const numValue = parseInt(value) || 1;
    const maxValue = exercises[category].length * 7;
    const clampedValue = Math.min(Math.max(1, numValue), maxValue);
    setGoalSettings(prev => ({ ...prev, [category]: { ...prev[category], required: clampedValue } }));
  };

  const handleClearData = () => {
    if (confirm('Clear ALL data?')) {
      localStorage.clear();
      setCompletions({});
      setExercises(DEFAULT_EXERCISES);
    }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, width: '100%', maxWidth: 960, mx: 2, display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', color: 'text.primary', maxHeight: '90vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Settings</Typography>
          <IconButton onClick={onClose} sx={{ p: 1 }}><X size={24} /></IconButton>
        </Box>
        <Box sx={{ overflowY: 'auto', p: 3, flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Appearance */}
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Appearance</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Theme</Typography>
                <ToggleButtonGroup color="primary" value={darkMode ? 'dark' : 'light'} exclusive onChange={(_e, val) => { if (val) setDarkMode(val === 'dark'); }} size="small">
                  <ToggleButton value="light">Light Mode</ToggleButton>
                  <ToggleButton value="dark">Dark Mode</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, mt: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Density</Typography>
                <ToggleButtonGroup color="primary" value={compactView ? 'compact' : 'normal'} exclusive onChange={(_e, val) => { if (val) setCompactView(val === 'compact'); }} size="small">
                  <ToggleButton value="normal">Normal</ToggleButton>
                  <ToggleButton value="compact">Compact</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, mt: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Default Calendar View</Typography>
                <ToggleButtonGroup color="primary" value={defaultChartMode} exclusive onChange={(_e, val) => { if (val) { setDefaultChartMode(val); setChartMode(val); } }} size="small">
                  <ToggleButton value="weekly">Week</ToggleButton>
                  <ToggleButton value="monthly">Month</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, mt: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Week Starts On</Typography>
                <ToggleButtonGroup color="primary" value={weekStartDay} exclusive onChange={(_e, val) => { if (val !== null) setWeekStartDay(val); }} size="small">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                    <ToggleButton key={i} value={i}>{label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            </div>

            {/* Data & Backup */}
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Data & Backup</Typography>
              <Box sx={{ p: 1.5, borderRadius: 1, mb: 1, backgroundColor: 'action.hover' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}><strong>Last export:</strong> {getLastExportInfo()}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  <strong>Save file:</strong> {savedFileName ?? 'Not set — click Export to choose'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button onClick={exportToJSON} variant="contained" color="success" startIcon={<Download size={18} />}>Export</Button>
                <Button component="label" variant="contained" color="secondary" startIcon={<Upload size={18} />}>
                  Import
                  <input type="file" accept=".json" onChange={importFromJSON} hidden />
                </Button>
              </Box>
              <Button onClick={handleClearData} variant="contained" color="error" sx={{ mt: 2 }}>Clear All Data</Button>
            </div>

            {/* Manage Categories */}
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Manage Categories</Typography>
              <Button onClick={onOpenAddCategory} variant="contained" startIcon={<Plus size={18} />} sx={{ mb: 1 }}>Add Category</Button>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.keys(exercises).map(category => (
                  <Box key={category} draggable onDragStart={(e) => handleCategoryDragStart(e, category)} onDragOver={handleCategoryDragOver} onDrop={(e) => handleCategoryDrop(e, category)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, border: 1, borderColor: 'divider', backgroundColor: 'background.paper', cursor: 'grab' }}>
                    <GripVertical style={{ color: theme.palette.text.secondary, flexShrink: 0 }} size={16} />
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

            {/* Manage Exercises */}
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Manage Exercises</Typography>
              <Button onClick={onOpenAddExercise} variant="contained" startIcon={<Plus size={18} />} sx={{ mb: 1 }}>Add Exercise</Button>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.keys(exercises).map(category => (
                  <Box key={category} sx={{ borderRadius: 1, p: 1.5, border: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
                    <Typography sx={{ fontWeight: 700, textTransform: 'capitalize', mb: 1, color: 'text.primary' }}>{category}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {exercises[category].length === 0 ? (
                        <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No exercises</Typography>
                      ) : (
                        exercises[category].map((exercise, index) => (
                          <Box key={exercise} draggable onDragStart={(e) => handleDragStart(e, category, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, category, index)} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }} style={{ cursor: 'grab' }}>
                            <GripVertical style={{ color: theme.palette.text.secondary }} size={compactView ? 12 : 16} />
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

            {/* Goals */}
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Goals</Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Set how many exercises must be completed each week</Typography>
              {Object.keys(exercises).map(category => (
                <Box key={category} sx={{ mb: 2, p: 2, borderRadius: 1, border: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Checkbox checked={goalSettings[category]?.enabled ?? false} onChange={() => toggleGoalSetting(category)} size="small" />
                    <Typography sx={{ fontWeight: 600, textTransform: 'capitalize', color: 'text.primary' }}>{category}</Typography>
                  </Box>
                  {goalSettings[category]?.enabled && (
                    <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ color: 'text.secondary' }}>Exercises required per week:</Typography>
                      <TextField type="number" slotProps={{ htmlInput: { min: 1, max: exercises[category].length * 7 } }} value={goalSettings[category]?.required ?? 3} onChange={(e) => updateGoalRequired(category, e.target.value)} size="small" sx={{ width: 80 }} />
                    </Box>
                  )}
                </Box>
              ))}
            </div>

          </Box>
        </Box>
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button onClick={onClose} variant="contained" color="primary" fullWidth>Done</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsModal;
