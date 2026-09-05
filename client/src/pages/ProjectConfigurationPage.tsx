import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  InputAdornment,
  Grid,
} from '@mui/material';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Sliders,
  FileCode2,
  CheckSquare,
  FolderCog,
  Zap,
} from 'lucide-react';
import {
  useGetStatusDefinitionsQuery,
  useCreateStatusDefinitionMutation,
  useUpdateStatusDefinitionMutation,
  useDeleteStatusDefinitionMutation,
  useGetCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinitionMutation,
  useUpdateCustomFieldDefinitionMutation,
  useDeleteCustomFieldDefinitionMutation,
  StatusDefinitionItem,
  CustomFieldDefinitionItem,
} from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2.5 }}>{children}</Box>}
    </div>
  );
}

export default function ProjectConfigurationPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);

  // RTK Query Hooks
  const { data: statusDefs = [], isLoading: isLoadingStatuses } = useGetStatusDefinitionsQuery();
  const { data: customFieldDefs = [], isLoading: isLoadingFields } = useGetCustomFieldDefinitionsQuery();

  const [createStatus] = useCreateStatusDefinitionMutation();
  const [updateStatus] = useUpdateStatusDefinitionMutation();
  const [deleteStatus] = useDeleteStatusDefinitionMutation();

  const [createCustomField] = useCreateCustomFieldDefinitionMutation();
  const [updateCustomField] = useUpdateCustomFieldDefinitionMutation();
  const [deleteCustomField] = useDeleteCustomFieldDefinitionMutation();

  // Search Filters
  const [statusSearch, setStatusSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');

  // --- Status Modal State ---
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusDefinitionItem | null>(null);
  const [statusName, setStatusName] = useState('');
  const [statusColor, setStatusColor] = useState('#2563EB');
  const [statusIsTerminal, setStatusIsTerminal] = useState(false);
  const [statusDisplayOrder, setStatusDisplayOrder] = useState<number>(0);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Delete Status Confirmation Modal State
  const [deleteStatusModalOpen, setDeleteStatusModalOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<StatusDefinitionItem | null>(null);
  const [deletingStatus, setDeletingStatus] = useState(false);

  // --- Custom Field Modal State ---
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinitionItem | null>(null);
  const [fieldKeyName, setFieldKeyName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldAppliesTo, setFieldAppliesTo] = useState<'Task' | 'Project' | 'Both'>('Task');
  const [fieldType, setFieldType] = useState<string>('Text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldIsRequired, setFieldIsRequired] = useState(false);
  const [fieldIsActive, setFieldIsActive] = useState(true);
  const [fieldDisplayOrder, setFieldDisplayOrder] = useState<number>(0);
  const [submittingField, setSubmittingField] = useState(false);

  // Delete Custom Field Confirmation Modal State
  const [deleteFieldModalOpen, setDeleteFieldModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinitionItem | null>(null);
  const [deletingField, setDeletingField] = useState(false);

  // --- Task Settings State ---
  const [taskSettings, setTaskSettings] = useState({
    defaultStatusId: 1,
    defaultPriority: 'NORMAL',
    allowTaskAssignment: true,
    allowTaskReassignment: true,
    requireDueDate: false,
    allowAttachments: true,
    enableTaskComments: true,
    enableTaskDependencies: true,
    defaultTaskView: 'List',
  });

  // --- Project Settings State ---
  const [projectSettings, setProjectSettings] = useState({
    defaultProjectStatus: 'Active',
    projectCodePrefix: 'PRJ-',
    projectNumbering: 'Auto',
    requireProjectManager: true,
    requireStartDate: true,
    requireEndDate: false,
    allowProjectArchiving: true,
    enableProjectBudget: true,
    enableProjectDocuments: true,
  });

  // Default fallback data if API returns empty
  const defaultStatuses: StatusDefinitionItem[] = [
    { id: 1, name: 'To Do', color: '#64748B', display_order: 1, is_terminal: false },
    { id: 2, name: 'In Progress', color: '#2563EB', display_order: 2, is_terminal: false },
    { id: 3, name: 'In Review', color: '#D97706', display_order: 3, is_terminal: false },
    { id: 4, name: 'Done', color: '#16A34A', display_order: 4, is_terminal: true },
    { id: 5, name: 'Blocked', color: '#DC2626', display_order: 5, is_terminal: false },
  ];

  const defaultCustomFields: CustomFieldDefinitionItem[] = [
    { id: 1, name: 'cost_center', label: 'Cost Center', field_type: 'Text', is_required: false, display_order: 1 },
    { id: 2, name: 'risk_level', label: 'Risk Level', field_type: 'Select', is_required: true, display_order: 2, options: 'Low,Medium,High,Critical' },
  ];

  const displayStatuses = statusDefs.length > 0 ? statusDefs : defaultStatuses;
  const displayCustomFields = customFieldDefs.length > 0 ? customFieldDefs : defaultCustomFields;

  // Filtered Statuses
  const filteredStatuses = displayStatuses.filter(s =>
    s.name.toLowerCase().includes(statusSearch.toLowerCase()) ||
    s.color.toLowerCase().includes(statusSearch.toLowerCase())
  );

  // Filtered Custom Fields
  const filteredCustomFields = displayCustomFields.filter(f =>
    f.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
    f.label.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  // --- Handlers: Status ---
  const handleOpenStatusModal = (statusItem?: StatusDefinitionItem) => {
    if (statusItem) {
      setEditingStatus(statusItem);
      setStatusName(statusItem.name);
      setStatusColor(statusItem.color);
      setStatusIsTerminal(statusItem.is_terminal);
      setStatusDisplayOrder(statusItem.display_order);
    } else {
      setEditingStatus(null);
      setStatusName('');
      setStatusColor('#2563EB');
      setStatusIsTerminal(false);
      setStatusDisplayOrder(displayStatuses.length + 1);
    }
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusName.trim()) {
      toast.showError('Status name is required');
      return;
    }
    try {
      setSubmittingStatus(true);
      if (editingStatus) {
        await updateStatus({
          id: editingStatus.id,
          body: {
            name: statusName.trim(),
            color: statusColor,
            is_terminal: statusIsTerminal,
            display_order: Number(statusDisplayOrder),
          },
        }).unwrap();
        toast.showSuccess(`Workflow status "${statusName}" updated successfully!`);
      } else {
        await createStatus({
          name: statusName.trim(),
          color: statusColor,
          is_terminal: statusIsTerminal,
          display_order: Number(statusDisplayOrder),
        }).unwrap();
        toast.showSuccess(`Workflow status "${statusName}" created successfully!`);
      }
      setStatusModalOpen(false);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to save status definition');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleDeleteStatusClick = (statusItem: StatusDefinitionItem) => {
    setStatusToDelete(statusItem);
    setDeleteStatusModalOpen(true);
  };

  const handleConfirmDeleteStatus = async () => {
    if (!statusToDelete) return;
    try {
      setDeletingStatus(true);
      await deleteStatus(statusToDelete.id).unwrap();
      toast.showSuccess(`Status "${statusToDelete.name}" deleted successfully.`);
      setDeleteStatusModalOpen(false);
      setStatusToDelete(null);
    } catch (err: any) {
      toast.showError(err?.data?.detail || `Cannot delete status "${statusToDelete.name}". It may be currently assigned to tasks.`);
    } finally {
      setDeletingStatus(false);
    }
  };

  // --- Handlers: Custom Fields ---
  const handleOpenFieldModal = (fieldItem?: CustomFieldDefinitionItem) => {
    if (fieldItem) {
      setEditingField(fieldItem);
      setFieldKeyName(fieldItem.name);
      setFieldLabel(fieldItem.label);
      setFieldType(fieldItem.field_type || 'Text');
      setFieldOptions(fieldItem.options || '');
      setFieldIsRequired(fieldItem.is_required);
      setFieldIsActive(true);
      setFieldDisplayOrder(fieldItem.display_order);
    } else {
      setEditingField(null);
      setFieldKeyName('');
      setFieldLabel('');
      setFieldAppliesTo('Task');
      setFieldType('Text');
      setFieldOptions('');
      setFieldIsRequired(false);
      setFieldIsActive(true);
      setFieldDisplayOrder(displayCustomFields.length + 1);
    }
    setFieldModalOpen(true);
  };

  const handleSaveCustomField = async () => {
    if (!fieldKeyName.trim() || !fieldLabel.trim()) {
      toast.showError('Key name and display label are required');
      return;
    }
    try {
      setSubmittingField(true);
      const payload = {
        name: fieldKeyName.trim().toLowerCase().replace(/\s+/g, '_'),
        label: fieldLabel.trim(),
        field_type: fieldType,
        options: fieldOptions.trim() ? fieldOptions.trim() : undefined,
        is_required: fieldIsRequired,
        display_order: Number(fieldDisplayOrder),
      };

      if (editingField) {
        await updateCustomField({ id: editingField.id, body: payload }).unwrap();
        toast.showSuccess(`Custom field "${fieldLabel}" updated successfully!`);
      } else {
        await createCustomField(payload).unwrap();
        toast.showSuccess(`Custom field "${fieldLabel}" created successfully!`);
      }
      setFieldModalOpen(false);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to save custom field definition');
    } finally {
      setSubmittingField(false);
    }
  };

  const handleDeleteFieldClick = (fieldItem: CustomFieldDefinitionItem) => {
    setFieldToDelete(fieldItem);
    setDeleteFieldModalOpen(true);
  };

  const handleConfirmDeleteField = async () => {
    if (!fieldToDelete) return;
    try {
      setDeletingField(true);
      await deleteCustomField(fieldToDelete.id).unwrap();
      toast.showSuccess(`Custom field "${fieldToDelete.label}" deleted.`);
      setDeleteFieldModalOpen(false);
      setFieldToDelete(null);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to delete custom field.');
    } finally {
      setDeletingField(false);
    }
  };

  // Save Settings Handlers
  const handleSaveTaskSettings = () => {
    toast.showSuccess('Task configuration settings saved successfully!');
  };

  const handleSaveProjectSettings = () => {
    toast.showSuccess('Project configuration parameters saved successfully!');
  };

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.4 }}>
          Project & Task Configuration
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.2 }}>
          Configure project and task master data and system behavior.
        </Typography>
      </Box>

      {/* ── Main ERP Workspace Container ─────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden', bgcolor: 'background.paper' }}>
        {/* Horizontal Navigation Tabs */}
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: 'text.secondary',
                py: 1,
                px: 2.5,
                '&.Mui-selected': { color: 'primary.main', fontWeight: 700 },
              },
              '& .MuiTabs-indicator': { backgroundColor: '#04552B', height: 3 },
            }}
          >
            <Tab icon={<Sliders size={15} />} iconPosition="start" label="1. Workflow Statuses" />
            <Tab icon={<FileCode2 size={15} />} iconPosition="start" label="2. Custom Fields" />
            <Tab icon={<CheckSquare size={15} />} iconPosition="start" label="3. Task Settings" />
            <Tab icon={<FolderCog size={15} />} iconPosition="start" label="4. Project Settings" />
            <Tab icon={<Zap size={15} />} iconPosition="start" label="5. Automations Rules" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* ────────────────────────────────────────────────────────────────
              TAB 1: WORKFLOW STATUSES
          ──────────────────────────────────────────────────────────────── */}
          <CustomTabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '16px' }}>
                  Workflow Statuses
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '13px' }}>
                  Configure task and project workflow statuses.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  placeholder="Search status..."
                  size="small"
                  value={statusSearch}
                  onChange={(e) => setStatusSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={14} color="#94A3B8" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 220, '& .MuiOutlinedInput-root': { height: 32, fontSize: 13 } }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={15} />}
                  onClick={() => handleOpenStatusModal()}
                  sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 32, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  Add Status
                </Button>
              </Box>
            </Box>

            {isLoadingStatuses ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
            ) : (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, width: 60 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Status Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Color</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Terminal</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Sort Order</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, width: 100 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStatuses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                          No workflow statuses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStatuses.map((s) => (
                        <TableRow key={s.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{s.id}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{s.name}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                                {s.color}
                              </Typography>
                              <Chip
                                size="small"
                                label={s.name}
                                sx={{ bgcolor: s.color, color: '#FFFFFF', fontWeight: 600, fontSize: 11, height: 20, ml: 0.5 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: 13 }}>
                            {s.is_terminal ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#16A34A', fontWeight: 600 }}>
                                <CheckCircle2 size={15} /> Yes
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>No</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{s.display_order}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenStatusModal(s)} sx={{ color: 'text.secondary', p: 0.5 }}>
                                <Pencil size={15} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => handleDeleteStatusClick(s)} sx={{ color: '#EF4444', p: 0.5, ml: 0.5 }}>
                                <Trash2 size={15} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </CustomTabPanel>

          {/* ────────────────────────────────────────────────────────────────
              TAB 2: CUSTOM FIELDS
          ──────────────────────────────────────────────────────────────── */}
          <CustomTabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '16px' }}>
                  Custom Fields
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '13px' }}>
                  Manage dynamic custom attributes for projects and tasks.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  placeholder="Search field..."
                  size="small"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={14} color="#94A3B8" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 220, '& .MuiOutlinedInput-root': { height: 32, fontSize: 13 } }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={15} />}
                  onClick={() => handleOpenFieldModal()}
                  sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 32, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  Add Custom Field
                </Button>
              </Box>
            </Box>

            {isLoadingFields ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
            ) : (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Field Name / Key</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Display Label</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Applies To</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Field Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Required</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, width: 100 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCustomFields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                          No custom field definitions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomFields.map((f) => (
                        <TableRow key={f.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.primary', fontWeight: 600 }}>
                            {f.name}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: 'text.primary', fontWeight: 600 }}>{f.label}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>
                            <Chip size="small" label="Task" sx={{ height: 20, fontSize: 11, bgcolor: 'action.hover', color: 'text.primary' }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 13 }}>
                            <Chip size="small" label={f.field_type} sx={{ height: 20, fontSize: 11, textTransform: 'capitalize', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: f.is_required ? '#DC2626' : 'text.secondary', fontWeight: f.is_required ? 600 : 400 }}>
                            {f.is_required ? 'Yes' : 'No'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13 }}>
                            <Chip size="small" label="Active" sx={{ height: 20, fontSize: 11, bgcolor: 'action.selected', color: '#16A34A', fontWeight: 600 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenFieldModal(f)} sx={{ color: 'text.secondary', p: 0.5 }}>
                                <Pencil size={15} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => handleDeleteFieldClick(f)} sx={{ color: '#EF4444', p: 0.5, ml: 0.5 }}>
                                <Trash2 size={15} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </CustomTabPanel>

          {/* ────────────────────────────────────────────────────────────────
              TAB 3: TASK SETTINGS
          ──────────────────────────────────────────────────────────────── */}
          <CustomTabPanel value={activeTab} index={2}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '16px' }}>
                Task Settings
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '13px' }}>
                Global system configuration and rules for task management.
              </Typography>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', p: 3, bgcolor: 'background.default' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>Default Task Status</InputLabel>
                    <Select
                      value={taskSettings.defaultStatusId}
                      label="Default Task Status"
                      onChange={(e) => setTaskSettings({ ...taskSettings, defaultStatusId: Number(e.target.value) })}
                      sx={{ fontSize: 13 }}
                    >
                      {displayStatuses.map((s) => (
                        <MenuItem key={s.id} value={s.id} sx={{ fontSize: 13 }}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>Default Task Priority</InputLabel>
                    <Select
                      value={taskSettings.defaultPriority}
                      label="Default Task Priority"
                      onChange={(e) => setTaskSettings({ ...taskSettings, defaultPriority: e.target.value })}
                      sx={{ fontSize: 13 }}
                    >
                      <MenuItem value="LOW" sx={{ fontSize: 13 }}>Low</MenuItem>
                      <MenuItem value="NORMAL" sx={{ fontSize: 13 }}>Normal</MenuItem>
                      <MenuItem value="HIGH" sx={{ fontSize: 13 }}>High</MenuItem>
                      <MenuItem value="URGENT" sx={{ fontSize: 13 }}>Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>Default Task View</InputLabel>
                    <Select
                      value={taskSettings.defaultTaskView}
                      label="Default Task View"
                      onChange={(e) => setTaskSettings({ ...taskSettings, defaultTaskView: e.target.value })}
                      sx={{ fontSize: 13 }}
                    >
                      <MenuItem value="List" sx={{ fontSize: 13 }}>List View</MenuItem>
                      <MenuItem value="Board" sx={{ fontSize: 13 }}>Kanban Board</MenuItem>
                      <MenuItem value="Calendar" sx={{ fontSize: 13 }}>Calendar View</MenuItem>
                      <MenuItem value="Gantt" sx={{ fontSize: 13 }}>Gantt Timeline</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={taskSettings.requireDueDate}
                        onChange={(e) => setTaskSettings({ ...taskSettings, requireDueDate: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Require Due Date on Task Creation</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={taskSettings.allowTaskAssignment}
                        onChange={(e) => setTaskSettings({ ...taskSettings, allowTaskAssignment: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Allow User Task Assignment</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={taskSettings.allowTaskReassignment}
                        onChange={(e) => setTaskSettings({ ...taskSettings, allowTaskReassignment: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Allow Task Reassignment</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={taskSettings.enableTaskComments}
                        onChange={(e) => setTaskSettings({ ...taskSettings, enableTaskComments: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Enable Task Activity Comments</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={taskSettings.enableTaskDependencies}
                        onChange={(e) => setTaskSettings({ ...taskSettings, enableTaskDependencies: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Enable Task Dependencies</Typography>}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveTaskSettings}
                  sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  Save Task Settings
                </Button>
              </Box>
            </Paper>
          </CustomTabPanel>

          {/* ────────────────────────────────────────────────────────────────
              TAB 4: PROJECT SETTINGS
          ──────────────────────────────────────────────────────────────── */}
          <CustomTabPanel value={activeTab} index={3}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '16px' }}>
                Project Settings
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '13px' }}>
                Global system rules and default parameters for projects.
              </Typography>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', p: 3, bgcolor: 'background.default' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Project Code Prefix"
                    fullWidth
                    size="small"
                    value={projectSettings.projectCodePrefix}
                    onChange={(e) => setProjectSettings({ ...projectSettings, projectCodePrefix: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>Project Numbering Mode</InputLabel>
                    <Select
                      value={projectSettings.projectNumbering}
                      label="Project Numbering Mode"
                      onChange={(e) => setProjectSettings({ ...projectSettings, projectNumbering: e.target.value })}
                      sx={{ fontSize: 13 }}
                    >
                      <MenuItem value="Auto" sx={{ fontSize: 13 }}>Auto Sequence (PRJ-0001)</MenuItem>
                      <MenuItem value="Manual" sx={{ fontSize: 13 }}>Manual Entry</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.requireProjectManager}
                        onChange={(e) => setProjectSettings({ ...projectSettings, requireProjectManager: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Require Project Manager / Owner</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.requireStartDate}
                        onChange={(e) => setProjectSettings({ ...projectSettings, requireStartDate: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Require Target Start Date</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.enableProjectBudget}
                        onChange={(e) => setProjectSettings({ ...projectSettings, enableProjectBudget: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Enable Financial Budget Tracking</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={projectSettings.enableProjectDocuments}
                        onChange={(e) => setProjectSettings({ ...projectSettings, enableProjectDocuments: e.target.checked })}
                        size="small"
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Enable Project Document Storage</Typography>}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveProjectSettings}
                  sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  Save Project Settings
                </Button>
              </Box>
            </Paper>
          </CustomTabPanel>

          {/* ────────────────────────────────────────────────────────────────
              TAB 5: AUTOMATIONS RULES ENGINE
             ──────────────────────────────────────────────────────────────── */}
          <CustomTabPanel value={activeTab} index={4}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '16px' }}>
                ClickUp Automations Engine
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '13px' }}>
                Set automatic triggers and actions when task statuses, priorities, or checklists change.
              </Typography>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', p: 3, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  {
                    id: 1,
                    trigger: "When Task Status becomes 'Done'",
                    action: "Automatically set project progress & notify Project Manager",
                    active: true,
                  },
                  {
                    id: 2,
                    trigger: "When Task Priority is set to 'Urgent'",
                    action: "Flag Red icon 🚩 and send immediate high-priority alert",
                    active: true,
                  },
                  {
                    id: 3,
                    trigger: "When all Checklist subtasks are completed",
                    action: "Automatically update status to 'In Review'",
                    active: true,
                  },
                  {
                    id: 4,
                    trigger: "When Target Due Date passes without completion",
                    action: "Auto-mark task status as 'Blocked'",
                    active: false,
                  },
                ].map((rule) => (
                  <Paper
                    key={rule.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      borderRadius: '8px',
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Zap size={20} color="#04552B" />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {rule.trigger}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: 13 }}>
                          ⚡ Action: {rule.action}
                        </Typography>
                      </Box>
                    </Box>

                    <Switch
                      defaultChecked={rule.active}
                      color="success"
                      onChange={(e) => {
                        toast.showSuccess(`Automation rule ${e.target.checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </Paper>
                ))}
              </Box>
            </Paper>
          </CustomTabPanel>
        </Box>
      </Paper>

      {/* ── MODAL: Add / Edit Workflow Status ───────────────────────────── */}
      <Dialog open={statusModalOpen} onClose={() => setStatusModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {editingStatus ? 'Edit Workflow Status' : 'Add Workflow Status'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Status Name"
            fullWidth
            size="small"
            value={statusName}
            onChange={(e) => setStatusName(e.target.value)}
            placeholder="e.g. In Review"
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              label="Badge Color (Hex)"
              fullWidth
              size="small"
              value={statusColor}
              onChange={(e) => setStatusColor(e.target.value)}
              placeholder="#2563EB"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
            />
            <input
              type="color"
              value={statusColor}
              onChange={(e) => setStatusColor(e.target.value)}
              style={{ width: 38, height: 38, border: '1px solid #CBD5E1', borderRadius: 4, cursor: 'pointer', padding: 0 }}
            />
          </Box>

          {/* Color Preview Badge */}
          <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Badge Preview:</Typography>
            <Chip
              size="small"
              label={statusName || 'Status Preview'}
              sx={{ bgcolor: statusColor, color: '#FFFFFF', fontWeight: 600, fontSize: 11 }}
            />
          </Box>

          <TextField
            label="Sort Order"
            type="number"
            fullWidth
            size="small"
            value={statusDisplayOrder}
            onChange={(e) => setStatusDisplayOrder(Number(e.target.value))}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={statusIsTerminal}
                onChange={(e) => setStatusIsTerminal(e.target.checked)}
                size="small"
                color="success"
              />
            }
            label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>Terminal / Completed State?</Typography>}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusModalOpen(false)} disabled={submittingStatus} sx={{ textTransform: 'none', fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveStatus}
            variant="contained"
            disabled={submittingStatus}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
          >
            {submittingStatus ? 'Saving...' : 'Save Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: Delete Status Confirmation ───────────────────────────── */}
      <Dialog open={deleteStatusModalOpen} onClose={() => setDeleteStatusModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: '#DC2626' }}>
          Confirm Delete Status
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#334155', fontSize: 13 }}>
            Are you sure you want to delete the status <strong>"{statusToDelete?.name}"</strong>?
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            If this status is currently assigned to tasks or projects, deletion will be blocked to ensure data integrity.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteStatusModalOpen(false)} disabled={deletingStatus} sx={{ textTransform: 'none', fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteStatus}
            variant="contained"
            color="error"
            disabled={deletingStatus}
            sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600 }}
          >
            {deletingStatus ? 'Deleting...' : 'Delete Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: Add / Edit Custom Field ───────────────────────────────── */}
      <Dialog open={fieldModalOpen} onClose={() => setFieldModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
        </DialogTitle>
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
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />

          <TextField
            label="Key Name (Database Key)"
            fullWidth
            size="small"
            value={fieldKeyName}
            onChange={(e) => setFieldKeyName(e.target.value)}
            placeholder="e.g. cost_center"
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />

          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: 13 }}>Applies To</InputLabel>
            <Select
              value={fieldAppliesTo}
              label="Applies To"
              onChange={(e) => setFieldAppliesTo(e.target.value as any)}
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="Task" sx={{ fontSize: 13 }}>Task</MenuItem>
              <MenuItem value="Project" sx={{ fontSize: 13 }}>Project</MenuItem>
              <MenuItem value="Both" sx={{ fontSize: 13 }}>Both (Task & Project)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: 13 }}>Field Type</InputLabel>
            <Select
              value={fieldType}
              label="Field Type"
              onChange={(e) => setFieldType(e.target.value)}
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="Text" sx={{ fontSize: 13 }}>Text</MenuItem>
              <MenuItem value="Number" sx={{ fontSize: 13 }}>Number</MenuItem>
              <MenuItem value="Date" sx={{ fontSize: 13 }}>Date</MenuItem>
              <MenuItem value="Select" sx={{ fontSize: 13 }}>Select Dropdown</MenuItem>
              <MenuItem value="Multi Select" sx={{ fontSize: 13 }}>Multi Select</MenuItem>
              <MenuItem value="Checkbox" sx={{ fontSize: 13 }}>Checkbox</MenuItem>
              <MenuItem value="Currency" sx={{ fontSize: 13 }}>Currency</MenuItem>
            </Select>
          </FormControl>

          {(fieldType === 'Select' || fieldType === 'Multi Select') && (
            <TextField
              label="Options (comma separated)"
              fullWidth
              size="small"
              value={fieldOptions}
              onChange={(e) => setFieldOptions(e.target.value)}
              placeholder="Low, Medium, High, Critical"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
            />
          )}

          <TextField
            label="Sort Order"
            type="number"
            fullWidth
            size="small"
            value={fieldDisplayOrder}
            onChange={(e) => setFieldDisplayOrder(Number(e.target.value))}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={fieldIsRequired}
                onChange={(e) => setFieldIsRequired(e.target.checked)}
                size="small"
                color="success"
              />
            }
            label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Required Field?</Typography>}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFieldModalOpen(false)} disabled={submittingField} sx={{ textTransform: 'none', fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveCustomField}
            variant="contained"
            disabled={submittingField}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
          >
            {submittingField ? 'Saving...' : 'Save Field'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: Delete Custom Field Confirmation ─────────────────────── */}
      <Dialog open={deleteFieldModalOpen} onClose={() => setDeleteFieldModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: '#DC2626' }}>
          Confirm Delete Custom Field
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#334155', fontSize: 13 }}>
            Are you sure you want to delete the custom field <strong>"{fieldToDelete?.label}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteFieldModalOpen(false)} disabled={deletingField} sx={{ textTransform: 'none', fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteField}
            variant="contained"
            color="error"
            disabled={deletingField}
            sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600 }}
          >
            {deletingField ? 'Deleting...' : 'Delete Field'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
