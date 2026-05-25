import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { useAppStore } from '../store';
import { useBadges } from '../hooks/useBadges';

interface BadgesModalProps {
  open: boolean;
  onClose: () => void;
}

const BadgesModal: React.FC<BadgesModalProps> = ({ open, onClose }) => {
  const { setSeenBadges } = useAppStore();
  const { badgeGroups, earnedBadgeNames, newBadgeNames, bestStreak, allTimeCompletions, allTimeActiveDays, cumulativeGoalsMet } = useBadges();
  const theme = useTheme();

  const goldColor = theme.palette.warning.main;
  const earnedBg = theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)';

  const handleClose = () => {
    setSeenBadges(earnedBadgeNames);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: 2, boxShadow: 6, p: 3,
        maxWidth: 680, width: 'calc(100% - 32px)',
        maxHeight: '90vh', overflowY: 'auto',
        backgroundColor: 'background.paper', color: 'text.primary',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Achievements</Typography>
          <IconButton onClick={handleClose}><CloseIcon sx={{ fontSize: theme.typography.iconLg.fontSize }} /></IconButton>
        </Box>

        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 3,
          p: 2, borderRadius: 1.5,
          backgroundColor: theme.palette.action.hover,
          border: `1px solid ${theme.palette.divider}`,
        }}>
          {[
            { label: 'Best Streak',  value: bestStreak },
            { label: 'Completions',  value: allTimeCompletions },
            { label: 'Active Days',  value: allTimeActiveDays },
            { label: 'Goals Met',    value: cumulativeGoalsMet },
          ].map(stat => (
            <Box key={stat.label} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.1 }}>{stat.value}</Typography>
              <Typography sx={{ fontSize: theme.typography.labelLg.fontSize, color: 'text.secondary', display: 'block', mt: 0.25 }}>{stat.label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {badgeGroups.map(group => (
            <Box key={group.title}>
              <Typography sx={{
                fontWeight: 700, fontSize: theme.typography.caption.fontSize, mb: 1.5,
                color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {group.title}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                {group.badges.map(badge => {
                  const isNew = newBadgeNames.has(badge.name);
                  return (
                    <Box key={badge.name} sx={{
                      position: 'relative',
                      p: 1.75, borderRadius: 1.5,
                      border: `2px solid ${badge.earned ? goldColor : theme.palette.divider}`,
                      backgroundColor: badge.earned ? earnedBg : 'transparent',
                      opacity: badge.earned ? 1 : 0.6,
                      transition: 'opacity 200ms, border-color 200ms',
                    }}>
                      {isNew && (
                        <Box sx={{
                          position: 'absolute', top: -9, right: 10,
                          backgroundColor: goldColor, color: '#fff',
                          fontSize: '0.6rem', fontWeight: 800,
                          px: 0.75, py: 0.2, borderRadius: 0.75,
                          letterSpacing: '0.06em', lineHeight: 1.6,
                        }}>
                          NEW
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1 }}>
                        <Box component="span" sx={{ fontSize: '1.375rem', lineHeight: 1, flexShrink: 0, opacity: badge.earned ? 1 : 0.35 }}>
                          {badge.icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: theme.typography.body2.fontSize, lineHeight: 1.2 }}>{badge.name}</Typography>
                            {badge.earned && (
                              <Box component="span" sx={{ color: goldColor, fontSize: '0.9rem', flexShrink: 0, fontWeight: 700 }}>✓</Box>
                            )}
                          </Box>
                          <Typography sx={{ fontSize: theme.typography.labelLg.fontSize, color: 'text.secondary', mt: 0.25 }}>
                            {Math.min(badge.progress, badge.target).toLocaleString()} / {badge.target.toLocaleString()} {badge.unit}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ width: '100%', height: 5, borderRadius: 1, backgroundColor: theme.palette.divider }}>
                        <Box sx={{
                          height: '100%', borderRadius: 1,
                          transition: 'width 400ms ease',
                          backgroundColor: badge.earned ? goldColor : theme.palette.primary.main,
                          width: `${Math.min((badge.progress / badge.target) * 100, 100)}%`,
                        }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button onClick={handleClose} variant="contained" fullWidth>Done</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default BadgesModal;
