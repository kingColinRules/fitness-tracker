import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useAppStore } from '../store';

interface AddExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, category: string) => void;
}

const AddExerciseModal: React.FC<AddExerciseModalProps> = ({ open, onClose, onAdd }) => {
  const { exercises } = useAppStore();
  const categories = Object.keys(exercises);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');

  const handleAdd = () => {
    if (name.trim() && category) {
      onAdd(name.trim(), category);
      setName('');
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: { xs: 'fixed', sm: 'absolute' }, top: { xs: 0, sm: '50%' }, left: { xs: 0, sm: '50%' }, transform: { xs: 'none', sm: 'translate(-50%, -50%)' }, borderRadius: { xs: 0, sm: 2 }, boxShadow: 6, p: 3, width: { xs: '100%', sm: 'calc(100% - 32px)' }, maxWidth: { xs: 'none', sm: 480 }, backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Exercise</Typography>
          <IconButton onClick={onClose}><CloseIcon sx={(theme) => ({ fontSize: theme.typography.iconLg.fontSize })} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Exercise Name</Typography>
            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Pull-ups" fullWidth />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Category</Typography>
            <TextField select value={category} onChange={(e) => setCategory(e.target.value)} SelectProps={{ native: true }} fullWidth>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </TextField>
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

export default AddExerciseModal;
