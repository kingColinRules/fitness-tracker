import React from 'react';
import { X } from 'lucide-react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { formatDateKey } from '../utils/dateUtils';
import { isCompleted as isCompletedUtil } from '../utils/completionUtils';

interface BadgesModalProps {
  open: boolean;
  onClose: () => void;
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  dates: Date[];
}

const BadgesModal: React.FC<BadgesModalProps> = ({ open, onClose, exercises, completions, dates }) => {
  const theme = useTheme();

  const totalCompletions = dates.reduce((sum, date) => {
    const dateStr = formatDateKey(date);
    return sum + Object.keys(exercises).reduce((catSum, category) => {
      return catSum + exercises[category].filter(ex => isCompletedUtil(completions, category, ex, dateStr)).length;
    }, 0);
  }, 0);

  const activeDays = dates.filter(date => {
    const dateStr = formatDateKey(date);
    return Object.keys(exercises).some(category =>
      exercises[category].some(ex => isCompletedUtil(completions, category, ex, dateStr))
    );
  }).length;

  const badges = [
    { name: '50 Completions', icon: '🏆', earned: totalCompletions >= 50, progress: totalCompletions, target: 50 },
    { name: '100 Completions', icon: '💯', earned: totalCompletions >= 100, progress: totalCompletions, target: 100 },
    { name: '20 Active Days', icon: '📅', earned: activeDays >= 20, progress: activeDays, target: 20 },
    { name: 'Perfect Month', icon: '⭐', earned: activeDays === dates.length, progress: activeDays, target: dates.length },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 960, width: 'calc(100% - 32px)', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Achievement Badges</Typography>
          <IconButton onClick={onClose}><X size={24} /></IconButton>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
          {badges.map((badge, index) => (
            <Box key={index} sx={{ p: 2, borderRadius: 1, border: `2px solid ${badge.earned ? 'transparent' : theme.palette.divider}`, backgroundColor: badge.earned ? undefined : theme.palette.action.hover, color: badge.earned ? 'text.primary' : 'text.secondary' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box component="span" sx={{ fontSize: theme.typography.iconLg.fontSize, opacity: !badge.earned ? 0.3 : 1 }}>{badge.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ fontWeight: 700, fontSize: '1rem' }}>{badge.name}</Box>
                  <Box sx={{ fontSize: theme.typography.labelLg.fontSize, mt: '6px' }}>{badge.progress} / {badge.target} {badge.name.includes('Day') ? 'days' : 'completions'}</Box>
                </Box>
                {badge.earned && <Box sx={{ fontSize: theme.typography.iconMd.fontSize }}>✓</Box>}
              </Box>
              <Box sx={{ width: '100%', height: 8, borderRadius: 1, backgroundColor: 'divider' }}>
                <Box sx={{ height: '100%', borderRadius: 1, transition: 'width 300ms', backgroundColor: badge.earned ? 'success.main' : 'primary.main', width: `${Math.min((badge.progress / badge.target) * 100, 100)}%` }} />
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">Close</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default BadgesModal;
