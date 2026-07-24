import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

const LogLegend: React.FC = () => {
  const theme = useTheme();

  const items = [
    { label: 'Completed', color: theme.palette.success.main },
    { label: 'Scheduled', color: alpha(theme.palette.primary.main, 0.1) },
    { label: 'Not completed', color: theme.palette.action.hover },
    { label: 'Upcoming', color: theme.palette.action.disabledBackground },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map(({ label, color }) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 0.5, backgroundColor: color, border: `1px solid ${theme.palette.divider}` }} />
          <Typography variant="labelXs" sx={{ color: 'text.secondary' }}>{label}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default LogLegend;
