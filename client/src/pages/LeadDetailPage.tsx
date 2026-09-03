import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, CheckCircle2, Clock, Plus, Save, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useGetApplicationQuery,
  useUpdateApplicationMutation,
  useApplicationActivityQuery,
  usePlannedActivitiesQuery,
  useCreatePlannedActivityMutation,
  useUpdatePlannedActivityMutation,
} from '@/api/applicationsApi';
import {
  useActivityTypesQuery,
  useFinanceCompaniesQuery,
  useStagesByModuleQuery,
  useTabsQuery,
  useTabsByModuleQuery,
  useVehicleModelsQuery,
  useUsersQuery,
} from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import DynamicFieldEngine from '@/components/fields/DynamicFieldEngine';
import DocumentVerificationPanel from '@/components/fields/DocumentVerificationPanel';
import FinalSubmissionPanel from '@/components/fields/FinalSubmissionPanel';
import { formatDate, formatDateTime } from '@/utils/format';

const editSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_phone: z.string().min(8, 'Valid phone number required').max(20),
  vehicle_model_id: z.string().optional(),
  vehicle_price: z.coerce
    .number({ invalid_type_error: 'Vehicle price is required' })
    .positive('Vehicle price must be positive'),
  down_payment: z.coerce
    .number({ invalid_type_error: 'Down payment is required' })
    .nonnegative('Down payment cannot be negative'),
  amount: z.coerce
    .number({ invalid_type_error: 'Loan amount is required' })
    .positive('Loan amount must be positive'),
  finance_company_id: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

const planSchema = z.object({
  activity_type_name: z.string().min(1, 'Select an activity type'),
  subject: z.string().min(2, 'Activity subject/title is required'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().optional(),
});

type PlanForm = z.infer<typeof planSchema>;

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const appId = Number(id);

  const { data: lead, isFetching } = useGetApplicationQuery(appId, { skip: !appId });

  const { data: activityLogs = [] } = useApplicationActivityQuery(appId, { skip: !appId });
  const { data: plannedActivities = [] } = usePlannedActivitiesQuery(appId, { skip: !appId });
  const { data: activityTypes = [] } = useActivityTypesQuery();
  const [updateApplication, { isLoading: isUpdating }] = useUpdateApplicationMutation();
  const [createPlannedActivity, { isLoading: creatingPlanned }] = useCreatePlannedActivityMutation();
  const [updatePlannedActivity] = useUpdatePlannedActivityMutation();

  const { data: models = [], isFetching: loadingModels } = useVehicleModelsQuery();
  const { data: companies = [] } = useFinanceCompaniesQuery();
  const { data: users = [] } = useUsersQuery();

  const location = useLocation();
  const isOpportunity = lead?.status ? lead.status.toUpperCase() !== 'LEAD' : false;
  const isOppUrl = location.pathname.startsWith('/opportunities');
  const targetModule = (isOpportunity || isOppUrl) ? 'OPPORTUNITY' : 'LEAD';
  const backTarget = (isOpportunity || isOppUrl) ? '/opportunities' : '/leads';
  const backLabel = (isOpportunity || isOppUrl) ? 'Back to Opportunities' : 'Back to Leads';
  const detailTitle = (isOpportunity || isOppUrl) ? 'Opportunity Details' : 'Lead Details';

  const { data: crmTabs = [] } = useTabsByModuleQuery(targetModule);

  const [activeLeadTabCode, setActiveLeadTabCode] = useState<string>('general');
  const [sideTab, setSideTab] = useState(0);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const {
    register: registerPlan,
    handleSubmit: handleSubmitPlan,
    reset: resetPlan,
    setValue: setPlanValue,
    watch: watchPlan,
    formState: { errors: planErrors },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { activity_type_name: '', subject: '', due_date: '', notes: '' },
  });

  const modelId = watch('vehicle_model_id');

  useEffect(() => {
    if (lead) {
      reset({
        customer_name: lead.customer_name || '',
        customer_phone: lead.customer_phone || '',
        vehicle_model_id: lead.vehicle_model_id ? String(lead.vehicle_model_id) : '',
        vehicle_price: lead.vehicle_price ?? 0,
        down_payment: lead.down_payment ?? 0,
        amount: lead.amount ?? 0,
        finance_company_id: lead.finance_company_id ? String(lead.finance_company_id) : '',
      });
    }
  }, [lead, reset]);

  const selectedModel = models.find((m) => String(m.id) === modelId);

  const onSubmit = async (values: EditForm) => {
    if (!lead) return;
    try {
      await updateApplication({
        id: lead.id,
        body: {
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          vehicle: selectedModel?.name ?? lead.vehicle,
          amount: values.amount,
          status: lead.status,
          vehicle_model_id: values.vehicle_model_id ? Number(values.vehicle_model_id) : null,
          vehicle_price: values.vehicle_price,
          down_payment: values.down_payment,
          finance_company_id: values.finance_company_id ? Number(values.finance_company_id) : null,
        },
      }).unwrap();
      showToast(`Lead ${lead.app_no} updated`, 'success');
    } catch (err) {
      const errData = (err as { data?: { detail?: unknown } })?.data;
      let detailMsg = 'Could not update the lead';
      if (typeof errData?.detail === 'string') {
        detailMsg = errData.detail;
      } else if (Array.isArray(errData?.detail)) {
        detailMsg = errData.detail.map((d: { msg?: string }) => d.msg || 'Invalid field').join(', ');
      }
      showToast(detailMsg, 'error');
    }
  };

  const onPlanSubmit = async (values: PlanForm) => {
    if (!lead) return;
    try {
      const matchedType = activityTypes.find((t) => t.name === values.activity_type_name);
      await createPlannedActivity({
        appId: lead.id,
        body: {
          activity_type_id: matchedType?.id ?? null,
          activity_type_name: values.activity_type_name,
          subject: values.subject,
          notes: values.notes,
          due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
          assigned_to: values.assigned_to ? Number(values.assigned_to) : null,
        },
      }).unwrap();
      showToast('Activity planned successfully', 'success');
      resetPlan();
      setPlanDialogOpen(false);
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not plan activity', 'error');
    }
  };

  const markCompleted = async (actId: number) => {
    if (!lead) return;
    try {
      await updatePlannedActivity({
        appId: lead.id,
        actId,
        body: { status: 'COMPLETED' },
      }).unwrap();
      showToast('Activity marked as completed', 'success');
    } catch {
      showToast('Could not update activity status', 'error');
    }
  };

  const { data: oppStages = [] } = useStagesByModuleQuery('OPPORTUNITY');

  const convertToOpportunity = async () => {
    if (!lead) return;
    try {
      const validOppStage = oppStages.find((s) => s.enabled && String(s.status).toUpperCase() !== 'LEAD')?.key || 'applications';
      await updateApplication({
        id: lead.id,
        body: { status: 'APPLICATION', stage_key: validOppStage } as any,
      }).unwrap();
      showToast(`${lead.app_no} moved to Opportunity (${validOppStage.toUpperCase()})`, 'success');
      navigate('/opportunities');
    } catch {
      showToast('Could not convert to opportunity', 'error');
    }
  };

  if (isFetching && !lead) {
    return <div style={{ padding: 24, color: '#7A8B80' }}>Loading details...</div>;
  }

  if (!lead) {
    return (
      <div style={{ padding: 24 }}>
        <Typography variant="h6" color="error">
          Record not found
        </Typography>
        <Button onClick={() => navigate(backTarget)} sx={{ mt: 2 }}>
          {backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(backTarget)}
          sx={{ color: '#44584C', textTransform: 'none', fontWeight: 600 }}
        >
          {backLabel}
        </Button>
      </div>

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 20, alignItems: 'start', maxWidth: '100%' }}>
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>
                {lead.app_no}
              </div>
              <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
                {detailTitle}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '4.5px 12px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                background: '#F0F4EE',
                color: '#087A3D',
                border: '1px solid #C2E2BE',
                boxShadow: '0 1px 2px rgba(2, 48, 32, 0.06)',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#087A3D',
                  boxShadow: '0 0 0 2.5px #E6F3EA, 0 0 6px rgba(8, 122, 61, 0.5)',
                  flexShrink: 0,
                }}
              />
              Last updated: {formatDateTime(lead.updated_at)}
            </span>
          </div>

          {/* Dynamic Module Tabs for this Lead - Wraps onto 2nd line when space runs out */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, borderBottom: '1px solid #E4EBE1', pb: 1.5, mb: 3 }}>
            <Button
              size="small"
              variant={activeLeadTabCode === 'general' ? 'contained' : 'outlined'}
              color={activeLeadTabCode === 'general' ? 'primary' : 'inherit'}
              onClick={() => setActiveLeadTabCode('general')}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13,
                px: 2,
                py: 0.8,
                boxShadow: activeLeadTabCode === 'general' ? '0 2px 6px rgba(8,122,61,0.2)' : 'none',
              }}
            >
              Lead Details
            </Button>
            {crmTabs
              .filter((t) => t.is_active)
              .map((t) => (
                <Button
                  key={t.code}
                  size="small"
                  variant={activeLeadTabCode === t.code ? 'contained' : 'outlined'}
                  color={activeLeadTabCode === t.code ? 'primary' : 'inherit'}
                  onClick={() => setActiveLeadTabCode(t.code)}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    px: 2,
                    py: 0.8,
                    boxShadow: activeLeadTabCode === t.code ? '0 2px 6px rgba(8,122,61,0.2)' : 'none',
                  }}
                >
                  {t.name}
                </Button>
              ))}
          </Box>

          {activeLeadTabCode === 'general' ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <TextField
                  fullWidth
                  label="Customer name *"
                  margin="dense"
                  error={Boolean(errors.customer_name)}
                  helperText={errors.customer_name?.message}
                  {...register('customer_name')}
                />
                <TextField
                  fullWidth
                  label="Mobile number *"
                  margin="dense"
                  error={Boolean(errors.customer_phone)}
                  helperText={errors.customer_phone?.message}
                  {...register('customer_phone')}
                />
              </div>

              <Select
                fullWidth
                displayEmpty
                size="small"
                value={modelId || ''}
                onChange={(e) => setValue('vehicle_model_id', String(e.target.value), { shouldValidate: true })}
                error={Boolean(errors.vehicle_model_id)}
                sx={{ mt: 1, mb: 0.5 }}
                renderValue={(value) =>
                  value ? models.find((m) => String(m.id) === value)?.name ?? value : 'Select vehicle model *'
                }
                inputProps={{ 'aria-label': 'Vehicle model' }}
              >
                <MenuItem value="">Select vehicle model</MenuItem>
                {loadingModels && <MenuItem disabled>Loading models...</MenuItem>}
                {!loadingModels && models.length === 0 && (
                  <MenuItem disabled>No models configured — add them in Configuration</MenuItem>
                )}
                {models.map((m) => (
                  <MenuItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.vehicle_model_id && (
                <div style={{ fontSize: 11.5, color: '#d32f2f', margin: '2px 14px 0' }}>
                  {errors.vehicle_model_id.message}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TextField
                  fullWidth
                  label="Vehicle price *"
                  margin="dense"
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  error={Boolean(errors.vehicle_price)}
                  helperText={errors.vehicle_price?.message}
                  {...register('vehicle_price')}
                />
                <TextField
                  fullWidth
                  label="Down payment *"
                  margin="dense"
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  error={Boolean(errors.down_payment)}
                  helperText={errors.down_payment?.message}
                  {...register('down_payment')}
                />
              </div>

              <TextField
                fullWidth
                label="Loan amount *"
                margin="dense"
                type="number"
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                error={Boolean(errors.amount)}
                helperText={errors.amount?.message}
                {...register('amount')}
              />

              <Select
                fullWidth
                displayEmpty
                size="small"
                value={watch('finance_company_id') || ''}
                onChange={(e) => setValue('finance_company_id', String(e.target.value), { shouldValidate: true })}
                error={Boolean(errors.finance_company_id)}
                sx={{ mt: 1, mb: 0.5 }}
                renderValue={(value) =>
                  value ? companies.find((c) => String(c.id) === value)?.name ?? value : 'Select finance company *'
                }
                inputProps={{ 'aria-label': 'Finance company' }}
              >
                <MenuItem value="">Select finance company</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.finance_company_id && (
                <div style={{ fontSize: 11.5, color: '#d32f2f', margin: '2px 14px 0' }}>
                  {errors.finance_company_id.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                {lead.status === 'LEAD' && (
                  <Button
                    variant="outlined"
                    startIcon={<Sparkles size={16} />}
                    disabled={isUpdating}
                    onClick={convertToOpportunity}
                    sx={{
                      borderColor: '#2563EB',
                      color: '#2563EB',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { background: '#EFF6FF', borderColor: '#1D4ED8' },
                    }}
                  >
                    Move to Opportunity
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save size={16} />}
                  disabled={isUpdating}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          ) : activeLeadTabCode === 'final_submission' || crmTabs.find((t) => t.code === activeLeadTabCode)?.name.toLowerCase().includes('final submission') ? (
            <FinalSubmissionPanel applicationId={lead.id} />
          ) : activeLeadTabCode === 'document_verification' ||
              activeLeadTabCode === 'verification' ||
              activeLeadTabCode === 'document_upload' ||
              crmTabs.find((t) => t.code === activeLeadTabCode)?.name.toLowerCase().includes('verification') ||
              crmTabs.find((t) => t.code === activeLeadTabCode)?.name.toLowerCase().includes('document') ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <DynamicFieldEngine
                tabId={crmTabs.find((t) => t.code === activeLeadTabCode)?.id || 0}
                tabCode={activeLeadTabCode}
                applicationId={lead.id}
                customerName={lead.customer_name}
                currentStageKey={lead.status}
                hideIfEmpty
              />
              <DocumentVerificationPanel applicationId={lead.id} />
            </Box>
          ) : (
            <DynamicFieldEngine
              tabId={crmTabs.find((t) => t.code === activeLeadTabCode)?.id || 0}
              tabCode={activeLeadTabCode}
              applicationId={lead.id}
              customerName={lead.customer_name}
              currentStageKey={lead.status}
            />
          )}
        </Paper>

        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3, minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: '#E4EBE1', mb: 2 }}>
            <Tabs
              value={sideTab}
              onChange={(_, next) => setSideTab(next)}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontSize: 13, fontWeight: 600, minWidth: 100 },
              }}
            >
              <Tab label={`Activities (${plannedActivities.length})`} />
              <Tab label={`Change Log (${activityLogs.length})`} />
            </Tabs>
          </Box>

          {sideTab === 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#16231B' }}>Planned Lead Activities</span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={14} />}
                  onClick={() => setPlanDialogOpen(true)}
                >
                  Plan Activity
                </Button>
              </div>

              {plannedActivities.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#7A8B80', fontSize: 13 }}>
                  No planned activities yet. Click "Plan Activity" to schedule calls, follow-ups or meetings.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plannedActivities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        padding: '12px',
                        background: act.status === 'COMPLETED' ? '#F4F9F2' : '#FFFFFF',
                        borderRadius: 8,
                        border: '1px solid #E4EBE1',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Chip
                              label={act.activity_type_name}
                              size="small"
                              sx={{ height: 20, fontSize: 10, fontWeight: 700, background: '#EAF6E8', color: '#04552B' }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#16231B' }}>{act.subject}</span>
                          </div>
                          {act.due_date && (
                            <div style={{ fontSize: 11, color: '#7A8B80', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Clock size={12} /> Due: {formatDate(act.due_date)}
                            </div>
                          )}
                        </div>
                        {act.status === 'COMPLETED' ? (
                          <Chip label="Done" color="success" size="small" sx={{ height: 20, fontSize: 10 }} />
                        ) : (
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<CheckCircle2 size={14} color="#087A3D" />}
                            onClick={() => markCompleted(act.id)}
                            sx={{ textTransform: 'none', fontSize: 11, color: '#087A3D', p: 0 }}
                          >
                            Complete
                          </Button>
                        )}
                      </div>

                      {act.notes && (
                        <div style={{ fontSize: 12, color: '#44584C', marginTop: 4, background: '#F8FAF8', padding: '6px 8px', borderRadius: 4 }}>
                          {act.notes}
                        </div>
                      )}

                      {act.creator_name && (
                        <div style={{ fontSize: 10, color: '#9BA99F', marginTop: 6 }}>
                          Planned by {act.creator_name} on {formatDate(act.created_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sideTab === 1 && (
            <div>
              {activityLogs.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#7A8B80', fontSize: 13 }}>
                  No changes recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 12px',
                        background: '#F9FBF8',
                        borderRadius: 8,
                        border: '1px solid #E4EBE1',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#16231B' }}>
                          {log.field_name}
                        </div>
                        <div style={{ fontSize: 10, color: '#9BA99F' }}>
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#44584C' }}>
                        {log.old_value && (
                          <span style={{ textDecoration: 'line-through', color: '#DC2626' }}>
                            {log.old_value}
                          </span>
                        )}
                        {log.old_value && log.new_value && <span style={{ margin: '0 6px' }}>&rarr;</span>}
                        {log.new_value && (
                          <span style={{ color: '#087A3D', fontWeight: 600 }}>{log.new_value}</span>
                        )}
                      </div>
                      {log.actor_name && (
                        <div style={{ fontSize: 10, color: '#9BA99F', marginTop: 4 }}>
                          by {log.actor_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Paper>
      </div>

      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Plan Lead Activity</DialogTitle>
        <form onSubmit={handleSubmitPlan(onPlanSubmit)}>
          <DialogContent>
            <Select
              fullWidth
              displayEmpty
              size="small"
              value={watchPlan('activity_type_name')}
              onChange={(e) => setPlanValue('activity_type_name', String(e.target.value), { shouldValidate: true })}
              error={Boolean(planErrors.activity_type_name)}
              sx={{ mb: 1.5 }}
              renderValue={(val) => (val ? val : 'Select Activity Type')}
            >
              <MenuItem value="">Select Activity Type</MenuItem>
              {activityTypes.length === 0 && (
                <MenuItem disabled>No activity types configured (add in Configuration)</MenuItem>
              )}
              {activityTypes.map((t) => (
                <MenuItem key={t.id} value={t.name}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
            {planErrors.activity_type_name && (
              <div style={{ fontSize: 11.5, color: '#d32f2f', margin: '-8px 14px 8px' }}>
                {planErrors.activity_type_name.message}
              </div>
            )}

            <TextField
              fullWidth
              label="Subject / Title"
              margin="dense"
              placeholder="e.g. Call customer for documents"
              error={Boolean(planErrors.subject)}
              helperText={planErrors.subject?.message}
              {...registerPlan('subject')}
            />

            <Select
              fullWidth
              displayEmpty
              size="small"
              value={watchPlan('assigned_to') || ''}
              onChange={(e) => setPlanValue('assigned_to', String(e.target.value) || '', { shouldValidate: true })}
              sx={{ mb: 1.5 }}
              renderValue={(val) => (val ? users.find((u) => String(u.id) === val)?.full_name ?? val : 'Assign to (optional)')}
            >
              <MenuItem value="">Assign to (optional - defaults to you)</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.full_name} ({u.role})
                </MenuItem>
              ))}
            </Select>

            <TextField
              fullWidth
              label="Due Date & Time"
              type="datetime-local"
              margin="dense"
              slotProps={{ inputLabel: { shrink: true } }}
              {...registerPlan('due_date')}
            />

            <TextField
              fullWidth
              label="Notes / Instructions"
              margin="dense"
              multiline
              rows={3}
              {...registerPlan('notes')}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creatingPlanned}>
              Plan Activity
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
