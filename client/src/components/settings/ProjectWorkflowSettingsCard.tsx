import React from 'react';
import { Box, Paper, Typography, Grid, Chip, Button, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { Plus, Sliders, CheckCircle2 } from 'lucide-react';

export default function ProjectWorkflowSettingsCard() {
  const defaultStatuses = [
    { id: 1, name: 'To Do', color: '#64748B', is_terminal: false },
    { id: 2, name: 'In Progress', color: '#2563EB', is_terminal: false },
    { id: 3, name: 'In Review', color: '#D97706', is_terminal: false },
    { id: 4, name: 'Done', color: '#16A34A', is_terminal: true },
    { id: 5, name: 'Blocked', color: '#DC2626', is_terminal: false },
  ];

  const defaultCustomFields = [
    { id: 1, name: 'cost_center', label: 'Cost Center', field_type: 'text', is_required: false },
    { id: 2, name: 'risk_level', label: 'Risk Level', field_type: 'select', is_required: true },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Workflow Statuses */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>Task & Project Workflow Statuses</Typography>
            <Typography variant="body2" color="textSecondary">Configure dynamic pipeline statuses and terminal state indicators</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Plus size={16} />} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
            Add Status
          </Button>
        </Box>

        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Badge Color</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Terminal State</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {defaultStatuses.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={s.color} sx={{ bgcolor: s.color, color: 'white', fontWeight: 600, height: 20 }} />
                </TableCell>
                <TableCell>{s.is_terminal ? <CheckCircle2 size={16} color="#16A34A" /> : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Custom Field Definitions */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>Custom Fields Registry</Typography>
            <Typography variant="body2" color="textSecondary">Manage dynamic custom attributes for tasks and projects</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Plus size={16} />} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
            Add Custom Field
          </Button>
        </Box>

        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Key Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Display Label</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Field Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Required</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {defaultCustomFields.map((f) => (
              <TableRow key={f.id}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{f.name}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{f.label}</TableCell>
                <TableCell><Chip size="small" label={f.field_type} sx={{ textTransform: 'capitalize' }} /></TableCell>
                <TableCell>{f.is_required ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
