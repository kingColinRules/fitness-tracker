import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { getLastExportInfo } from '../utils/fileSystem';
import { createDefaultExercises } from '../constants';
import { useAppStore } from '../store';
import type { Exercise } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenAddCategory: () => void;
  onOpenAddExercise: () => void;
  savedFileName: string | null;
  exportToJSON: () => Promise<void>;
  importFromJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open, onClose,
  onOpenAddCategory, onOpenAddExercise,
  savedFileName, exportToJSON, importFromJSON,
}) => {
  const {
    darkMode, setDarkMode,
    defaultChartMode, setDefaultChartMode, weekStartDay, setWeekStartDay,
    animationsEnabled, setAnimationsEnabled,
    showScheduleInLog, setShowScheduleInLog,
    showDescriptionsInLog, setShowDescriptionsInLog,
    useCustomAppName, setUseCustomAppName, appName, setAppName,
    exercises, setExercises, completions, setCompletions,
    goalSettings, setGoalSettings, exerciseGoals, setExerciseGoals,
    exerciseDescriptions, setExerciseDescriptions, setWeeklySchedule,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState(0);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryGoalEnabled, setEditCategoryGoalEnabled] = useState(false);
  const [editCategoryGoalRequired, setEditCategoryGoalRequired] = useState(3);
  const [editingExercise, setEditingExercise] = useState<{ category: string; id: string } | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [editExerciseDescription, setEditExerciseDescription] = useState('');
  const [editExerciseOverride, setEditExerciseOverride] = useState(false);
  const [editExerciseOverrideRequired, setEditExerciseOverrideRequired] = useState(1);
  const [editExerciseNoGoal, setEditExerciseNoGoal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ category: string; index: number } | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
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
    const newExercises: Record<string, Exercise[]> = {};
    const newGoalSettings: Record<string, { enabled: boolean; required: number; createdAt?: string }> = {};
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
    setEditCategoryGoalEnabled(goalSettings[category]?.enabled ?? false);
    setEditCategoryGoalRequired(goalSettings[category]?.required ?? 3);
  };

  const saveEditCategory = () => {
    // Completions/descriptions/goals are keyed by exercise id, not category — renaming a category
    // only ever needs to move its key in `exercises`/`goalSettings`, nothing else.
    const newKey = editCategoryName.trim();
    if (newKey && editingCategory !== newKey && !exercises[newKey]) {
      const newExercises: Record<string, Exercise[]> = {};
      Object.keys(exercises).forEach(key => {
        newExercises[key === editingCategory ? newKey : key] = exercises[key];
      });
      setExercises(newExercises);
      const newGoalSettings: Record<string, { enabled: boolean; required: number; createdAt?: string }> = {};
      Object.keys(goalSettings).forEach(key => {
        newGoalSettings[key === editingCategory ? newKey : key] = goalSettings[key];
      });
      setGoalSettings(newGoalSettings);
    }
    setGoalSettings(prev => {
      const key = newKey ?? editingCategory!;
      const existing = prev[key];
      const today = new Date().toISOString().split('T')[0];
      return {
        ...prev,
        [key]: {
          enabled: editCategoryGoalEnabled,
          required: editCategoryGoalRequired,
          createdAt: existing?.createdAt ?? (editCategoryGoalEnabled ? today : undefined),
        },
      };
    });
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const deleteCategory = (category: string) => {
    setConfirmDialog({
      message: `Delete "${category}"?`,
      onConfirm: () => {
        const deletedIds = new Set((exercises[category] ?? []).map(ex => ex.id));
        const newExercises = { ...exercises };
        delete newExercises[category];
        setExercises(newExercises);
        const newGoalSettings = { ...goalSettings };
        delete newGoalSettings[category];
        setGoalSettings(newGoalSettings);
        const newCompletions = { ...completions };
        Object.keys(newCompletions).forEach(key => {
          if (deletedIds.has(key.slice(0, -11))) delete newCompletions[key];
        });
        setCompletions(newCompletions);
        const newDescriptions = { ...exerciseDescriptions };
        Object.keys(newDescriptions).forEach(key => {
          if (deletedIds.has(key)) delete newDescriptions[key];
        });
        setExerciseDescriptions(newDescriptions);
        setExerciseGoals(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            if (deletedIds.has(key)) delete next[key];
          });
          return next;
        });
        setWeeklySchedule(prev => Object.fromEntries(
          Object.entries(prev).map(([day, exs]) => [day, exs.filter(e => !deletedIds.has(e.exerciseId))])
        ));
      },
    });
  };

  const startEditExercise = (category: string, exercise: Exercise) => {
    setEditingExercise({ category, id: exercise.id });
    setEditExerciseName(exercise.name);
    setEditExerciseDescription(exerciseDescriptions[exercise.id] || '');
    const eg = exerciseGoals[exercise.id];
    setEditExerciseNoGoal(eg?.disabled ?? false);
    setEditExerciseOverride(!eg?.disabled && (eg?.override ?? false));
    setEditExerciseOverrideRequired(eg?.disabled ? (goalSettings[category]?.required ?? 3) : (eg?.required ?? goalSettings[category]?.required ?? 3));
  };

  const saveEditExercise = () => {
    if (editingExercise) {
      const { category, id } = editingExercise;
      const newName = editExerciseName.trim();
      // Renaming/re-categorizing an exercise no longer touches completions/descriptions/goals at
      // all — they're keyed by this stable id, which never changes.
      if (newName) {
        setExercises(prev => {
          const list = prev[category];
          const duplicate = list.some(ex => ex.id !== id && ex.name === newName);
          if (duplicate) return prev;
          return { ...prev, [category]: list.map(ex => (ex.id === id ? { ...ex, name: newName } : ex)) };
        });
      }
      const newDescriptions = { ...exerciseDescriptions };
      if (editExerciseDescription.trim()) {
        newDescriptions[id] = editExerciseDescription.trim();
      } else {
        delete newDescriptions[id];
      }
      setExerciseDescriptions(newDescriptions);
      setExerciseGoals(prev => {
        const next = { ...prev };
        const today = new Date().toISOString().split('T')[0];
        if (editExerciseNoGoal) next[id] = { override: true, required: editExerciseOverrideRequired, disabled: true };
        else if (editExerciseOverride) next[id] = { override: true, required: editExerciseOverrideRequired, createdAt: next[id]?.createdAt ?? today };
        else delete next[id];
        return next;
      });
    }
    setEditingExercise(null);
    setEditExerciseName('');
    setEditExerciseDescription('');
  };

  const deleteExercise = (category: string, exercise: Exercise) => {
    setConfirmDialog({
      message: `Delete "${exercise.name}"?`,
      onConfirm: () => {
        const id = exercise.id;
        setExercises(prev => ({ ...prev, [category]: prev[category].filter(ex => ex.id !== id) }));
        const newCompletions = { ...completions };
        Object.keys(newCompletions).forEach(key => {
          if (key.slice(0, -11) === id) delete newCompletions[key];
        });
        setCompletions(newCompletions);
        const newDescriptions = { ...exerciseDescriptions };
        delete newDescriptions[id];
        setExerciseDescriptions(newDescriptions);
        setExerciseGoals(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setWeeklySchedule(prev => Object.fromEntries(
          Object.entries(prev).map(([day, exs]) => [day, exs.filter(e => e.exerciseId !== id)])
        ));
      },
    });
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

  const handleClearData = () => {
    setConfirmDialog({
      message: 'Clear ALL data? This cannot be undone.',
      onConfirm: () => {
        localStorage.clear();
        setCompletions({});
        setExercises(createDefaultExercises());
        setExerciseDescriptions({});
      },
    });
  };

  return (
    <>
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: { xs: 'fixed', sm: 'absolute' }, top: { xs: 0, sm: '50%' }, left: { xs: 0, sm: '50%' }, transform: { xs: 'none', sm: 'translate(-50%, -50%)' }, borderRadius: { xs: 0, sm: 2 }, boxShadow: 6, width: { xs: '100%', sm: 'calc(100% - 32px)' }, maxWidth: { xs: 'none', sm: 960 }, display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', color: 'text.primary', height: { xs: '100%', sm: '90vh' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, pb: 0, flexShrink: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Settings</Typography>
          <IconButton onClick={onClose} sx={{ p: 1 }}><CloseIcon sx={(theme) => ({ fontSize: theme.typography.iconLg.fontSize })} /></IconButton>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tabs value={activeTab} onChange={(_e, val) => setActiveTab(val)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ px: 3 }}>
            <Tab label="Exercises" />
            <Tab label="Appearance" />
            <Tab label="Data and Backup" />
          </Tabs>
        </Box>
        <Box sx={{ overflowY: 'auto', p: 3, flex: 1 }}>
          <Box sx={{ display: activeTab === 0 ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>

            {/* Manage Categories */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Categories</Typography>
              <Button onClick={onOpenAddCategory} variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} sx={{ mb: 1 }}>Add Category</Button>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.keys(exercises).map(category => (
                  <Box key={category} draggable onDragStart={(e) => handleCategoryDragStart(e, category)} onDragOver={handleCategoryDragOver} onDrop={(e) => handleCategoryDrop(e, category)} sx={{ display: 'flex', alignItems: editingCategory === category ? 'flex-start' : 'center', gap: 1, p: 1, borderRadius: 1, border: 1, borderColor: 'divider', backgroundColor: 'background.paper', cursor: 'grab' }}>
                    <DragIndicatorIcon sx={{ color: 'text.secondary', flexShrink: 0, marginTop: editingCategory === category ? 6 : 0, fontSize: 16 }} />
                    {editingCategory === category ? (
                      <>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} variant="outlined" size="small" fullWidth />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Default Goal:</Typography>
                            <TextField
                              type="number"
                              value={editCategoryGoalEnabled ? editCategoryGoalRequired : ''}
                              placeholder="None"
                              onChange={(e) => {
                                const val = e.target.value;
                                const n = parseInt(val);
                                if (!val || n <= 0) {
                                  setEditCategoryGoalEnabled(false);
                                } else {
                                  setEditCategoryGoalRequired(n);
                                  setEditCategoryGoalEnabled(true);
                                }
                              }}
                              size="small"
                              sx={{ width: 90 }}
                              slotProps={{ htmlInput: { min: 0 } }}
                            />
                            {editCategoryGoalEnabled && (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>/ week</Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Button onClick={saveEditCategory} variant="contained" size="small">Save</Button>
                          <Button onClick={() => setEditingCategory(null)} variant="outlined" size="small">Cancel</Button>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>{category}</Typography>
                          {goalSettings[category]?.enabled && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Default Goal: {goalSettings[category].required} / week
                            </Typography>
                          )}
                        </Box>
                        <IconButton onClick={() => startEditCategory(category)}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton onClick={() => deleteCategory(category)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                      </>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Manage Exercises */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Exercises</Typography>
              <Button onClick={onOpenAddExercise} variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} sx={{ mb: 1 }}>Add Exercise</Button>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.keys(exercises).map(category => (
                  <Box key={category} sx={{ borderRadius: 1, p: 1.5, border: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
                    <Typography sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>{category}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {exercises[category].length === 0 ? (
                        <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No exercises</Typography>
                      ) : (
                        exercises[category].map((exercise, index) => (
                          <Box key={exercise.id} draggable onDragStart={(e) => handleDragStart(e, category, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, category, index)} sx={{ display: 'flex', alignItems: editingExercise?.category === category && editingExercise?.id === exercise.id ? 'flex-start' : 'center', gap: 1, p: 1, borderRadius: 1, cursor: 'grab', '&:hover': { backgroundColor: 'action.hover' } }}>
                            <DragIndicatorIcon sx={{ color: 'text.secondary', marginTop: editingExercise?.category === category && editingExercise?.id === exercise.id ? 6 : 0, fontSize: 16 }} />
                            {editingExercise?.category === category && editingExercise?.id === exercise.id ? (
                              <>
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                  <TextField value={editExerciseName} onChange={(e) => setEditExerciseName(e.target.value)} size="small" placeholder="Exercise name" fullWidth />
                                  <TextField value={editExerciseDescription} onChange={(e) => setEditExerciseDescription(e.target.value)} size="small" placeholder="Description (optional)" multiline rows={2} fullWidth />
                                  {goalSettings[editingExercise!.category]?.enabled && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Goal:</Typography>
                                      <TextField
                                        type="number"
                                        value={editExerciseNoGoal ? '' : editExerciseOverrideRequired}
                                        placeholder="None"
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const n = parseInt(val);
                                          if (!val || n <= 0) {
                                            setEditExerciseNoGoal(true);
                                            setEditExerciseOverride(false);
                                          } else {
                                            setEditExerciseOverrideRequired(n);
                                            setEditExerciseOverride(true);
                                            setEditExerciseNoGoal(false);
                                          }
                                        }}
                                        size="small"
                                        sx={{ width: 90 }}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                      />
                                      {!editExerciseNoGoal && (
                                        <>
                                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>/ week</Typography>
                                          {!editExerciseOverride && (
                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>(default)</Typography>
                                          )}
                                          {editExerciseOverride && (
                                            <Typography variant="body2" component="span" onClick={() => { setEditExerciseOverride(false); setEditExerciseOverrideRequired(goalSettings[editingExercise!.category]?.required ?? 3); }} sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}>Reset to category default</Typography>
                                          )}
                                        </>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Button onClick={saveEditExercise} variant="contained" size="small">Save</Button>
                                  <Button onClick={() => { setEditingExercise(null); setEditExerciseName(''); setEditExerciseDescription(''); }} variant="outlined" size="small">Cancel</Button>
                                </Box>
                              </>
                            ) : (
                              <>
                                <Box sx={{ flex: 1 }}>
                                  <Typography>{exercise.name}</Typography>
                                  {exerciseDescriptions[exercise.id] && (
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontStyle: 'italic' }}>
                                      {exerciseDescriptions[exercise.id]}
                                    </Typography>
                                  )}
                                  {goalSettings[category]?.enabled && (() => {
                                    const eg = exerciseGoals[exercise.id];
                                    if (eg?.disabled) return <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>No goal</Typography>;
                                    if (eg?.override) return <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>Goal: {eg.required} / week</Typography>;
                                    return <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>Goal: {goalSettings[category].required} / week</Typography>;
                                  })()}
                                </Box>
                                <IconButton onClick={() => startEditExercise(category, exercise)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                                <IconButton onClick={() => deleteExercise(category, exercise)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                              </>
                            )}
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>


          </Box>
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Custom App Name</Typography>
                <ToggleButtonGroup color="primary" value={useCustomAppName ? 'on' : 'off'} exclusive onChange={(_e, val) => { if (val) setUseCustomAppName(val === 'on'); }} size="small" aria-label="Custom app name">
                  <ToggleButton value="on">On</ToggleButton>
                  <ToggleButton value="off">Off</ToggleButton>
                </ToggleButtonGroup>
                {useCustomAppName && (
                  <TextField
                    value={appName}
                    onChange={(e) => setAppName(e.target.value || 'Fitness Tracker')}
                    size="small"
                    placeholder="Fitness Tracker"
                    sx={{ maxWidth: 280 }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Theme</Typography>
                <ToggleButtonGroup color="primary" value={darkMode ? 'dark' : 'light'} exclusive onChange={(_e, val) => { if (val) setDarkMode(val === 'dark'); }} size="small" aria-label="Theme">
                  <ToggleButton value="light">Light Mode</ToggleButton>
                  <ToggleButton value="dark">Dark Mode</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Default Calendar View</Typography>
                <ToggleButtonGroup color="primary" value={defaultChartMode} exclusive onChange={(_e, val) => { if (val) setDefaultChartMode(val); }} size="small" aria-label="Default calendar view">
                  <ToggleButton value="weekly">Week</ToggleButton>
                  <ToggleButton value="monthly">Month</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Week Starts On</Typography>
                <ToggleButtonGroup color="primary" value={weekStartDay} exclusive onChange={(_e, val) => { if (val !== null) setWeekStartDay(val); }} size="small" aria-label="Week starts on">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                    <ToggleButton key={i} value={i}>{label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Animations</Typography>
                <ToggleButtonGroup color="primary" value={animationsEnabled ? 'on' : 'off'} exclusive onChange={(_e, val) => { if (val) setAnimationsEnabled(val === 'on'); }} size="small" aria-label="Animations">
                  <ToggleButton value="on">On</ToggleButton>
                  <ToggleButton value="off">Off</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Show Schedule in Log</Typography>
                <ToggleButtonGroup color="primary" value={showScheduleInLog ? 'on' : 'off'} exclusive onChange={(_e, val) => { if (val) setShowScheduleInLog(val === 'on'); }} size="small" aria-label="Schedule indicators">
                  <ToggleButton value="on">On</ToggleButton>
                  <ToggleButton value="off">Off</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Show Exercise Descriptions in Log</Typography>
                <ToggleButtonGroup color="primary" value={showDescriptionsInLog ? 'on' : 'off'} exclusive onChange={(_e, val) => { if (val) setShowDescriptionsInLog(val === 'on'); }} size="small" aria-label="Exercise descriptions">
                  <ToggleButton value="on">On</ToggleButton>
                  <ToggleButton value="off">Off</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          )}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: 'action.hover' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}><strong>Last export:</strong> {getLastExportInfo()}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  <strong>Save file:</strong> {savedFileName ?? 'Not set — click Export to choose'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button onClick={exportToJSON} variant="contained" color="success" startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}>Export</Button>
                <Button component="label" variant="contained" color="secondary" startIcon={<UploadIcon sx={{ fontSize: 18 }} />}>
                  Import
                  <input type="file" accept=".json" onChange={importFromJSON} hidden />
                </Button>
              </Box>
              <Button onClick={handleClearData} variant="contained" color="error" sx={{ alignSelf: 'flex-start' }}>Clear All Data</Button>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button onClick={onClose} variant="contained" color="primary" fullWidth>Done</Button>
        </Box>
      </Box>
    </Modal>
    <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
      <DialogTitle>Confirm</DialogTitle>
      <DialogContent>{confirmDialog?.message}</DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmDialog(null)}>Cancel</Button>
        <Button onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }} color="error" variant="contained">Confirm</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default SettingsModal;
