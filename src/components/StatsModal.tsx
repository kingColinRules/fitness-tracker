import React from 'react';
import { X } from 'lucide-react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { formatDateKey } from '../utils/dateUtils';
import { isCompleted as isCompletedUtil } from '../utils/completionUtils';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  dates: Date[];
}

const StatsModal: React.FC<StatsModalProps> = ({ open, onClose, exercises, completions, dates }) => {
  const totalCompletions = dates.reduce((sum, date) => {
    const dateStr = formatDateKey(date);
    return sum + Object.keys(exercises).reduce((catSum, category) => {
      return catSum + exercises[category].filter(ex => isCompletedUtil(completions, category, ex, dateStr)).length;
    }, 0);
  }, 0);

  const completionsByCategory: Record<string, number> = {};
  Object.keys(exercises).forEach(category => {
    completionsByCategory[category] = dates.reduce((sum, date) => {
      const dateStr = formatDateKey(date);
      return sum + exercises[category].filter(ex => isCompletedUtil(completions, category, ex, dateStr)).length;
    }, 0);
  });

  const activeDays = dates.filter(date => {
    const dateStr = formatDateKey(date);
    return Object.keys(exercises).some(category =>
      exercises[category].some(ex => isCompletedUtil(completions, category, ex, dateStr))
    );
  }).length;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 960, width: 'calc(100% - 32px)', backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Monthly Summary</Typography>
          <IconButton onClick={onClose}><X size={24} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'action.hover' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>Total Completions</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{totalCompletions}</Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'action.hover' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>Active Days</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{activeDays} / {dates.length}</Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'action.hover' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'secondary.main' }}>By Category</Typography>
            {Object.entries(completionsByCategory).map(([cat, count]) => (
              <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>{cat}:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{count}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">Close</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default StatsModal;
