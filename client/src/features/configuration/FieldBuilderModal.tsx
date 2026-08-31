import { useState, useEffect } from 'react';
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
  FormLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  FileText,
  Hash,
  Calendar,
  CheckSquare,
  ToggleLeft,
  List,
  Upload,
  Eye,
  Settings2,
  Layers,
} from 'lucide-react';

import {
  useTabFieldsQuery,
  useCreateTabFieldMutation,
  useUpdateTabFieldMutation,
  useDeleteTabFieldMutation,
  useReorderTabFieldsMutation,
  useStagesQuery,
} from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import type { CrmTabFieldConfig, CrmTabFieldOption } from '@/types';

const FIELD_TYPES = [
  { key: 'text', label: 'Single-line Text', icon: FileText, desc: 'Text input with optional character limit' },
  { key: 'numeric', label: 'Numeric Number', icon: Hash, desc: 'Integer or decimal numbers with min/max' },
  { key: 'date', label: 'Date Picker', icon: Calendar, desc: 'Date picker with configurable format' },
  { key: 'boolean', label: 'Yes / No Choice', icon: CheckSquare, desc: 'Boolean Yes/No choice buttons' },
  { key: 'toggle', label: 'ON / OFF Toggle', icon: ToggleLeft, desc: 'Toggle switch with default state' },
  { key: 'dropdown', label: 'Dropdown Select', icon: List, desc: 'Select single option from configurable list' },
  { key: 'file', label: 'File / Binary Upload', icon: Upload, desc: 'File upload with preview, size display & download' },
];

const ROLES = [
  { key: 'ADMIN', label: 'Admin' },
  { key: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  { key: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { key: 'DELIVERY_TEAM', label: 'Delivery Team' },
];

interface Props {
  open: boolean;
  tabId: number;
  tabName: string;
  onClose: () => void;
}

export default function FieldBuilderModal({ open, tabId, tabName, onClose }: Props) {
  const { showToast } = useToast();
  const { data: fields = [], isLoading } = useTabFieldsQuery(tabId, { skip: !open || !tabId });
  const { data: stages = [] } = useStagesQuery();

  const [createField] = useCreateTabFieldMutation();
  const [updateField] = useUpdateTabFieldMutation();
  const [deleteField] = useDeleteTabFieldMutation();
  const [reorderFields] = useReorderTabFieldsMutation();

  const [editingField, setEditingField] = useState<CrmTabFieldConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isReadonly, setIsReadonly] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [defaultValue, setDefaultValue] = useState('');

  // Dropdown Options
  const [options, setOptions] = useState<CrmTabFieldOption[]>([
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
  ]);
  const [newOptLabel, setNewOptLabel] = useState('');

  // File Options
  const [allowedExtensions, setAllowedExtensions] = useState('.pdf,.png,.jpg,.jpeg');
  const [maxSizeMb, setMaxSizeMb] = useState(10);

  // Role Permissions
  const [rolePermissions, setRolePermissions] = useState<Record<string, { view?: boolean; edit?: boolean; required?: boolean; readonly?: boolean }>>({
    ADMIN: { view: true, edit: true },
    SALES_EXECUTIVE: { view: true, edit: true },
    FINANCE_OFFICER: { view: true, edit: true },
    DELIVERY_TEAM: { view: true, edit: true },
  });

  // Stage Rules
  const [stageRules, setStageRules] = useState<Record<string, { visible?: boolean; required?: boolean; readonly?: boolean }>>({});

  useEffect(() => {
    if (editingField) {
      setName(editingField.name);
      setLabel(editingField.label);
      setFieldType(editingField.field_type);
      setIsRequired(editingField.is_required);
      setIsVisible(editingField.is_visible);
      setIsReadonly(editingField.is_readonly);
      setPlaceholder(editingField.placeholder || '');
      setHelpText(editingField.help_text || '');
      setDefaultValue(editingField.default_value || '');
      setOptions(editingField.options || []);
      setAllowedExtensions(editingField.file_config?.allowed_extensions?.join(',') || '.pdf,.png,.jpg');
      setMaxSizeMb(editingField.file_config?.max_size_mb || 10);
      setRolePermissions((editingField.field_permissions as any) || {
        ADMIN: { view: true, edit: true },
        SALES_EXECUTIVE: { view: true, edit: true },
        FINANCE_OFFICER: { view: true, edit: true },
        DELIVERY_TEAM: { view: true, edit: true },
      });
      setStageRules((editingField.stage_rules as any) || {});
    } else {
      resetForm();
    }
  }, [editingField]);

  const resetForm = () => {
    setName('');
    setLabel('');
    setFieldType('text');
    setIsRequired(false);
    setIsVisible(true);
    setIsReadonly(false);
    setPlaceholder('');
    setHelpText('');
    setDefaultValue('');
    setOptions([
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
    ]);
    setAllowedExtensions('.pdf,.png,.jpg');
    setMaxSizeMb(10);
    setRolePermissions({
      ADMIN: { view: true, edit: true },
      SALES_EXECUTIVE: { view: true, edit: true },
      FINANCE_OFFICER: { view: true, edit: true },
      DELIVERY_TEAM: { view: true, edit: true },
    });
    setStageRules({});
  };

  const handleOpenAdd = () => {
    setEditingField(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (f: CrmTabFieldConfig) => {
    setEditingField(f);
    setIsFormOpen(true);
  };

  const handleSaveField = async () => {
    if (!label.trim()) {
      showToast('Field Label is required', 'error');
      return;
    }

    const fieldName = name.trim() || label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');

    const payload = {
      name: fieldName,
      label,
      field_type: fieldType,
      is_required: isRequired,
      is_visible: isVisible,
      is_readonly: isReadonly,
      is_searchable: true,
      is_filterable: true,
      is_sortable: true,
      display_order: editingField ? editingField.display_order : fields.length,
      placeholder: placeholder || undefined,
      help_text: helpText || undefined,
      default_value: defaultValue || undefined,
      options: fieldType === 'dropdown' ? options : undefined,
      file_config: fieldType === 'file' ? {
        allowed_extensions: allowedExtensions.split(',').map((s) => s.trim()),
        max_size_mb: Number(maxSizeMb),
      } : undefined,
      field_permissions: rolePermissions,
      stage_rules: stageRules,
    };

    try {
      if (editingField) {
        await updateField({ tabId, fieldId: editingField.id, body: payload }).unwrap();
        showToast(`Field '${label}' updated successfully`, 'success');
      } else {
        await createField({ tabId, body: payload }).unwrap();
        showToast(`Field '${label}' created successfully`, 'success');
      }
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to save field', 'error');
    }
  };

  const handleDelete = async (fieldId: number, fieldLabel: string) => {
    if (window.confirm(`Are you sure you want to archive field '${fieldLabel}'? Existing data will be preserved safely.`)) {
      try {
        await deleteField({ tabId, fieldId }).unwrap();
        showToast(`Field '${fieldLabel}' archived`, 'success');
      } catch (err: any) {
        showToast('Failed to archive field', 'error');
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIdx, 0, moved);

    const reorderedIds = newFields.map((f) => f.id);
    try {
      await reorderFields({ tabId, fieldIds: reorderedIds }).unwrap();
    } catch (err) {
      showToast('Failed to reorder fields', 'error');
    }
  };

  const addOption = () => {
    if (!newOptLabel.trim()) return;
    const val = newOptLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    setOptions((prev) => [...prev, { label: newOptLabel.trim(), value: val }]);
    setNewOptLabel('');
  };

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 800, color: '#023020', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Settings2 size={22} color="#087A3D" />
          <span>Dynamic Field Builder: {tabName}</span>
        </Box>
        {!isFormOpen && (
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenAdd}>
            Add Custom Field
          </Button>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 480 }}>
        {!isFormOpen ? (
          <div>
            {isLoading ? (
              <Typography sx={{ p: 4, textAlign: 'center', color: '#7A8B80' }}>Loading fields...</Typography>
            ) : fields.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', background: '#F8FAF8', border: '1px dashed #C9E0C6', borderRadius: 3 }}>
                <Layers size={36} color="#087A3D" style={{ margin: '0 auto 12px' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#16231B' }}>No Custom Fields Configured</Typography>
                <Typography variant="body2" sx={{ color: '#7A8B80', mt: 0.5, mb: 2 }}>
                  Click "Add Custom Field" to create dynamic form controls, dropdowns, and file upload fields for this tab.
                </Typography>
                <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenAdd}>
                  Add Custom Field
                </Button>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {fields.map((f, idx) => {
                  const IconComp = FIELD_TYPES.find((t) => t.key === f.field_type)?.icon || FileText;
                  return (
                    <Paper
                      key={f.id}
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        border: '1px solid #E4EBE1',
                        borderRadius: '10px',
                        '&:hover': { borderColor: '#087A3D', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1.2, background: '#EAF6E8', borderRadius: 2, color: '#087A3D', display: 'flex' }}>
                          <IconComp size={20} />
                        </Box>
                        <div>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#16231B' }}>{f.label}</span>
                            <Chip label={f.field_type.toUpperCase()} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
                            {f.is_required && <Chip label="Required" color="error" size="small" sx={{ height: 18, fontSize: 9.5 }} />}
                          </Box>
                          <span style={{ fontSize: 12, color: '#7A8B80' }}>Key: <code>{f.name}</code></span>
                        </div>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" disabled={idx === 0} onClick={() => handleMove(idx, 'up')}>
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton size="small" disabled={idx === fields.length - 1} onClick={() => handleMove(idx, 'down')}>
                          <ArrowDown size={16} />
                        </IconButton>
                        <IconButton size="small" color="primary" onClick={() => handleEdit(f)}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(f.id, f.label)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </div>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 3 }}>
            <Box>
              <Box sx={{ borderBottom: 1, borderColor: '#E4EBE1', mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                  <Tab label="1. Basic & Type" />
                  <Tab label="2. Dropdown / File Config" />
                  <Tab label="3. Permissions (RBAC)" />
                  <Tab label="4. Stage Rules" />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Field Label *"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      if (!editingField) {
                        setName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, ''));
                      }
                    }}
                    required
                    fullWidth
                    placeholder="e.g. CIBIL Score or Aadhaar Card"
                  />
                  <TextField
                    label="Field Key / Identifier *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    placeholder="e.g. cibil_score"
                    helperText="Unique database key for this custom field"
                  />
                  <FormControl fullWidth>
                    <FormLabel sx={{ fontWeight: 700, mb: 1, color: '#16231B' }}>Select Field Type</FormLabel>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      {FIELD_TYPES.map((t) => {
                        const IconC = t.icon;
                        const isSel = fieldType === t.key;
                        return (
                          <Paper
                            key={t.key}
                            onClick={() => setFieldType(t.key)}
                            sx={{
                              p: 1.5,
                              cursor: 'pointer',
                              border: isSel ? '2px solid #087A3D' : '1px solid #E4EBE1',
                              background: isSel ? '#F4F9F2' : '#FFFFFF',
                              borderRadius: 2,
                              display: 'flex',
                              gap: 1.2,
                              alignItems: 'flex-start',
                            }}
                          >
                            <IconC size={20} color={isSel ? '#087A3D' : '#7A8B80'} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#16231B' }}>{t.label}</div>
                              <div style={{ fontSize: 11, color: '#7A8B80' }}>{t.desc}</div>
                            </div>
                          </Paper>
                        );
                      })}
                    </Box>
                  </FormControl>

                  <div style={{ display: 'flex', gap: 16 }}>
                    <FormControlLabel control={<Switch checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />} label="Required" />
                    <FormControlLabel control={<Switch checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />} label="Visible" />
                    <FormControlLabel control={<Switch checked={isReadonly} onChange={(e) => setIsReadonly(e.target.checked)} />} label="Read Only" />
                  </div>

                  <TextField label="Placeholder" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} fullWidth />
                  <TextField label="Help Text / Description" value={helpText} onChange={(e) => setHelpText(e.target.value)} fullWidth multiline rows={2} />
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  {fieldType === 'dropdown' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormLabel sx={{ fontWeight: 700, color: '#16231B' }}>Configure Dropdown Select Options</FormLabel>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField size="small" label="Add Option Label" value={newOptLabel} onChange={(e) => setNewOptLabel(e.target.value)} fullWidth />
                        <Button variant="contained" startIcon={<Plus size={16} />} onClick={addOption}>
                          Add
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        {options.map((opt, i) => (
                          <Paper key={i} sx={{ p: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E4EBE1' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label} (<code>{opt.value}</code>)</span>
                            <IconButton size="small" color="error" onClick={() => removeOption(i)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  ) : fieldType === 'file' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormLabel sx={{ fontWeight: 700, color: '#16231B' }}>Configure File Upload Settings</FormLabel>
                      <TextField
                        label="Allowed File Extensions"
                        value={allowedExtensions}
                        onChange={(e) => setAllowedExtensions(e.target.value)}
                        fullWidth
                        helperText="Comma separated list e.g. .pdf,.png,.jpg,.jpeg,.doc"
                      />
                      <TextField
                        label="Maximum File Size (MB)"
                        type="number"
                        value={maxSizeMb}
                        onChange={(e) => setMaxSizeMb(Number(e.target.value))}
                        fullWidth
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#7A8B80', p: 3, textAlign: 'center' }}>
                      No special option configuration required for <b>{fieldType.toUpperCase()}</b> fields.
                    </Typography>
                  )}
                </Box>
              )}

              {activeTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormLabel sx={{ fontWeight: 700, color: '#16231B' }}>Role-Based Access Control (RBAC)</FormLabel>
                  {ROLES.map((r) => {
                    const perm = rolePermissions[r.key] || { view: true, edit: true };
                    return (
                      <Paper key={r.key} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E4EBE1' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={perm.view}
                                onChange={(e) => setRolePermissions({ ...rolePermissions, [r.key]: { ...perm, view: e.target.checked } })}
                              />
                            }
                            label="Can View"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={perm.edit}
                                onChange={(e) => setRolePermissions({ ...rolePermissions, [r.key]: { ...perm, edit: e.target.checked } })}
                              />
                            }
                            label="Can Edit"
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}

              {activeTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormLabel sx={{ fontWeight: 700, color: '#16231B' }}>Stage-Based Dynamic Field Rules</FormLabel>
                  <Typography variant="caption" sx={{ color: '#7A8B80' }}>
                    Configure whether this field is required or hidden during specific pipeline stages.
                  </Typography>
                  {stages.map((st) => {
                    const rule = stageRules[st.key] || { visible: true, required: isRequired, readonly: isReadonly };
                    return (
                      <Paper key={st.id} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E4EBE1' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#16231B' }}>{st.label}</div>
                          <div style={{ fontSize: 11, color: '#7A8B80' }}>Key: {st.key}</div>
                        </div>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={rule.visible}
                                onChange={(e) => setStageRules({ ...stageRules, [st.key]: { ...rule, visible: e.target.checked } })}
                              />
                            }
                            label="Visible"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={rule.required}
                                onChange={(e) => setStageRules({ ...stageRules, [st.key]: { ...rule, required: e.target.checked } })}
                              />
                            }
                            label="Required"
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Live Interactive Preview Pane */}
            <Paper sx={{ p: 2.5, background: '#F8FAF8', border: '1px dashed #C9E0C6', borderRadius: '12px', height: 'fit-content' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#04552B', fontWeight: 800 }}>
                <Eye size={18} /> Live Preview
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <FormLabel sx={{ fontWeight: 700, fontSize: 13, color: '#16231B' }}>
                  {label || 'Field Label'} {isRequired && <span style={{ color: 'red' }}>*</span>}
                </FormLabel>

                {fieldType === 'text' && <TextField size="small" placeholder={placeholder || 'Enter text...'} disabled={isReadonly} fullWidth />}
                {fieldType === 'numeric' && <TextField size="small" type="number" placeholder={placeholder || '0'} disabled={isReadonly} fullWidth />}
                {fieldType === 'date' && <TextField size="small" type="date" disabled={isReadonly} fullWidth />}
                {fieldType === 'boolean' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small" color="primary">Yes</Button>
                    <Button variant="outlined" size="small" color="inherit">No</Button>
                  </Box>
                )}
                {fieldType === 'toggle' && <Switch defaultChecked disabled={isReadonly} />}
                {fieldType === 'dropdown' && (
                  <Select size="small" fullWidth defaultValue="">
                    {options.map((o, idx) => (
                      <MenuItem key={idx} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                )}
                {fieldType === 'file' && (
                  <Box sx={{ p: 2, border: '1px dashed #087A3D', borderRadius: 2, background: '#FFFFFF', textAlign: 'center' }}>
                    <Upload size={20} color="#087A3D" style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#16231B' }}>Upload {label || 'File'}</div>
                    <div style={{ fontSize: 10, color: '#7A8B80' }}>Allowed: {allowedExtensions} (Max {maxSizeMb}MB)</div>
                  </Box>
                )}

                {helpText && <Typography variant="caption" sx={{ color: '#7A8B80' }}>{helpText}</Typography>}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        {isFormOpen ? (
          <>
            <Button variant="outlined" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveField}>
              Save Custom Field
            </Button>
          </>
        ) : (
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
