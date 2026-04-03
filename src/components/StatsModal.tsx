import React from 'react';
import { X } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { formatDateKey } from '../utils/dateUtils';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  dates: Date[];
}

const StatsModal: React.FC<StatsModalProps> = ({ open, onClose, darkMode, exercises, completions, dates }) => {
  if (!open) return null;

  const isCompleted = (category: string, exercise: string, dateStr: string): boolean =>
    completions[`${category}-${exercise}-${dateStr}`] || false;

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
    return Object.keys(exercises).some(category =>
      exercises[category].some(ex => isCompleted(category, ex, dateStr))
    );
  }).length;

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 960, width: '100%', mx: 2, backgroundColor: darkMode ? '#0b1220' : '#ffffff', color: darkMode ? '#e5e7eb' : '#111827' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Monthly Summary</Typography>
          <IconButton onClick={onClose}><X size={24} style={{ color: darkMode ? '#c7c7c7' : '#374151' }} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: darkMode ? '#374151' : '#eff6ff' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: darkMode ? '#bfdbfe' : '#1e40af' }}>Total Completions</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>{totalCompletions}</Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: darkMode ? '#374151' : '#ecfdf5' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: darkMode ? '#86efac' : '#065f46' }}>Active Days</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>{activeDays} / {dates.length}</Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: darkMode ? '#374151' : '#f5f3ff' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: darkMode ? '#c4b5fd' : '#6b21a8' }}>By Category</Typography>
            {Object.entries(completionsByCategory).map(([cat, count]) => (
              <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <span style={{ textTransform: 'capitalize', color: darkMode ? '#d1d5db' : '#374151' }}>{cat}:</span>
                <span style={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#1f2937' }}>{count}</span>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">Close</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default StatsModal;
