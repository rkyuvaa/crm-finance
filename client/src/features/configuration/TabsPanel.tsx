import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { Pencil, Plus, Settings2, Trash2 } from 'lucide-react';

import {
  useCreateTabMutation,
  useDeleteTabMutation,
  useStagesQuery,
  useTabsQuery,
  useUpdateTabMutation,
} from '@/api/mastersApi';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import type { CrmTabConfig, StageConfig } from '@/types';
import FieldBuilderModal from './FieldBuilderModal';

const ROLES = [
  { key: 'ADMIN', label: 'Admin' },
  { key: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  { key: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { key: 'DELIVERY_TEAM', label: 'Delivery Team' },
];

export default function TabsPanel() {
  const { data: tabs, isFetching, isError, refetch } = useTabsQuery();
  const { data: stages } = useStagesQuery();
  const [deleteTab] = useDeleteTabMutation();
  const [updateTab] = useUpdateTabMutation();
  const { showToast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<CrmTabConfig | null>(null);
  const [fieldBuilderTab, setFieldBuilderTab] = useState<CrmTabConfig | null>(null);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete tab "${name}"?`)) return;
    try {
      await deleteTab(id).unwrap();
      showToast('Tab deleted successfully', 'success');
    } catch (err) {
      showToast('Could not delete tab', 'error');
    }
  };

  const handleToggleActive = async (tab: CrmTabConfig) => {
    try {
      await updateTab({ id: tab.id, body: { is_active: !tab.is_active } }).unwrap();
      showToast(`Tab ${!tab.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      showToast('Could not update status', 'error');
    }
  };

  const handleSetDefault = async (tab: CrmTabConfig) => {
    try {
      await updateTab({ id: tab.id, body: { is_default: true } }).unwrap();
      showToast(`"${tab.name}" set as default tab`, 'success');
    } catch {
      showToast('Could not set default tab', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#16231B' }}>CRM Dynamic Tabs</div>
          <div style={{ fontSize: 13, color: '#7A8B80' }}>
            Configure dynamic tabs, stage mappings, custom filter rules, and role visibility.
          </div>
        </div>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => {
            setEditingTab(null);
            setDialogOpen(true);
          }}
        >
          Create Tab Wizard
        </Button>
      </div>

      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAF8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tab Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Code / Key</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Associated Stages</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Visibility</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Records</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Default</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isFetching && !tabs ? (
                <LoadingRows rows={5} />
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <Button variant="outlined" onClick={refetch}>
                      Retry loading tabs
                    </Button>
                  </TableCell>
                </TableRow>
              ) : tabs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState title="No dynamic tabs found" hint="Click 'Create Tab Wizard' to add one." />
                  </TableCell>
                </TableRow>
              ) : (
                tabs?.map((tab) => (
                  <TableRow key={tab.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: '#7A8B80' }}>#{tab.display_order}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#16231B' }}>{tab.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#023020' }}>
                      {tab.code}
                    </TableCell>
                    <TableCell>
                      {tab.stage_names && tab.stage_names.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {tab.stage_names.map((st) => (
                            <Chip key={st} label={st} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                          ))}
                        </Box>
                      ) : (
                        <Chip label="All Stages" size="small" color="primary" sx={{ fontSize: 11 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tab.visibility_type === 'ROLES' ? tab.allowed_roles : 'Everyone'}
                        size="small"
                        color={tab.visibility_type === 'ROLES' ? 'secondary' : 'default'}
                        sx={{ fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${tab.count} leads`} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant={tab.is_default ? 'contained' : 'text'}
                        color={tab.is_default ? 'success' : 'inherit'}
                        onClick={() => !tab.is_default && handleSetDefault(tab)}
                        sx={{ fontSize: 11, textTransform: 'none', borderRadius: 2 }}
                      >
                        {tab.is_default ? '✓ Default' : 'Make Default'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Switch checked={tab.is_active} onChange={() => handleToggleActive(tab)} color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Settings2 size={14} />}
                        onClick={() => setFieldBuilderTab(tab)}
                        sx={{ mr: 1, fontSize: 11, textTransform: 'none', borderRadius: 1.5 }}
                      >
                        Configure Fields
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTab(tab);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(tab.id, tab.name)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {fieldBuilderTab && (
        <FieldBuilderModal
          open={Boolean(fieldBuilderTab)}
          tabId={fieldBuilderTab.id}
          tabName={fieldBuilderTab.name}
          onClose={() => setFieldBuilderTab(null)}
        />
      )}

      {dialogOpen && (
        <CreateTabWizardDialog
          open={dialogOpen}
          editing={editingTab}
          stages={stages ?? []}
          onClose={() => {
            setDialogOpen(false);
            setEditingTab(null);
          }}
        />
      )}
    </div>
  );
}

function CreateTabWizardDialog({
  open,
  editing,
  stages,
  onClose,
}: {
  open: boolean;
  editing: CrmTabConfig | null;
  stages: StageConfig[];
  onClose: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [createTab, { isLoading: creating }] = useCreateTabMutation();
  const [updateTab, { isLoading: updating }] = useUpdateTabMutation();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedStageIds, setSelectedStageIds] = useState<number[]>([]);
  const [visibilityType, setVisibilityType] = useState<'EVERYONE' | 'ROLES'>('EVERYONE');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setCode(editing.code);
      setDescription(editing.description ?? '');
      setDisplayOrder(editing.display_order);
      setIsDefault(editing.is_default);
      setIsActive(editing.is_active);
      setSelectedStageIds(editing.stage_ids ?? []);
      setVisibilityType(editing.visibility_type === 'ROLES' ? 'ROLES' : 'EVERYONE');
      setSelectedRoles(editing.allowed_roles ? editing.allowed_roles.split(',') : []);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setDisplayOrder(0);
      setIsDefault(false);
      setIsActive(true);
      setSelectedStageIds([]);
      setVisibilityType('EVERYONE');
      setSelectedRoles([]);
    }
    setActiveStep(0);
  }, [open, editing]);

  const steps = ['Basic Info', 'Stage Mapping', 'Visibility & Roles', 'Review & Save'];

  const handleNext = () => {
    if (activeStep === 0) {
      if (!name.trim()) {
        showToast('Tab Name is required', 'error');
        return;
      }
      if (!code.trim()) {
        showToast('Tab Code is required', 'error');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSave = async () => {
    const payload = {
      name,
      code: code.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      description,
      display_order: Number(displayOrder),
      is_active: isActive,
      is_default: isDefault,
      visibility_type: visibilityType,
      allowed_roles: visibilityType === 'ROLES' ? selectedRoles.join(',') : '',
      stage_ids: selectedStageIds,
    };

    try {
      if (editing) {
        await updateTab({ id: editing.id, body: payload }).unwrap();
        showToast('Tab updated successfully', 'success');
      } else {
        await createTab(payload).unwrap();
        showToast('Tab created successfully', 'success');
      }
      onClose();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Failed to save tab configuration', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editing ? `Edit Tab: ${editing.name}` : 'Create Dynamic Tab Wizard'}
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Tab Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editing) {
                  setCode(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, ''));
                }
              }}
              required
              fullWidth
              placeholder="e.g. Qualified Leads"
            />
            <TextField
              label="Tab Code / Identifier"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              fullWidth
              placeholder="e.g. qualified_leads"
              helperText="Unique identifier used in query params and backend filters"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Describe which leads this tab displays"
            />
            <TextField
              label="Display Order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              fullWidth
            />
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormLabel sx={{ fontWeight: 700, color: '#16231B' }}>
              Select Pipeline Stages for this Tab
            </FormLabel>
            <div style={{ fontSize: 13, color: '#7A8B80' }}>
              Leads in any of the selected stages will appear under this tab. If no stages are selected, the tab will display <b>all leads</b>.
            </div>
            <FormGroup>
              {stages.map((st) => {
                const checked = selectedStageIds.includes(st.id);
                return (
                  <FormControlLabel
                    key={st.id}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStageIds((prev) => [...prev, st.id]);
                          } else {
                            setSelectedStageIds((prev) => prev.filter((id) => id !== st.id));
                          }
                        }}
                      />
                    }
                    label={`${st.label} (${st.key})`}
                  />
                );
              })}
            </FormGroup>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Visibility Access Level</InputLabel>
              <Select
                value={visibilityType}
                label="Visibility Access Level"
                onChange={(e) => setVisibilityType(e.target.value as 'EVERYONE' | 'ROLES')}
              >
                <MenuItem value="EVERYONE">Everyone (All Authorized Users)</MenuItem>
                <MenuItem value="ROLES">Restricted by User Role</MenuItem>
              </Select>
            </FormControl>

            {visibilityType === 'ROLES' && (
              <Box>
                <FormLabel sx={{ fontWeight: 700, mt: 1, display: 'block' }}>
                  Select Authorized Roles
                </FormLabel>
                <FormGroup>
                  {ROLES.map((r) => {
                    const checked = selectedRoles.includes(r.key);
                    return (
                      <FormControlLabel
                        key={r.key}
                        control={
                          <Checkbox
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoles((prev) => [...prev, r.key]);
                              } else {
                                setSelectedRoles((prev) => prev.filter((k) => k !== r.key));
                              }
                            }}
                          />
                        }
                        label={r.label}
                      />
                    );
                  })}
                </FormGroup>
              </Box>
            )}

            <FormControlLabel
              control={<Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
              label="Set as System Default Tab"
            />
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Tab Active"
            />
          </Box>
        )}

        {activeStep === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#023020' }}>Configuration Summary</div>
            <Paper sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: 2 }}>
              <div><b>Name:</b> {name}</div>
              <div><b>Code:</b> {code}</div>
              <div><b>Description:</b> {description || 'None'}</div>
              <div><b>Order:</b> #{displayOrder}</div>
              <div>
                <b>Mapped Stages:</b>{' '}
                {selectedStageIds.length === 0
                  ? 'All Stages'
                  : stages
                      .filter((s) => selectedStageIds.includes(s.id))
                      .map((s) => s.label)
                      .join(', ')}
              </div>
              <div>
                <b>Visibility:</b>{' '}
                {visibilityType === 'EVERYONE' ? 'Everyone' : `Roles: ${selectedRoles.join(', ')}`}
              </div>
              <div><b>Is Default Tab:</b> {isDefault ? 'Yes' : 'No'}</div>
              <div><b>Status:</b> {isActive ? 'Active' : 'Inactive'}</div>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} variant="outlined">
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button onClick={handleSave} variant="contained" disabled={creating || updating}>
            {editing ? 'Save Changes' : 'Create Tab'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
