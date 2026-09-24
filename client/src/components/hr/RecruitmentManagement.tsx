import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tabs,
  Tab,
  Drawer,
  Rating,
  Divider,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Plus,
  Search,
  Users,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  UserCheck,
  UserX,
  Play,
  Pause,
  Award,
  DollarSign,
  Phone,
  Mail,
  Building,
  ChevronRight,
  Filter,
  Download,
  Eye,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import {
  useGetRecruitmentKPIsQuery,
  useListJobRequisitionsQuery,
  useCreateJobRequisitionMutation,
  useApproveOrRejectJobRequisitionMutation,
  useListCandidatesQuery,
  useCreateCandidateMutation,
  useTransitionCandidateStageMutation,
  useResumeCandidateRecruitmentMutation,
  useScheduleInterviewMutation,
  useUpdateCandidateOfferMutation,
  useCreateEmployeeFromCandidateMutation,
  type Candidate,
  type JobRequisition,
} from '@/api/recruitmentApi';
import { useToast } from '@/components/ui/ToastHost';

const RECRUITMENT_STAGES = [
  'Job Requisition',
  'Approval',
  'Sourcing',
  'Screening',
  'Interview',
  'Selected',
  'Offer & Joining',
  'Joined',
  'On Hold',
  'Rejected',
] as const;

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Job Requisition': { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  Approval: { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  Sourcing: { bg: '#F3E8FF', color: '#7C3AED', border: '#DDD6FE' },
  Screening: { bg: '#CFFAFE', color: '#0891B2', border: '#A5F3FC' },
  Interview: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  Selected: { bg: '#D1FAE5', color: '#047857', border: '#6EE7B7' },
  'Offer & Joining': { bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD' },
  Joined: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  'On Hold': { bg: '#FFEDD5', color: '#EA580C', border: '#FED7AA' },
  Rejected: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

export default function RecruitmentManagement() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'kanban' | 'candidates' | 'requisitions'>('kanban');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [reqFilter, setReqFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');

  // Selected candidate for Drawer/Modal
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dialog States
  const [createReqDialog, setCreateReqDialog] = useState(false);
  const [createCandidateDialog, setCreateCandidateDialog] = useState(false);
  const [stageTransitionDialog, setStageTransitionDialog] = useState(false);
  const [interviewDialog, setInterviewDialog] = useState(false);
  const [offerDialog, setOfferDialog] = useState(false);
  const [createEmployeeDialog, setCreateEmployeeDialog] = useState(false);
  const [approveRejectReqDialog, setApproveRejectReqDialog] = useState<{ open: boolean; req: JobRequisition | null; action: 'Approve' | 'Reject' }>({
    open: false,
    req: null,
    action: 'Approve',
  });

  // Target stage for transition modal
  const [targetStage, setTargetStage] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [onHoldReason, setOnHoldReason] = useState('');
  const [transitionRemarks, setTransitionRemarks] = useState('');

  // RTK Query Hooks
  const { data: kpis } = useGetRecruitmentKPIsQuery();
  const { data: requisitions = [], isLoading: reqsLoading } = useListJobRequisitionsQuery();
  const { data: candidates = [], isLoading: candidatesLoading } = useListCandidatesQuery({
    search: searchTerm,
    job_requisition_id: reqFilter !== 'All' ? parseInt(reqFilter) : undefined,
    department: deptFilter !== 'All' ? deptFilter : undefined,
    stage: stageFilter !== 'All' ? stageFilter : undefined,
    candidate_source: sourceFilter !== 'All' ? sourceFilter : undefined,
  });

  // Mutations
  const [createRequisition] = useCreateJobRequisitionMutation();
  const [approveRejectRequisition] = useApproveOrRejectJobRequisitionMutation();
  const [createCandidate] = useCreateCandidateMutation();
  const [transitionStage] = useTransitionCandidateStageMutation();
  const [resumeCandidate] = useResumeCandidateRecruitmentMutation();
  const [scheduleInterview] = useScheduleInterviewMutation();
  const [updateOffer] = useUpdateCandidateOfferMutation();
  const [createEmployee] = useCreateEmployeeFromCandidateMutation();

  // Forms
  const EMPTY_REQ_FORM = {
    job_title: '',
    department: '',
    vacancies: 1,
    employment_type: 'Full Time',
    required_qualification: '',
    required_experience: '',
    skills: '',
    salary_range: '',
    preferred_joining_date: '',
    job_description: '',
    requesting_department: '',
  };

  const EMPTY_CAND_FORM = {
    job_requisition_id: undefined as number | undefined,
    name: '',
    mobile: '',
    email: '',
    resume_url: '',
    experience: '',
    qualification: '',
    current_company: '',
    current_salary: '',
    expected_salary: '',
    notice_period: '',
    candidate_source: 'Direct',
    stage: 'Sourcing',
  };

  const EMPTY_INTERVIEW_FORM = {
    interview_type: '',
    interview_date: '',
    interviewer_panel: '',
    interview_round: '',
    interview_feedback: '',
    interview_rating: 5,
    interview_remarks: '',
  };

  const EMPTY_OFFER_FORM = {
    offer_status: 'Offer Draft' as 'Offer Draft' | 'Offer Released' | 'Offer Accepted' | 'Offer Declined',
    confirmed_joining_date: '',
    rejection_reason: '',
  };

  const EMPTY_EMP_FORM = {
    emp_id: '',
    designation: '',
    department: '',
    branch: '',
  };

  const [reqForm, setReqForm] = useState(EMPTY_REQ_FORM);
  const [candForm, setCandForm] = useState(EMPTY_CAND_FORM);
  const [interviewForm, setInterviewForm] = useState(EMPTY_INTERVIEW_FORM);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER_FORM);
  const [empForm, setEmpForm] = useState(EMPTY_EMP_FORM);

  // Unique departments from requisitions
  const departments = useMemo(() => {
    const set = new Set<string>();
    requisitions.forEach((r) => set.add(r.department));
    return Array.from(set);
  }, [requisitions]);

  // Handlers
  const handleSaveRequisition = async () => {
    if (!reqForm.job_title || !reqForm.department) {
      showToast('Please fill required job title and department', 'error');
      return;
    }
    try {
      await createRequisition(reqForm).unwrap();
      showToast('Job Requisition created and submitted for approval', 'success');
      setCreateReqDialog(false);
      setReqForm(EMPTY_REQ_FORM);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to create job requisition', 'error');
    }
  };

  const handleApproveRejectRequisition = async () => {
    if (!approveRejectReqDialog.req) return;
    if (approveRejectReqDialog.action === 'Reject' && !rejectionReason) {
      showToast('Rejection reason is mandatory', 'error');
      return;
    }
    try {
      await approveRejectRequisition({
        id: approveRejectReqDialog.req.id,
        action: approveRejectReqDialog.action,
        rejection_reason: rejectionReason,
      }).unwrap();
      showToast(
        `Job Requisition ${approveRejectReqDialog.action === 'Approve' ? 'Approved' : 'Rejected'}`,
        'success'
      );
      setApproveRejectReqDialog({ open: false, req: null, action: 'Approve' });
      setRejectionReason('');
    } catch (err: any) {
      showToast(err?.data?.detail || 'Action failed', 'error');
    }
  };

  const handleSaveCandidate = async () => {
    if (!candForm.name || !candForm.email || !candForm.mobile) {
      showToast('Candidate Name, Email, and Mobile are required', 'error');
      return;
    }
    try {
      await createCandidate(candForm).unwrap();
      showToast('Candidate added to recruitment pipeline', 'success');
      setCreateCandidateDialog(false);
      setCandForm(EMPTY_CAND_FORM);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to add candidate', 'error');
    }
  };

  const handleInitiateStageTransition = (candidate: Candidate, newStage: string) => {
    setSelectedCandidate(candidate);
    setTargetStage(newStage);
    setRejectionReason('');
    setOnHoldReason('');
    setTransitionRemarks('');
    setStageTransitionDialog(true);
  };

  const handleConfirmStageTransition = async () => {
    if (!selectedCandidate || !targetStage) return;

    if (targetStage === 'On Hold' && !onHoldReason) {
      showToast('On Hold reason is mandatory', 'error');
      return;
    }
    if (targetStage === 'Rejected' && !rejectionReason) {
      showToast('Rejection reason is mandatory', 'error');
      return;
    }

    try {
      const updated = await transitionStage({
        id: selectedCandidate.id,
        body: {
          new_stage: targetStage,
          rejection_reason: rejectionReason,
          on_hold_reason: onHoldReason,
          remarks: transitionRemarks,
        },
      }).unwrap();
      showToast(`Candidate moved to ${targetStage}`, 'success');
      setSelectedCandidate(updated);
      setStageTransitionDialog(false);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to update stage', 'error');
    }
  };

  const handleResumeCandidate = async (candidateId: number) => {
    try {
      const updated = await resumeCandidate(candidateId).unwrap();
      showToast(`Candidate resumed from On Hold to ${updated.stage}`, 'success');
      setSelectedCandidate(updated);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to resume candidate', 'error');
    }
  };

  const handleScheduleInterviewSubmit = async () => {
    if (!selectedCandidate) return;
    try {
      const updated = await scheduleInterview({
        id: selectedCandidate.id,
        ...interviewForm,
      }).unwrap();
      showToast('Interview scheduled successfully', 'success');
      setSelectedCandidate(updated);
      setInterviewDialog(false);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to schedule interview', 'error');
    }
  };

  const handleUpdateOfferSubmit = async () => {
    if (!selectedCandidate) return;
    if (offerForm.offer_status === 'Offer Declined' && !offerForm.rejection_reason) {
      showToast('Rejection reason is mandatory when offer is declined', 'error');
      return;
    }
    try {
      const updated = await updateOffer({
        id: selectedCandidate.id,
        ...offerForm,
      }).unwrap();
      showToast(`Offer status updated to ${offerForm.offer_status}`, 'success');
      setSelectedCandidate(updated);
      setOfferDialog(false);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to update offer', 'error');
    }
  };

  const handleCreateEmployeeSubmit = async () => {
    if (!selectedCandidate) return;
    try {
      const updated = await createEmployee({
        id: selectedCandidate.id,
        ...empForm,
      }).unwrap();
      showToast('Employee record created successfully in Employee Master!', 'success');
      setSelectedCandidate(updated);
      setCreateEmployeeDialog(false);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to create employee record', 'error');
    }
  };

  const getStageCount = (stage: string) => {
    switch (stage) {
      case 'Job Requisition':
        return kpis?.job_requisition ?? candidates.filter((c) => c.stage === 'Job Requisition').length;
      case 'Approval':
        return kpis?.approval ?? candidates.filter((c) => c.stage === 'Approval').length;
      case 'Sourcing':
        return kpis?.sourcing ?? candidates.filter((c) => c.stage === 'Sourcing').length;
      case 'Screening':
        return kpis?.screening ?? candidates.filter((c) => c.stage === 'Screening').length;
      case 'Interview':
        return kpis?.interviews ?? candidates.filter((c) => c.stage === 'Interview').length;
      case 'Selected':
        return kpis?.selected ?? candidates.filter((c) => c.stage === 'Selected').length;
      case 'Offer & Joining':
        return kpis?.offers ?? candidates.filter((c) => c.stage === 'Offer & Joining').length;
      case 'Joined':
        return kpis?.joined ?? candidates.filter((c) => c.stage === 'Joined').length;
      case 'On Hold':
        return kpis?.on_hold ?? candidates.filter((c) => c.stage === 'On Hold').length;
      case 'Rejected':
        return kpis?.rejected ?? candidates.filter((c) => c.stage === 'Rejected').length;
      default:
        return 0;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* 1. CRM-Style Stage Pipeline Bar */}
      <Box
        sx={{
          mb: 2,
          p: 1.25,
          bgcolor: '#ffffff',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 1100, gap: 0.5 }}>
          {RECRUITMENT_STAGES.map((stage, i) => {
            const count = getStageCount(stage);
            const theme = STAGE_COLORS[stage] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
            const isSelected = stageFilter === stage;

            return (
              <Box key={stage} sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={isSelected ? 'Clear filter' : `Filter by ${stage}`} placement="top" arrow>
                  <button
                    type="button"
                    onClick={() => setStageFilter(isSelected ? 'All' : stage)}
                    style={{
                      width: 106,
                      height: 68,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      border: '1.5px solid',
                      borderColor: isSelected ? theme.color : theme.border,
                      borderRadius: 12,
                      padding: '6px 4px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? `${theme.color}22` : theme.bg,
                      boxShadow: isSelected ? `0 4px 12px ${theme.color}33` : '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  >
                    {/* White Badge for Count */}
                    <div
                      style={{
                        minWidth: 32,
                        height: 22,
                        padding: '0 8px',
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1.5px 4px rgba(0, 0, 0, 0.08)',
                        border: `1px solid ${theme.color}25`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: theme.color,
                          lineHeight: 1,
                        }}
                      >
                        {count}
                      </span>
                    </div>

                    {/* Stage Label */}
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: theme.color,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: 0.2,
                        lineHeight: 1.1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: 22,
                        wordBreak: 'break-word',
                        padding: '0 2px',
                      }}
                    >
                      {stage}
                    </div>
                  </button>
                </Tooltip>

                {i < RECRUITMENT_STAGES.length - 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#cbd5e1',
                      width: 14,
                      flexShrink: 0,
                    }}
                  >
                    <ChevronRight size={13} />
                  </div>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* 2. Top Action Controls & View Switcher */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Stack direction="row" spacing={1}>
          <Button
            variant={activeTab === 'kanban' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('kanban')}
            sx={{
              bgcolor: activeTab === 'kanban' ? '#087A3D' : 'transparent',
              borderColor: '#087A3D',
              color: activeTab === 'kanban' ? '#fff' : '#087A3D',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: activeTab === 'kanban' ? '#066231' : 'rgba(8,122,61,0.08)' },
            }}
          >
            Kanban Pipeline
          </Button>
          <Button
            variant={activeTab === 'candidates' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('candidates')}
            sx={{
              bgcolor: activeTab === 'candidates' ? '#087A3D' : 'transparent',
              borderColor: '#087A3D',
              color: activeTab === 'candidates' ? '#fff' : '#087A3D',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: activeTab === 'candidates' ? '#066231' : 'rgba(8,122,61,0.08)' },
            }}
          >
            Candidate List
          </Button>
          <Button
            variant={activeTab === 'requisitions' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('requisitions')}
            sx={{
              bgcolor: activeTab === 'requisitions' ? '#087A3D' : 'transparent',
              borderColor: '#087A3D',
              color: activeTab === 'requisitions' ? '#fff' : '#087A3D',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: activeTab === 'requisitions' ? '#066231' : 'rgba(8,122,61,0.08)' },
            }}
          >
            Job Requisitions ({requisitions.length})
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateReqDialog(true)}
            sx={{ borderColor: '#cbd5e1', color: '#334155', textTransform: 'none', borderRadius: 2 }}
          >
            New Job Requisition
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateCandidateDialog(true)}
            sx={{ bgcolor: '#087A3D', '&:hover': { bgcolor: '#066231' }, textTransform: 'none', borderRadius: 2 }}
          >
            Add Candidate
          </Button>
        </Stack>
      </Box>

      {/* 3. Search & Filter Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by candidate name, mobile, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search size={16} style={{ marginRight: 8, color: '#64748b' }} />,
              }}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Job Requisition</InputLabel>
              <Select
                value={reqFilter}
                label="Job Requisition"
                onChange={(e) => setReqFilter(e.target.value)}
              >
                <MenuItem value="All">All Requisitions</MenuItem>
                {requisitions.map((r) => (
                  <MenuItem key={r.id} value={String(r.id)}>
                    {r.job_title} ({r.req_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={deptFilter}
                label="Department"
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <MenuItem value="All">All Departments</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Stage Filter</InputLabel>
              <Select
                value={stageFilter}
                label="Stage Filter"
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <MenuItem value="All">All 10 Stages</MenuItem>
                {RECRUITMENT_STAGES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Candidate Source</InputLabel>
              <Select
                value={sourceFilter}
                label="Candidate Source"
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <MenuItem value="All">All Sources</MenuItem>
                <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                <MenuItem value="Job Portal">Job Portal</MenuItem>
                <MenuItem value="Referral">Employee Referral</MenuItem>
                <MenuItem value="Agency">Agency</MenuItem>
                <MenuItem value="Direct">Direct Application</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. Tab Content Region */}

      {/* VIEW A: Clean 10-Column Kanban Pipeline */}
      {activeTab === 'kanban' && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            minHeight: 520,
          }}
        >
          {RECRUITMENT_STAGES.map((stage) => {
            const stageCandidates = candidates.filter((c) => c.stage === stage);
            const style = STAGE_COLORS[stage] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

            return (
              <Paper
                key={stage}
                variant="outlined"
                sx={{
                  width: 280,
                  minWidth: 280,
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '75vh',
                }}
              >
                {/* Column Header */}
                <Box
                  sx={{
                    p: 1.5,
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: style.bg,
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: style.color }}>
                    {stage}
                  </Typography>
                  <Chip
                    label={stageCandidates.length}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: '#fff',
                      color: style.color,
                      border: `1px solid ${style.border}`,
                    }}
                  />
                </Box>

                {/* Candidate Cards Column Content */}
                <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {stageCandidates.length === 0 ? (
                    <Box sx={{ py: 4, textStyle: 'center', color: '#94a3b8', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                        No candidates in {stage}
                      </Typography>
                    </Box>
                  ) : (
                    stageCandidates.map((cand) => (
                      <Card
                        key={cand.id}
                        variant="outlined"
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setDrawerOpen(true);
                        }}
                        sx={{
                          borderRadius: 2,
                          cursor: 'pointer',
                          borderColor: '#e2e8f0',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            borderColor: '#087A3D',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {cand.name}
                            </Typography>
                            <Chip
                              label={cand.candidate_source}
                              size="small"
                              sx={{ height: 18, fontSize: 9, bgcolor: '#f1f5f9', color: '#475569' }}
                            />
                          </Box>

                          <Typography variant="caption" sx={{ color: '#087A3D', fontWeight: 600, display: 'block' }}>
                            {cand.job_title || 'General Pool'}
                          </Typography>

                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                            Exp: {cand.experience} • Exp. Salary: {cand.expected_salary || 'N/A'}
                          </Typography>

                          {cand.interview_date && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#d97706', mb: 0.5 }}>
                              <Calendar size={12} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Int: {new Date(cand.interview_date).toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}

                          {cand.confirmed_joining_date && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#047857', mb: 0.5 }}>
                              <UserCheck size={12} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Join: {cand.confirmed_joining_date}
                              </Typography>
                            </Box>
                          )}

                          {cand.stage === 'On Hold' && cand.on_hold_reason && (
                            <Typography variant="caption" sx={{ color: '#c2410c', fontStyle: 'italic', display: 'block' }}>
                              Hold: {cand.on_hold_reason}
                            </Typography>
                          )}

                          {cand.stage === 'Rejected' && cand.rejection_reason && (
                            <Typography variant="caption" sx={{ color: '#b91c1c', fontStyle: 'italic', display: 'block' }}>
                              Reason: {cand.rejection_reason}
                            </Typography>
                          )}

                          {/* Quick Stage Change Button bar */}
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCandidate(cand);
                                setDrawerOpen(true);
                              }}
                              sx={{ fontSize: 11, textTransform: 'none', p: 0, minWidth: 'auto', color: '#64748b' }}
                            >
                              View Details
                            </Button>

                            {cand.stage === 'On Hold' ? (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Play size={10} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResumeCandidate(cand.id);
                                }}
                                sx={{ height: 22, fontSize: 10, bgcolor: '#087A3D', textTransform: 'none', px: 1 }}
                              >
                                Resume
                              </Button>
                            ) : cand.stage === 'Joined' ? (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={cand.is_employee_created}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCandidate(cand);
                                  setEmpForm({
                                    emp_id: '',
                                    designation: cand.selected_designation || cand.job_title || 'Employee',
                                    department: cand.selected_department || cand.job_department || 'Engineering',
                                    branch: 'Coimbatore Office',
                                  });
                                  setCreateEmployeeDialog(true);
                                }}
                                sx={{ height: 22, fontSize: 10, bgcolor: '#047857', textTransform: 'none', px: 1 }}
                              >
                                {cand.is_employee_created ? 'Created' : 'Create Emp'}
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = RECRUITMENT_STAGES.indexOf(cand.stage as any);
                                  const next = RECRUITMENT_STAGES[idx + 1] || 'Selected';
                                  handleInitiateStageTransition(cand, next);
                                }}
                                sx={{ height: 22, fontSize: 10, textTransform: 'none', px: 1, borderColor: '#cbd5e1' }}
                              >
                                Advance Stage
                              </Button>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* VIEW B: Candidate Data Table */}
      {activeTab === 'candidates' && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Candidate Code & Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Job Position & Dept</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current Stage</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Experience & CTC</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No candidates found. Click "Add Candidate" to populate the recruitment pipeline.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((cand) => {
                  const style = STAGE_COLORS[cand.stage] || { bg: '#f1f5f9', color: '#475569' };
                  return (
                    <TableRow key={cand.id} hover>
                      <TableCell>
                        <Box sx={{ fontWeight: 700, color: '#0f172a' }}>{cand.name}</Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{cand.candidate_code}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#087A3D' }}>
                          {cand.job_title || 'General Pool'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {cand.job_department || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cand.email}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{cand.mobile}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cand.stage}
                          size="small"
                          sx={{
                            bgcolor: style.bg,
                            color: style.color,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cand.experience}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Exp CTC: {cand.expected_salary || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={cand.candidate_source} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setDrawerOpen(true);
                          }}
                          sx={{ textTransform: 'none', borderRadius: 1.5 }}
                        >
                          Manage Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* VIEW C: Job Requisitions Table */}
      {activeTab === 'requisitions' && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Req Code & Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Vacancies</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Exp & Qualification</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Salary Range</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No job requisitions created yet. Click "New Job Requisition" above.
                  </TableCell>
                </TableRow>
              ) : (
                requisitions.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {req.job_title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{req.req_code}</Typography>
                    </TableCell>
                    <TableCell>{req.department}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{req.vacancies}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{req.required_experience}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{req.required_qualification}</Typography>
                    </TableCell>
                    <TableCell>{req.salary_range}</TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        size="small"
                        color={
                          req.status === 'Approved'
                            ? 'success'
                            : req.status === 'Approval'
                            ? 'warning'
                            : req.status === 'Rejected'
                            ? 'error'
                            : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      {req.status === 'Approval' && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() =>
                              setApproveRejectReqDialog({ open: true, req, action: 'Approve' })
                            }
                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              setApproveRejectReqDialog({ open: true, req, action: 'Reject' })
                            }
                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Reject
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ============================================================================ */}
      {/* 5. Candidate Detail Drawer (Full Audit History, Resume & Workflows)           */}
      {/* ============================================================================ */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 540 } } }}
      >
        {selectedCandidate && (
          <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedCandidate.name}</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {selectedCandidate.candidate_code} • {selectedCandidate.candidate_source}
                </Typography>
              </Box>
              <Chip
                label={selectedCandidate.stage}
                sx={{
                  bgcolor: STAGE_COLORS[selectedCandidate.stage]?.bg || '#eee',
                  color: STAGE_COLORS[selectedCandidate.stage]?.color || '#333',
                  fontWeight: 800,
                }}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
              {/* Quick Stage Transition Dropdown */}
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Move Candidate Stage</Typography>
                <Stack direction="row" spacing={1.5}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedCandidate.stage}
                      onChange={(e) => handleInitiateStageTransition(selectedCandidate, e.target.value)}
                    >
                      {RECRUITMENT_STAGES.map((stg) => (
                        <MenuItem key={stg} value={stg}>
                          {stg}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedCandidate.stage === 'On Hold' && (
                    <Button
                      variant="contained"
                      startIcon={<Play size={14} />}
                      onClick={() => handleResumeCandidate(selectedCandidate.id)}
                      sx={{ bgcolor: '#087A3D', textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                      Resume
                    </Button>
                  )}
                </Stack>
              </Card>

              {/* Action Buttons for Specific Workflows */}
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Calendar size={16} />}
                    onClick={() => setInterviewDialog(true)}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Schedule Interview
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Award size={16} />}
                    onClick={() => setOfferDialog(true)}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Manage Offer
                  </Button>
                </Grid>

                {selectedCandidate.stage === 'Joined' && (
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={selectedCandidate.is_employee_created}
                      startIcon={<UserCheck size={16} />}
                      onClick={() => {
                        setEmpForm({
                          emp_id: '',
                          designation: selectedCandidate.selected_designation || selectedCandidate.job_title || 'Employee',
                          department: selectedCandidate.selected_department || selectedCandidate.job_department || 'Engineering',
                          branch: 'Coimbatore Office',
                        });
                        setCreateEmployeeDialog(true);
                      }}
                      sx={{ bgcolor: '#047857', '&:hover': { bgcolor: '#065f46' }, textTransform: 'none', borderRadius: 2 }}
                    >
                      {selectedCandidate.is_employee_created
                        ? 'Employee Record Created (Linked)'
                        : 'Create Employee Record in HR'}
                    </Button>
                  </Grid>
                )}
              </Grid>

              {/* Candidate Info Grid */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Candidate Details</Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Position:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedCandidate.job_title || 'General'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Department:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedCandidate.job_department || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Email:</Typography>
                  <Typography variant="body2">{selectedCandidate.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Mobile:</Typography>
                  <Typography variant="body2">{selectedCandidate.mobile}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Experience:</Typography>
                  <Typography variant="body2">{selectedCandidate.experience}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Qualification:</Typography>
                  <Typography variant="body2">{selectedCandidate.qualification}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Current Company:</Typography>
                  <Typography variant="body2">{selectedCandidate.current_company || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Expected Salary:</Typography>
                  <Typography variant="body2">{selectedCandidate.expected_salary || 'N/A'}</Typography>
                </Grid>
              </Grid>

              {/* Stage Transition Audit History */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Stage History Audit Log</Typography>
              <Stack spacing={1.5}>
                {selectedCandidate.stage_history.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>No history records yet.</Typography>
                ) : (
                  selectedCandidate.stage_history.map((hist) => (
                    <Paper key={hist.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {hist.previous_stage || 'Created'} → <span style={{ color: '#087A3D' }}>{hist.new_stage}</span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {new Date(hist.changed_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                        By: {hist.changed_by_name}
                      </Typography>
                      {hist.remarks && (
                        <Typography variant="caption" sx={{ color: '#334155', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                          "{hist.remarks}"
                        </Typography>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ============================================================================ */}
      {/* DIALOGS                                                                       */}
      {/* ============================================================================ */}

      {/* Dialog: New Job Requisition */}
      <Dialog open={createReqDialog} onClose={() => setCreateReqDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Raise New Job Requisition</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Job Title"
            value={reqForm.job_title}
            onChange={(e) => setReqForm({ ...reqForm, job_title: e.target.value })}
            margin="normal"
            size="small"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Department"
                value={reqForm.department}
                onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Vacancies"
                type="number"
                value={reqForm.vacancies}
                onChange={(e) => setReqForm({ ...reqForm, vacancies: parseInt(e.target.value) || 1 })}
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Employment Type"
                value={reqForm.employment_type}
                onChange={(e) => setReqForm({ ...reqForm, employment_type: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Required Experience"
                value={reqForm.required_experience}
                onChange={(e) => setReqForm({ ...reqForm, required_experience: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="Required Qualification"
            value={reqForm.required_qualification}
            onChange={(e) => setReqForm({ ...reqForm, required_qualification: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Key Skills"
            value={reqForm.skills}
            onChange={(e) => setReqForm({ ...reqForm, skills: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Salary Range"
            value={reqForm.salary_range}
            onChange={(e) => setReqForm({ ...reqForm, salary_range: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Job Description"
            multiline
            rows={3}
            value={reqForm.job_description}
            onChange={(e) => setReqForm({ ...reqForm, job_description: e.target.value })}
            margin="normal"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateReqDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveRequisition} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Submit Requisition
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Candidate */}
      <Dialog open={createCandidateDialog} onClose={() => setCreateCandidateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Candidate</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Job Requisition</InputLabel>
            <Select
              value={candForm.job_requisition_id || ''}
              label="Job Requisition"
              onChange={(e) =>
                setCandForm({ ...candForm, job_requisition_id: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <MenuItem value="">General Pool (No Requisition)</MenuItem>
              {requisitions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.job_title} ({r.req_code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Candidate Full Name *"
            value={candForm.name}
            onChange={(e) => setCandForm({ ...candForm, name: e.target.value })}
            margin="normal"
            size="small"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email Address *"
                type="email"
                value={candForm.email}
                onChange={(e) => setCandForm({ ...candForm, email: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Mobile Number *"
                value={candForm.mobile}
                onChange={(e) => setCandForm({ ...candForm, mobile: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Experience"
                value={candForm.experience}
                onChange={(e) => setCandForm({ ...candForm, experience: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Qualification"
                value={candForm.qualification}
                onChange={(e) => setCandForm({ ...candForm, qualification: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Current Company"
                value={candForm.current_company}
                onChange={(e) => setCandForm({ ...candForm, current_company: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Expected Salary"
                value={candForm.expected_salary}
                onChange={(e) => setCandForm({ ...candForm, expected_salary: e.target.value })}
                margin="normal"
                size="small"
              />
            </Grid>
          </Grid>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Candidate Source</InputLabel>
            <Select
              value={candForm.candidate_source}
              label="Candidate Source"
              onChange={(e) => setCandForm({ ...candForm, candidate_source: e.target.value })}
            >
              <MenuItem value="LinkedIn">LinkedIn</MenuItem>
              <MenuItem value="Job Portal">Job Portal</MenuItem>
              <MenuItem value="Referral">Employee Referral</MenuItem>
              <MenuItem value="Agency">Agency</MenuItem>
              <MenuItem value="Direct">Direct Application</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateCandidateDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveCandidate} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Add Candidate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Stage Transition Confirmation (Mandatory Reasons) */}
      <Dialog open={stageTransitionDialog} onClose={() => setStageTransitionDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Move to {targetStage}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {targetStage === 'On Hold' && (
            <TextField
              fullWidth
              label="On Hold Reason *"
              multiline
              rows={3}
              value={onHoldReason}
              onChange={(e) => setOnHoldReason(e.target.value)}
              margin="normal"
              size="small"
            />
          )}

          {targetStage === 'Rejected' && (
            <TextField
              fullWidth
              label="Rejection Reason *"
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              margin="normal"
              size="small"
            />
          )}

          <TextField
            fullWidth
            label="Remarks / Transition Notes"
            multiline
            rows={2}
            value={transitionRemarks}
            onChange={(e) => setTransitionRemarks(e.target.value)}
            margin="normal"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStageTransitionDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmStageTransition} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Confirm Transition
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Schedule Interview */}
      <Dialog open={interviewDialog} onClose={() => setInterviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Schedule Interview Round</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Interview Type"
            value={interviewForm.interview_type}
            onChange={(e) => setInterviewForm({ ...interviewForm, interview_type: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Interview Date & Time"
            type="datetime-local"
            value={interviewForm.interview_date}
            onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
            margin="normal"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Interviewer / Panel"
            value={interviewForm.interviewer_panel}
            onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_panel: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Interview Round"
            value={interviewForm.interview_round}
            onChange={(e) => setInterviewForm({ ...interviewForm, interview_round: e.target.value })}
            margin="normal"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInterviewDialog(false)}>Cancel</Button>
          <Button onClick={handleScheduleInterviewSubmit} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Schedule & Move to Interview
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Manage Offer */}
      <Dialog open={offerDialog} onClose={() => setOfferDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Manage Job Offer</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Offer Status</InputLabel>
            <Select
              value={offerForm.offer_status}
              label="Offer Status"
              onChange={(e) => setOfferForm({ ...offerForm, offer_status: e.target.value as any })}
            >
              <MenuItem value="Offer Draft">Offer Draft</MenuItem>
              <MenuItem value="Offer Released">Offer Released</MenuItem>
              <MenuItem value="Offer Accepted">Offer Accepted</MenuItem>
              <MenuItem value="Offer Declined">Offer Declined</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Confirmed Joining Date"
            type="date"
            value={offerForm.confirmed_joining_date}
            onChange={(e) => setOfferForm({ ...offerForm, confirmed_joining_date: e.target.value })}
            margin="normal"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          {offerForm.offer_status === 'Offer Declined' && (
            <TextField
              fullWidth
              label="Decline Reason *"
              multiline
              rows={2}
              value={offerForm.rejection_reason}
              onChange={(e) => setOfferForm({ ...offerForm, rejection_reason: e.target.value })}
              margin="normal"
              size="small"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOfferDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateOfferSubmit} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Update Offer Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Create Employee Action */}
      <Dialog open={createEmployeeDialog} onClose={() => setCreateEmployeeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Employee Record</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            This action will create an active employee account in the HR Employee Master linked to this candidate.
          </Typography>
          <TextField
            fullWidth
            label="Employee ID (Auto-generated if empty)"
            value={empForm.emp_id}
            onChange={(e) => setEmpForm({ ...empForm, emp_id: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Designation"
            value={empForm.designation}
            onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Department"
            value={empForm.department}
            onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
            margin="normal"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateEmployeeDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateEmployeeSubmit} variant="contained" sx={{ bgcolor: '#047857' }}>
            Create Employee Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Requisition Approve/Reject Dialog */}
      <Dialog open={approveRejectReqDialog.open} onClose={() => setApproveRejectReqDialog({ open: false, req: null, action: 'Approve' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {approveRejectReqDialog.action} Requisition: {approveRejectReqDialog.req?.job_title}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {approveRejectReqDialog.action === 'Reject' && (
            <TextField
              fullWidth
              label="Rejection Reason *"
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              margin="normal"
              size="small"
            />
          )}
          <Typography variant="body2" sx={{ color: '#475569', mt: 1 }}>
            {approveRejectReqDialog.action === 'Approve'
              ? 'Approving this requisition will allow HR to add and process candidates against this position.'
              : 'Rejecting this requisition will mark it as Rejected.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApproveRejectReqDialog({ open: false, req: null, action: 'Approve' })}>
            Cancel
          </Button>
          <Button onClick={handleApproveRejectRequisition} variant="contained" color={approveRejectReqDialog.action === 'Approve' ? 'success' : 'error'}>
            Confirm {approveRejectReqDialog.action}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
