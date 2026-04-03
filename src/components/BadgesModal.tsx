import React from 'react';
import { X } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { formatDateKey } from '../utils/dateUtils';

interface BadgesModalProps {
  open: boolean;
  onClose: () => void;
  exercises: Record<string, string[]>;
  completions: Record<string, boolean>;
  dates: Date[];
}

const BadgesModal: React.FC<BadgesModalProps> = ({ open, onClose, exercises, completions, dates }) => {
  const theme = useTheme();

  if (!open) return null;

  const isCompleted = (category: string, exercise: string, dateStr: string): boolean =>
    completions[`${category}-${exercise}-${dateStr}`] || false;

  const totalCompletions = dates.reduce((sum, date) => {
    const dateStr = formatDateKey(date);
    return sum + Object.keys(exercises).reduce((catSum, category) => {
      return catSum + exercises[category].filter(ex => isCompleted(category, ex, dateStr)).length;
    }, 0);
  }, 0);

  const activeDays = dates.filter(date => {
    const dateStr = formatDateKey(date);
    return Object.keys(exercises).some(category =>
      exercises[category].some(ex => isCompleted(category, ex, dateStr))
    );
  }).length;

  const badges = [
    { name: '50 Completions', icon: '🏆', earned: totalCompletions >= 50, progress: totalCompletions, target: 50 },
    { name: '100 Completions', icon: '💯', earned: totalCompletions >= 100, progress: totalCompletions, target: 100 },
    { name: '20 Active Days', icon: '📅', earned: activeDays >= 20, progress: activeDays, target: 20 },
    { name: 'Perfect Month', icon: '⭐', earned: activeDays === dates.length, progress: activeDays, target: dates.length },
  ];

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 960, width: '100%', mx: 2, maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Achievement Badges</Typography>
          <IconButton onClick={onClose}><X size={24} /></IconButton>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
          {badges.map((badge, index) => (
            <Box key={index} sx={{ p: 2, borderRadius: 1, border: `2px solid ${badge.earned ? 'transparent' : theme.palette.divider}`, backgroundColor: badge.earned ? undefined : theme.palette.action.hover, color: badge.earned ? 'text.primary' : 'text.secondary' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <span style={{ fontSize: 28, opacity: !badge.earned ? 0.3 : 1 }}>{badge.icon}</span>
                <Box sx={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{badge.name}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>{badge.progress} / {badge.target} {badge.name.includes('Day') ? 'days' : 'completions'}</div>
                </Box>
                {badge.earned && <div style={{ fontSize: 20 }}>✓</div>}
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
    </Box>
  );
};

export default BadgesModal;
