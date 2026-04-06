import React, { useState } from 'react';
import { X } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');

  if (!open) return null;

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', borderRadius: 2, boxShadow: 6, p: 3, maxWidth: 480, width: '100%', mx: 2, backgroundColor: 'background.paper', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Category</Typography>
          <IconButton onClick={onClose}><X size={24} /></IconButton>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Category Name</Typography>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Cardio" fullWidth />
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AddCategoryModal;
