import React, { useState } from 'react';
import { X } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

interface AddExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, category: string) => void;
  exercises: Record<string, string[]>;
}

const AddExerciseModal: React.FC<AddExerciseModalProps> = ({ open, onClose, onAdd, exercises }) => {
  const categories = Object.keys(exercises);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');

  if (!open) return null;

  const handleAdd = () => {
    if (name.trim() && category) {
      onAdd(name.trim(), category);
      setName('');
    }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 480, width: '100%', mx: 2, backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Exercise</Typography>
          <IconButton onClick={onClose}><X size={24} /></IconButton>
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
    </Box>
  );
};

export default AddExerciseModal;
