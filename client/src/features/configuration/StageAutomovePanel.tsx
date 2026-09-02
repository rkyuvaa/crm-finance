import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAppSelector } from '@/app/hooks';
import {
  useAutomoveRulesQuery,
  useCreateAutomoveRuleMutation,
  useDeleteAutomoveRuleMutation,
  useStagesByModuleQuery,
  useUpdateAutomoveRuleMutation,
} from '@/api/mastersApi';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import type { StageAutomoveRule } from '@/types';

type RuleModule = 'LEAD' | 'OPPORTUNITY';

const STANDARD_FIELDS = [
  { name: 'customer_phone', label: 'Mobile Number' },
  { name: 'customer_name', label: 'Customer Name' },
  { name: 'vehicle_model_id', label: 'Vehicle Model' },
  { name: 'vehicle_price', label: 'Vehicle Price' },
  { name: 'down_payment', label: 'Down Payment' },
  { name: 'amount', label: 'Loan Amount' },
  { name: 'finance_company_id', label: 'Finance Company' },
];

const formSchema = z.object({
  name: z.string().min(2, 'Rule name is required'),
  module: z.enum(['LEAD', 'OPPORTUNITY']),
  trigger_type: z.enum(['standard_field', 'custom_field', 'document_verification']),
  field_name: z.string().optional(),
  field_id: z.coerce.number().optional(),
  condition_operator: z.enum(['is_filled', 'is_verified', 'equals', 'greater_than']),
  condition_value: z.string().optional(),
  source_stage_key: z.string().optional(),
  target_stage_key: z.string().min(1, 'Target stage is required'),
  is_enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function AutomoveRuleDialog({
  open,
  editing,
  defaultModule,
  onClose,
}: {
  open: boolean;
  editing: StageAutomoveRule | null;
  defaultModule: RuleModule;
  onClose: () => void;
}) {
  const [createRule, { isLoading: creating }] = useCreateAutomoveRuleMutation();
  const [updateRule, { isLoading: updating }] = useUpdateAutomoveRuleMutation();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      module: defaultModule,
      trigger_type: 'standard_field',
      field_name: 'customer_phone',
      field_id: undefined,
      condition_operator: 'is_filled',
      condition_value: '',
      source_stage_key: '',
      target_stage_key: '',
      is_enabled: true,
    },
  });

  const selectedModule = watch('module') as RuleModule;
  const triggerType = watch('trigger_type');

  const { data: stages = [] } = useStagesByModuleQuery(selectedModule);
  const enabledStages = stages.filter((s) => s.enabled);

  useEffect(() => {
    if (!open) return;
    reset({
      name: editing?.name ?? '',
      module: (editing?.module as RuleModule) ?? defaultModule,
      trigger_type: editing?.trigger_type ?? 'standard_field',
      field_name: editing?.field_name ?? 'customer_phone',
      field_id: editing?.field_id ?? undefined,
      condition_operator: editing?.condition_operator ?? 'is_filled',
      condition_value: editing?.condition_value ?? '',
      source_stage_key: editing?.source_stage_key ?? '',
      target_stage_key: editing?.target_stage_key ?? editing?.target_status ?? (enabledStages[0]?.key ?? ''),
      is_enabled: editing?.is_enabled ?? true,
    });
  }, [open, editing, defaultModule, reset]);

  const onSubmit = async (values: FormValues) => {
    const targetStageObj = enabledStages.find((s) => s.key === values.target_stage_key);
    const targetStatus = targetStageObj?.status || values.target_stage_key.toUpperCase();

    const body = {
      name: values.name,
      module: values.module,
      trigger_type: values.trigger_type,
      field_name: values.trigger_type === 'standard_field' ? values.field_name || null : null,
      field_id: values.trigger_type === 'custom_field' ? Number(values.field_id) || null : null,
      condition_operator: values.condition_operator,
      condition_value: values.condition_value || null,
      source_stage_key: values.source_stage_key || null,
      target_status: targetStatus,
      target_stage_key: values.target_stage_key,
      is_enabled: values.is_enabled,
    };

    try {
      if (editing) {
        await updateRule({ id: editing.id, body }).unwrap();
        showToast('Auto-move rule updated', 'success');
      } else {
        await createRule(body).unwrap();
        showToast('Auto-move rule created', 'success');
      }
      reset();
      onClose();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not save auto-move rule', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editing ? 'Edit Auto-Move Rule' : 'Create Stage Auto-Move Rule'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {/* Module Selector */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#44584C', display: 'block', marginBottom: 6 }}>
              Target Pipeline Module
            </span>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={selectedModule}
              onChange={(_, val) => { if (val) setValue('module', val); }}
              disabled={Boolean(editing)}
            >
              <ToggleButton value="LEAD" sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
                Lead Rules
              </ToggleButton>
              <ToggleButton value="OPPORTUNITY" sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
                Opportunity Rules
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          <TextField
            fullWidth
            label="Rule Name *"
            margin="dense"
            placeholder="e.g. Move from New to Contacted when Phone number is filled"
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#44584C', display: 'block', marginBottom: 4 }}>
                Trigger Source Type
              </span>
              <Select
                fullWidth
                size="small"
                value={triggerType}
                onChange={(e) => setValue('trigger_type', e.target.value as any)}
              >
                <MenuItem value="standard_field">Standard Field</MenuItem>
                <MenuItem value="document_verification">Document Verification</MenuItem>
              </Select>
            </div>

            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#44584C', display: 'block', marginBottom: 4 }}>
                Condition Operator
              </span>
              <Select
                fullWidth
                size="small"
                value={watch('condition_operator')}
                onChange={(e) => setValue('condition_operator', e.target.value as any)}
              >
                <MenuItem value="is_filled">Is Provided / Filled</MenuItem>
                <MenuItem value="is_verified">Is Verified (Doc)</MenuItem>
                <MenuItem value="equals">Equals Specific Value</MenuItem>
              </Select>
            </div>
          </div>

          {triggerType === 'standard_field' && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#44584C', display: 'block', marginBottom: 4 }}>
                Trigger Field
              </span>
              <Select
                fullWidth
                size="small"
                value={watch('field_name') || ''}
                onChange={(e) => setValue('field_name', e.target.value)}
              >
                {STANDARD_FIELDS.map((f) => (
                  <MenuItem key={f.name} value={f.name}>
                    {f.label} ({f.name})
                  </MenuItem>
                ))}
              </Select>
            </div>
          )}

          {watch('condition_operator') === 'equals' && (
            <TextField
              fullWidth
              label="Expected Trigger Value"
              margin="dense"
              placeholder="e.g. Yes"
              {...register('condition_value')}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#44584C', display: 'block', marginBottom: 4 }}>
                From Stage (Optional)
              </span>
              <Select
                fullWidth
                size="small"
                value={watch('source_stage_key') || ''}
                onChange={(e) => setValue('source_stage_key', e.target.value)}
              >
                <MenuItem value="">Any Stage</MenuItem>
                {enabledStages.map((s) => (
                  <MenuItem key={s.key} value={s.key}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </div>

            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#44584C', display: 'block', marginBottom: 4 }}>
                Target Auto-Move Stage *
              </span>
              <Select
                fullWidth
                size="small"
                value={watch('target_stage_key') || ''}
                onChange={(e) => setValue('target_stage_key', e.target.value)}
                error={Boolean(errors.target_stage_key)}
              >
                {enabledStages.map((s) => (
                  <MenuItem key={s.key} value={s.key}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={creating || updating}>
            {editing ? 'Save Rule' : 'Create Rule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function StageAutomovePanel() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'ADMIN';

  const [activeModule, setActiveModule] = useState<RuleModule>('LEAD');
  const { data: allRules = [], isFetching, isError, refetch } = useAutomoveRulesQuery();
  const [updateRule] = useUpdateAutomoveRuleMutation();
  const [deleteRule] = useDeleteAutomoveRuleMutation();
  const { showToast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StageAutomoveRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StageAutomoveRule | null>(null);

  const rules = allRules.filter((r) => (r.module || 'LEAD') === activeModule);

  const toggleEnabled = async (rule: StageAutomoveRule, is_enabled: boolean) => {
    try {
      await updateRule({ id: rule.id, body: { is_enabled } }).unwrap();
      showToast(`Rule '${rule.name}' ${is_enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch {
      showToast('Could not update rule status', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRule(deleteTarget.id).unwrap();
      showToast(`Rule '${deleteTarget.name}' deleted`, 'success');
    } catch {
      showToast('Could not delete rule', 'error');
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: '13px 16px',
            borderBottom: '1px solid #E4EBE1',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="#087A3D" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>
                Stage Auto-Move Rules
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#7A8B80', marginTop: 2 }}>
              Configure automatic stage transitions when lead details or documents are completed.
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Add Auto-Move Rule
            </Button>
          )}
        </div>

        {/* Module Tabs */}
        <Box sx={{ borderBottom: '1px solid #E4EBE1', px: 2 }}>
          <Tabs
            value={activeModule}
            onChange={(_, val) => setActiveModule(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minWidth: 120 } }}
          >
            <Tab value="LEAD" label="Lead Auto-Move Rules" />
            <Tab value="OPPORTUNITY" label="Opportunity Auto-Move Rules" />
          </Tabs>
        </Box>

        {/* Rules Table */}
        <div style={{ overflowX: 'auto' }}>
          {isFetching && !allRules ? (
            <LoadingRows rows={4} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading auto-move rules
              </Button>
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              title={`No ${activeModule === 'LEAD' ? 'Lead' : 'Opportunity'} Auto-Move Rules Configured`}
              hint={
                isAdmin
                  ? `Click "Add Auto-Move Rule" to create automated stage workflow triggers for ${activeModule === 'LEAD' ? 'Leads' : 'Opportunities'}.`
                  : 'Contact an admin to set up stage auto-move rules.'
              }
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['Rule Name', 'Trigger Field / Type', 'Condition', 'Target Stage', 'Enabled', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                    <th
                      key={h}
                      style={{
                        background: '#F2FAF0',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#7A8B80',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        textAlign: 'left',
                        padding: '10px 16px',
                        borderBottom: '1px solid #E4EBE1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const fieldLabel =
                    STANDARD_FIELDS.find((f) => f.name === r.field_name)?.label || r.field_name || r.field_label;

                  return (
                    <tr key={r.id} style={{ opacity: r.is_enabled ? 1 : 0.55 }}>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 700, color: '#16231B' }}>
                        {r.name}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C', fontSize: 13 }}>
                        <Chip
                          label={
                            r.trigger_type === 'standard_field'
                              ? `Field: ${fieldLabel}`
                              : r.trigger_type === 'custom_field'
                              ? `Custom: ${r.field_label || r.field_id}`
                              : 'Document Verification'
                          }
                          size="small"
                          sx={{ fontSize: 11, background: '#EAF6E8', color: '#04552B', fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C', fontSize: 12 }}>
                        {r.condition_operator === 'is_filled' && 'Is Provided / Filled'}
                        {r.condition_operator === 'is_verified' && 'Is Verified'}
                        {r.condition_operator === 'equals' && `Equals "${r.condition_value}"`}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                        <Chip
                          label={r.target_stage_key ? r.target_stage_key.toUpperCase() : r.target_status}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                        <Switch
                          size="small"
                          disabled={!isAdmin}
                          checked={r.is_enabled}
                          onChange={(e) => toggleEnabled(r, e.target.checked)}
                        />
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditing(r);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil size={15} />
                            </IconButton>
                            <IconButton size="small" onClick={() => setDeleteTarget(r)}>
                              <Trash2 size={15} color="#DC2626" />
                            </IconButton>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Paper>

      {dialogOpen && (
        <AutomoveRuleDialog
          open={dialogOpen}
          editing={editing}
          defaultModule={activeModule}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Auto-Move Rule?</DialogTitle>
        <DialogContent>This will remove the rule "{deleteTarget?.name}".</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
