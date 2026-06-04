import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, goalEnabled: boolean, goalRequired: number) => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [goalEnabled, setGoalEnabled] = useState(true);
  const [goalRequired, setGoalRequired] = useState(3);

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim(), goalEnabled, goalRequired);
      setName('');
      setGoalEnabled(true);
      setGoalRequired(3);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: { xs: 'fixed', sm: 'absolute' }, top: { xs: 0, sm: '50%' }, left: { xs: 0, sm: '50%' }, transform: { xs: 'none', sm: 'translate(-50%, -50%)' }, borderRadius: { xs: 0, sm: 2 }, boxShadow: 6, p: 3, width: { xs: '100%', sm: 'calc(100% - 32px)' }, maxWidth: { xs: 'none', sm: 480 }, backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Category</Typography>
          <IconButton onClick={onClose}><CloseIcon sx={(theme) => ({ fontSize: theme.typography.iconLg.fontSize })} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Category Name</Typography>
            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Cardio" fullWidth onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Default Goal:</Typography>
            <TextField
              type="number"
              value={goalEnabled ? goalRequired : ''}
              placeholder="None"
              onChange={(e) => {
                const val = e.target.value;
                const n = parseInt(val);
                if (!val || n <= 0) {
                  setGoalEnabled(false);
                } else {
                  setGoalRequired(n);
                  setGoalEnabled(true);
                }
              }}
              size="small"
              sx={{ width: 90 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            {goalEnabled && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>/ week</Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AddCategoryModal;
