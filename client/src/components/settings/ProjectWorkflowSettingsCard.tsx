import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { Plus, CheckCircle2 } from 'lucide-react';
import {
  useGetStatusDefinitionsQuery,
  useCreateStatusDefinitionMutation,
  useGetCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinitionMutation,
} from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

export default function ProjectWorkflowSettingsCard() {
  const toast = useToast();
  const { data: statusDefs = [], isLoading: isLoadingStatuses } = useGetStatusDefinitionsQuery();
  const { data: customFieldDefs = [], isLoading: isLoadingFields } = useGetCustomFieldDefinitionsQuery();

  const [createStatus] = useCreateStatusDefinitionMutation();
  const [createCustomField] = useCreateCustomFieldDefinitionMutation();

  // Status Dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusName, setStatusName] = useState('');
  const [statusColor, setStatusColor] = useState('#2563EB');
  const [statusIsTerminal, setStatusIsTerminal] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Custom Field Dialog state
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldKeyName, setFieldKeyName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'Text' | 'Number' | 'Date' | 'Select' | 'Boolean'>('Text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldIsRequired, setFieldIsRequired] = useState(false);
  const [submittingField, setSubmittingField] = useState(false);

  // Default fallback data if API returns empty
  const defaultStatuses = [
    { id: 1, name: 'To Do', color: '#64748B', is_terminal: false },
    { id: 2, name: 'In Progress', color: '#2563EB', is_terminal: false },
    { id: 3, name: 'In Review', color: '#D97706', is_terminal: false },
    { id: 4, name: 'Done', color: '#16A34A', is_terminal: true },
    { id: 5, name: 'Blocked', color: '#DC2626', is_terminal: false },
  ];

  const defaultCustomFields = [
    { id: 1, name: 'cost_center', label: 'Cost Center', field_type: 'Text', is_required: false },
    { id: 2, name: 'risk_level', label: 'Risk Level', field_type: 'Select', is_required: true },
  ];

  const displayStatuses = statusDefs.length > 0 ? statusDefs : defaultStatuses;
  const displayCustomFields = customFieldDefs.length > 0 ? customFieldDefs : defaultCustomFields;

  const handleAddStatus = async () => {
    if (!statusName.trim()) {
      toast.showError('Status name is required');
      return;
    }
    try {
      setSubmittingStatus(true);
      await createStatus({
        name: statusName.trim(),
        color: statusColor,
        is_terminal: statusIsTerminal,
        display_order: displayStatuses.length + 1,
      }).unwrap();
      toast.showSuccess(`Workflow status "${statusName}" created successfully!`);
      setStatusDialogOpen(false);
      setStatusName('');
      setStatusColor('#2563EB');
      setStatusIsTerminal(false);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create status definition');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleAddCustomField = async () => {
    if (!fieldKeyName.trim() || !fieldLabel.trim()) {
      toast.showError('Key name and display label are required');
      return;
    }
    try {
      setSubmittingField(true);
      await createCustomField({
        name: fieldKeyName.trim().toLowerCase().replace(/\s+/g, '_'),
        label: fieldLabel.trim(),
        field_type: fieldType,
        options: fieldOptions.trim() || undefined,
        is_required: fieldIsRequired,
        display_order: displayCustomFields.length + 1,
      }).unwrap();
      toast.showSuccess(`Custom field "${fieldLabel}" registered successfully!`);
      setFieldDialogOpen(false);
      setFieldKeyName('');
      setFieldLabel('');
      setFieldType('Text');
      setFieldOptions('');
      setFieldIsRequired(false);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create custom field definition');
    } finally {
      setSubmittingField(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Workflow Statuses */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Task & Project Workflow Statuses</Typography>
            <Typography variant="body2" color="textSecondary">Configure dynamic pipeline statuses and terminal state indicators</Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setStatusDialogOpen(true)}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            Add Status
          </Button>
        </Box>

        {isLoadingStatuses ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : (
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Badge Color</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Terminal State</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayStatuses.map((s) => (
                <TableRow key={s.id}>
                  <TableCell sx={{ color: 'text.secondary' }}>{s.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{s.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={s.color} sx={{ bgcolor: s.color, color: 'white', fontWeight: 600, height: 20 }} />
                  </TableCell>
                  <TableCell>{s.is_terminal ? <CheckCircle2 size={16} color="#16A34A" /> : <Typography variant="body2" color="textSecondary">No</Typography>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Custom Field Definitions */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Custom Fields Registry</Typography>
            <Typography variant="body2" color="textSecondary">Manage dynamic custom attributes for tasks and projects</Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setFieldDialogOpen(true)}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            Add Custom Field
          </Button>
        </Box>

        {isLoadingFields ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : (
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Key Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Display Label</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Field Type</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Required</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayCustomFields.map((f) => (
                <TableRow key={f.id}>
                  <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{f.name}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{f.label}</TableCell>
                  <TableCell><Chip size="small" label={f.field_type} sx={{ textTransform: 'capitalize', bgcolor: 'action.hover' }} /></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{f.is_required ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog: Add Workflow Status */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Workflow Status</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Status Name"
            fullWidth
            size="small"
            value={statusName}
            onChange={(e) => setStatusName(e.target.value)}
            placeholder="e.g. In Review"
          />
          <TextField
            label="Color Hex"
            fullWidth
            size="small"
            value={statusColor}
            onChange={(e) => setStatusColor(e.target.value)}
            placeholder="#2563EB"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={statusIsTerminal}
                onChange={(e) => setStatusIsTerminal(e.target.checked)}
              />
            }
            label="Is Terminal / Completed State?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={submittingStatus}>Cancel</Button>
          <Button
            onClick={handleAddStatus}
            variant="contained"
            disabled={submittingStatus}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            {submittingStatus ? 'Saving...' : 'Save Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Custom Field */}
      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Custom Field</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Display Label"
            fullWidth
            size="small"
            value={fieldLabel}
            onChange={(e) => {
              setFieldLabel(e.target.value);
              if (!fieldKeyName) {
                setFieldKeyName(e.target.value.toLowerCase().replace(/\s+/g, '_'));
              }
            }}
            placeholder="e.g. Cost Center"
          />
          <TextField
            label="Key Name (database key)"
            fullWidth
            size="small"
            value={fieldKeyName}
            onChange={(e) => setFieldKeyName(e.target.value)}
            placeholder="e.g. cost_center"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Field Type</InputLabel>
            <Select
              value={fieldType}
              label="Field Type"
              onChange={(e) => setFieldType(e.target.value as any)}
            >
              <MenuItem value="Text">Text</MenuItem>
              <MenuItem value="Number">Number</MenuItem>
              <MenuItem value="Date">Date</MenuItem>
              <MenuItem value="Select">Select Dropdown</MenuItem>
              <MenuItem value="Boolean">Boolean (Yes/No)</MenuItem>
            </Select>
          </FormControl>
          {fieldType === 'Select' && (
            <TextField
              label="Options (comma separated)"
              fullWidth
              size="small"
              value={fieldOptions}
              onChange={(e) => setFieldOptions(e.target.value)}
              placeholder="Low, Medium, High, Critical"
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={fieldIsRequired}
                onChange={(e) => setFieldIsRequired(e.target.checked)}
              />
            }
            label="Required Field?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)} disabled={submittingField}>Cancel</Button>
          <Button
            onClick={handleAddCustomField}
            variant="contained"
            disabled={submittingField}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            {submittingField ? 'Saving...' : 'Save Custom Field'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
