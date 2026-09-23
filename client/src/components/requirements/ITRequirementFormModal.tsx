import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  FormHelperText,
  IconButton,
  Tooltip,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Laptop,
  User,
  Building2,
  Calendar,
  AlertCircle,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  X,
  Plus,
  HelpCircle,
  Check,
  Save,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  RequirementItem,
  ITRequirementCategory,
  ITUrgencyLevel,
  AttachmentFile,
} from '@/types/requirements';

interface ITRequirementFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Partial<RequirementItem>, isDraft: boolean) => void;
  editingItem: RequirementItem | null;
  currentUser?: { name: string; designation: string; department: string };
}

const DRAFT_STORAGE_KEY = 'crm_it_requirement_draft';

const REQUIREMENT_TYPES: { label: ITRequirementCategory; desc: string }[] = [
  { label: 'New Feature / Module', desc: 'Brand new software capability or system' },
  { label: 'Enhancement / Change', desc: 'Modification to existing feature' },
  { label: 'Bug Fix', desc: 'Fix an operational issue or system error' },
  { label: 'Hardware / Device', desc: 'Laptop, monitor, peripherals & network' },
  { label: 'Access / Permission', desc: 'System permissions, roles, email accounts' },
  { label: 'Other', desc: 'Custom IT requirement' },
];

const URGENCY_OPTIONS: { label: ITUrgencyLevel; color: string; badgeBg: string }[] = [
  { label: 'Can wait', color: '#475569', badgeBg: '#F1F5F9' },
  { label: 'Needed within 1 month', color: '#1D4ED8', badgeBg: '#DBEAFE' },
  { label: 'Needed within 2 weeks', color: '#D97706', badgeBg: '#FEF3C7' },
  { label: 'ASAP', color: '#DC2626', badgeBg: '#FEE2E2' },
];

const PRESET_TEAMS = [
  'All Employees',
  'Operations Team',
  'Sales & Marketing',
  'Finance & Accounts',
  'Engineering Team',
  'HR & Admin',
  'IT Support',
  'Logistics / Field Ops',
  'Executive Management',
];

export default function ITRequirementFormModal({
  open,
  onClose,
  onSave,
  editingItem,
  currentUser = { name: 'Admin User', designation: 'IT Manager', department: 'Operations' },
}: ITRequirementFormModalProps) {
  // Section 1: Requester Info
  const [requesterName, setRequesterName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [dateOfRequest, setDateOfRequest] = useState('');

  // Section 2: Requirement Details
  const [title, setTitle] = useState('');
  const [requirementType, setRequirementType] = useState<ITRequirementCategory>('New Feature / Module');
  const [otherRequirementType, setOtherRequirementType] = useState('');
  const [businessProblem, setBusinessProblem] = useState('');
  const [affectedUsersTeams, setAffectedUsersTeams] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<ITUrgencyLevel>('Needed within 1 month');
  const [preferredGoLiveDate, setPreferredGoLiveDate] = useState('');

  // Section 3: Process Flow
  const [stepByStepFlow, setStepByStepFlow] = useState('');
  const [hasFlowchart, setHasFlowchart] = useState<boolean>(false);
  const [flowchartFiles, setFlowchartFiles] = useState<AttachmentFile[]>([]);

  // Section 4: IT Mock-up / Preview
  const [mockupFiles, setMockupFiles] = useState<AttachmentFile[]>([]);
  const [mockupItNotes, setMockupItNotes] = useState('');
  const [mockupApproved, setMockupApproved] = useState<boolean>(true);
  const [mockupFeedback, setMockupFeedback] = useState('');

  // Section 5: Additional Requirements & Timeline
  const [hasFurtherRequirements, setHasFurtherRequirements] = useState<boolean>(false);
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [projectTimeline, setProjectTimeline] = useState('');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate or load draft on modal open
  useEffect(() => {
    if (open) {
      if (editingItem) {
        // Edit mode
        setRequesterName(editingItem.requested_by || currentUser.name);
        setDesignation(editingItem.requester_designation || currentUser.designation);
        setDepartment(editingItem.department || currentUser.department);
        setDateOfRequest(editingItem.date_of_request || editingItem.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]);
        
        setTitle(editingItem.title || '');
        setRequirementType((editingItem.requirement_type as ITRequirementCategory) || 'New Feature / Module');
        setOtherRequirementType(editingItem.other_requirement_type || '');
        setBusinessProblem(editingItem.business_problem || editingItem.justification || '');
        setAffectedUsersTeams(editingItem.affected_users_teams || []);
        setUrgency((editingItem.urgency as ITUrgencyLevel) || 'Needed within 1 month');
        setPreferredGoLiveDate(editingItem.preferred_go_live_date || editingItem.required_by_date || '');

        setStepByStepFlow(editingItem.step_by_step_flow || editingItem.specifications || '');
        setHasFlowchart(editingItem.has_flowchart ?? (editingItem.flowchart_files && editingItem.flowchart_files.length > 0) ?? false);
        setFlowchartFiles(editingItem.flowchart_files || []);

        setMockupFiles(editingItem.mockup_files || []);
        setMockupItNotes(editingItem.mockup_it_notes || editingItem.vendor_suggestion || '');
        setMockupApproved(editingItem.mockup_approved ?? true);
        setMockupFeedback(editingItem.mockup_feedback || '');

        setHasFurtherRequirements(editingItem.has_further_requirements ?? false);
        setAdditionalRequirements(editingItem.additional_requirements || '');
        setProjectTimeline(editingItem.project_timeline || '');
      } else {
        // Create mode: Check draft first
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setRequesterName(draft.requesterName || currentUser.name);
            setDesignation(draft.designation || currentUser.designation);
            setDepartment(draft.department || currentUser.department);
            setDateOfRequest(draft.dateOfRequest || new Date().toISOString().split('T')[0]);
            setTitle(draft.title || '');
            setRequirementType(draft.requirementType || 'New Feature / Module');
            setOtherRequirementType(draft.otherRequirementType || '');
            setBusinessProblem(draft.businessProblem || '');
            setAffectedUsersTeams(draft.affectedUsersTeams || []);
            setUrgency(draft.urgency || 'Needed within 1 month');
            setPreferredGoLiveDate(draft.preferredGoLiveDate || '');
            setStepByStepFlow(draft.stepByStepFlow || '');
            setHasFlowchart(draft.hasFlowchart ?? false);
            setFlowchartFiles(draft.flowchartFiles || []);
            setMockupFiles(draft.mockupFiles || []);
            setMockupItNotes(draft.mockupItNotes || '');
            setMockupApproved(draft.mockupApproved ?? true);
            setMockupFeedback(draft.mockupFeedback || '');
            setHasFurtherRequirements(draft.hasFurtherRequirements ?? false);
            setAdditionalRequirements(draft.additionalRequirements || '');
            setProjectTimeline(draft.projectTimeline || '');
          } catch {
            resetDefaults();
          }
        } else {
          resetDefaults();
        }
      }
      setErrors({});
    }
  }, [open, editingItem, currentUser]);

  const resetDefaults = () => {
    setRequesterName(currentUser.name);
    setDesignation(currentUser.designation);
    setDepartment(currentUser.department);
    setDateOfRequest(new Date().toISOString().split('T')[0]);
    setTitle('');
    setRequirementType('New Feature / Module');
    setOtherRequirementType('');
    setBusinessProblem('');
    setAffectedUsersTeams([]);
    setUrgency('Needed within 1 month');
    setPreferredGoLiveDate('');
    setStepByStepFlow('');
    setHasFlowchart(false);
    setFlowchartFiles([]);
    setMockupFiles([]);
    setMockupItNotes('');
    setMockupApproved(true);
    setMockupFeedback('');
    setHasFurtherRequirements(false);
    setAdditionalRequirements('');
    setProjectTimeline('');
  };

  // Save current form state to local draft
  const handleSaveDraftToStorage = () => {
    const draft = {
      requesterName,
      designation,
      department,
      dateOfRequest,
      title,
      requirementType,
      otherRequirementType,
      businessProblem,
      affectedUsersTeams,
      urgency,
      preferredGoLiveDate,
      stepByStepFlow,
      hasFlowchart,
      flowchartFiles,
      mockupFiles,
      mockupItNotes,
      mockupApproved,
      mockupFeedback,
      hasFurtherRequirements,
      additionalRequirements,
      projectTimeline,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  };

  // Helper file upload handler
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<AttachmentFile[]>>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentFile[] = Array.from(files).map((f) => ({
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      uploaded_at: new Date().toISOString(),
      uploaded_by: requesterName,
    }));

    setter((prev) => [...prev, ...newAttachments]);
  };

  const removeFile = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<AttachmentFile[]>>
  ) => {
    setter((prev) => prev.filter((f) => f.id !== id));
  };

  // Form Validation Rule 13
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Requirement Title / Name is required';
    }

    if (requirementType === 'Other' && !otherRequirementType.trim()) {
      errs.otherRequirementType = 'Please specify the requirement type';
    }

    if (!businessProblem.trim()) {
      errs.businessProblem = 'Business Problem / Need description is required';
    }

    if (affectedUsersTeams.length === 0) {
      errs.affectedUsersTeams = 'Please select or enter at least one affected user or team';
    }

    if (!urgency) {
      errs.urgency = 'Please select an urgency level';
    }

    if (!preferredGoLiveDate) {
      errs.preferredGoLiveDate = 'Preferred Go-Live Date is required';
    }

    if (!stepByStepFlow.trim()) {
      errs.stepByStepFlow = 'Step-by-step process flow is required';
    }

    if (hasFlowchart && flowchartFiles.length === 0) {
      errs.flowchartFiles = 'Please upload a flowchart file since "Flowchart Attached" is set to Yes';
    }

    if (!mockupApproved && !mockupFeedback.trim()) {
      errs.mockupFeedback = 'Feedback / changes required is mandatory when Mock-up is not approved';
    }

    if (hasFurtherRequirements && !additionalRequirements.trim()) {
      errs.additionalRequirements = 'Please specify the additional requirements';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (isDraftSubmit: boolean = false) => {
    if (!isDraftSubmit && !validate()) {
      return;
    }

    const payload: Partial<RequirementItem> = {
      title: title.trim(),
      category: requirementType === 'Other' ? `Other: ${otherRequirementType}` : requirementType,
      priority: urgency === 'ASAP' ? 'CRITICAL' : urgency === 'Needed within 2 weeks' ? 'HIGH' : urgency === 'Needed within 1 month' ? 'MEDIUM' : 'LOW',
      status: isDraftSubmit ? 'DRAFT' : editingItem?.status || 'SUBMITTED',
      department: department.trim() || 'Operations',
      requested_by: requesterName.trim() || currentUser.name,
      requester_designation: designation.trim() || currentUser.designation,
      date_of_request: dateOfRequest || new Date().toISOString().split('T')[0],
      required_by_date: preferredGoLiveDate || new Date().toISOString().split('T')[0],
      
      // IT specific
      requirement_type: requirementType,
      other_requirement_type: otherRequirementType.trim(),
      business_problem: businessProblem.trim(),
      justification: businessProblem.trim(),
      affected_users_teams: affectedUsersTeams,
      urgency,
      preferred_go_live_date: preferredGoLiveDate,
      step_by_step_flow: stepByStepFlow.trim(),
      specifications: stepByStepFlow.trim(),
      has_flowchart: hasFlowchart,
      flowchart_files: flowchartFiles,
      mockup_files: mockupFiles,
      mockup_it_notes: mockupItNotes.trim(),
      mockup_approved: mockupApproved,
      mockup_feedback: mockupFeedback.trim(),
      has_further_requirements: hasFurtherRequirements,
      additional_requirements: additionalRequirements.trim(),
      project_timeline: projectTimeline.trim(),

      // Retain baseline material compatibility fields
      quantity: 1,
      unit: 'System Request',
      estimated_unit_cost: 0,
      total_cost: 0,
    };

    // Clean up local draft upon successful submission
    if (!isDraftSubmit) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } else {
      handleSaveDraftToStorage();
    }

    onSave(payload, isDraftSubmit);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: '#04552B',
          color: '#ffffff',
          py: 2,
          px: 3,
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Laptop size={22} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1.1rem' }}>
              {editingItem ? `Edit IT Requirement Request (${editingItem.id})` : 'IT Requirement Request'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              KIM IT Department — Standard Requirement Requisition Form
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#ffffff' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3.5 }, bgcolor: '#F8FAFC' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {/* ── SECTION 1 — REQUESTER INFORMATION ────────────────────────────── */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: '#E2E8F0', borderRadius: '10px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 4, height: 18, bgcolor: '#04552B', borderRadius: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: 0.2 }}>
                1 — REQUESTER INFORMATION
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Requester Name *"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Operations Lead"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Department *"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Operations"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Date of Request *"
                  InputLabelProps={{ shrink: true }}
                  value={dateOfRequest}
                  onChange={(e) => setDateOfRequest(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* ── SECTION 2 — REQUIREMENT DETAILS ──────────────────────────────── */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: '#E2E8F0', borderRadius: '10px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Box sx={{ width: 4, height: 18, bgcolor: '#04552B', borderRadius: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: 0.2 }}>
                2 — REQUIREMENT DETAILS
              </Typography>
            </Box>

            <Grid container spacing={2.5}>
              {/* Requirement Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  size="medium"
                  label="Requirement Title / Name"
                  placeholder="Example: Purchase New Laptop / Create Attendance Report / Add ERP Feature"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={Boolean(errors.title)}
                  helperText={errors.title || 'Give a concise, descriptive title for your IT requirement'}
                  InputProps={{
                    sx: { fontSize: '0.98rem', fontWeight: 600 },
                  }}
                />
              </Grid>

              {/* Requirement Type Chips */}
              <Grid item xs={12}>
                <FormControl fullWidth error={Boolean(errors.requirementType)}>
                  <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', mb: 1 }}>
                    Requirement Type *
                  </FormLabel>
                  <Grid container spacing={1.5}>
                    {REQUIREMENT_TYPES.map((type) => {
                      const isSelected = requirementType === type.label;
                      return (
                        <Grid item xs={12} sm={6} md={4} key={type.label}>
                          <Paper
                            elevation={0}
                            onClick={() => setRequirementType(type.label)}
                            sx={{
                              p: 1.5,
                              cursor: 'pointer',
                              border: '1.5px solid',
                              borderColor: isSelected ? '#04552B' : '#E2E8F0',
                              bgcolor: isSelected ? '#F0FDF4' : '#ffffff',
                              borderRadius: '8px',
                              transition: 'all 0.15s ease-in-out',
                              '&:hover': {
                                borderColor: '#04552B',
                                bgcolor: '#F8FAFC',
                              },
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1.2,
                            }}
                          >
                            <Radio
                              checked={isSelected}
                              onChange={() => setRequirementType(type.label)}
                              size="small"
                              sx={{
                                color: '#94A3B8',
                                '&.Mui-checked': { color: '#04552B' },
                                p: 0,
                                mt: 0.2,
                              }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: isSelected ? '#04552B' : '#1E293B' }}>
                                {type.label}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.72rem', display: 'block' }}>
                                {type.desc}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {requirementType === 'Other' && (
                    <Box sx={{ mt: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Please specify details for 'Other' *"
                        placeholder="Specify exact custom requirement category..."
                        value={otherRequirementType}
                        onChange={(e) => setOtherRequirementType(e.target.value)}
                        error={Boolean(errors.otherRequirementType)}
                        helperText={errors.otherRequirementType}
                      />
                    </Box>
                  )}
                </FormControl>
              </Grid>

              {/* Business Problem / Need */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={3.5}
                  label="Business Problem / Need"
                  placeholder="Explain the business problem, requirement or reason for this request."
                  value={businessProblem}
                  onChange={(e) => setBusinessProblem(e.target.value)}
                  error={Boolean(errors.businessProblem)}
                  helperText={errors.businessProblem || 'Describe what operational issue this solves or what efficiency it enables.'}
                />
              </Grid>

              {/* Affected Users / Teams */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={PRESET_TEAMS}
                  value={affectedUsersTeams}
                  onChange={(_, newValue) => setAffectedUsersTeams(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                        sx={{ bgcolor: '#F1F5F9', color: '#04552B', fontWeight: 600 }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Affected Users / Teams *"
                      placeholder="Select or type teams/employees..."
                      error={Boolean(errors.affectedUsersTeams)}
                      helperText={errors.affectedUsersTeams || 'Who will use or be impacted by this request?'}
                    />
                  )}
                />
              </Grid>

              {/* Preferred Go-Live Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  size="small"
                  label="Preferred Go-Live Date *"
                  InputLabelProps={{ shrink: true }}
                  value={preferredGoLiveDate}
                  onChange={(e) => setPreferredGoLiveDate(e.target.value)}
                  error={Boolean(errors.preferredGoLiveDate)}
                  helperText={errors.preferredGoLiveDate || 'Select target implementation date'}
                />
              </Grid>

              {/* Urgency */}
              <Grid item xs={12}>
                <FormControl fullWidth error={Boolean(errors.urgency)}>
                  <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', mb: 1 }}>
                    Urgency *
                  </FormLabel>
                  <Grid container spacing={1.5}>
                    {URGENCY_OPTIONS.map((opt) => {
                      const isSelected = urgency === opt.label;
                      return (
                        <Grid item xs={6} sm={3} key={opt.label}>
                          <Paper
                            elevation={0}
                            onClick={() => setUrgency(opt.label)}
                            sx={{
                              p: 1.5,
                              cursor: 'pointer',
                              border: '1.5px solid',
                              borderColor: isSelected ? opt.color : '#E2E8F0',
                              bgcolor: isSelected ? opt.badgeBg : '#ffffff',
                              borderRadius: '8px',
                              textAlign: 'center',
                              transition: 'all 0.15s ease-in-out',
                              '&:hover': {
                                borderColor: opt.color,
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: isSelected ? opt.color : '#475569',
                                fontSize: '0.85rem',
                              }}
                            >
                              {opt.label}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                  {errors.urgency && <FormHelperText>{errors.urgency}</FormHelperText>}
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* ── SECTION 3 — PROCESS FLOW (BY REQUESTER) ──────────────────────── */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: '#E2E8F0', borderRadius: '10px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 4, height: 18, bgcolor: '#04552B', borderRadius: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: 0.2 }}>
                3 — PROCESS FLOW
              </Typography>
            </Box>

            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Step-by-step Flow *"
                  placeholder={`Describe the current or proposed process step by step.\n\nExample:\n1. Employee submits request\n2. Manager approves\n3. IT verifies request\n4. IT processes the requirement\n5. User receives confirmation`}
                  value={stepByStepFlow}
                  onChange={(e) => setStepByStepFlow(e.target.value)}
                  error={Boolean(errors.stepByStepFlow)}
                  helperText={errors.stepByStepFlow || 'List out steps so IT understands the user workflow clearly'}
                />
              </Grid>

              {/* Flowchart Attached Toggle */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                    Flowchart Attached?
                  </FormLabel>
                  <RadioGroup
                    row
                    value={hasFlowchart ? 'yes' : 'no'}
                    onChange={(e) => setHasFlowchart(e.target.value === 'yes')}
                  >
                    <FormControlLabel value="no" control={<Radio size="small" sx={{ color: '#04552B', '&.Mui-checked': { color: '#04552B' } }} />} label="No" />
                    <FormControlLabel value="yes" control={<Radio size="small" sx={{ color: '#04552B', '&.Mui-checked': { color: '#04552B' } }} />} label="Yes" />
                  </RadioGroup>
                </FormControl>

                {hasFlowchart && (
                  <Box sx={{ mt: 1.5, p: 2, border: '1px dashed #CBD5E1', borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                      Upload Flowchart (Diagram, PDF, Image) *
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload size={16} />}
                      size="small"
                      sx={{ color: '#04552B', borderColor: '#04552B', textTransform: 'none', fontWeight: 600 }}
                    >
                      Upload Flowchart
                      <input type="file" hidden multiple onChange={(e) => handleFileUpload(e, setFlowchartFiles)} />
                    </Button>
                    {errors.flowchartFiles && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        {errors.flowchartFiles}
                      </Typography>
                    )}

                    {/* Flowchart Files List */}
                    {flowchartFiles.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5 }}>
                        {flowchartFiles.map((file) => (
                          <Paper
                            key={file.id}
                            variant="outlined"
                            sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#ffffff' }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FileText size={18} color="#04552B" />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {file.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {(file.size / 1024).toFixed(1)} KB • {file.uploaded_by}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton size="small" onClick={() => removeFile(file.id, setFlowchartFiles)} sx={{ color: '#DC2626' }}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* ── SECTION 4 — IT MOCK-UP / SCREEN PREVIEW ──────────────────────── */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: '#E2E8F0', borderRadius: '10px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 4, height: 18, bgcolor: '#04552B', borderRadius: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: 0.2 }}>
                4 — IT MOCK-UP / SCREEN PREVIEW
              </Typography>
            </Box>

            <Grid container spacing={2.5}>
              {/* Mockup file upload */}
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1E293B' }}>
                  Mock-up Reference / Attachments
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<Upload size={16} />}
                  size="small"
                  sx={{ color: '#04552B', borderColor: '#04552B', textTransform: 'none', fontWeight: 600 }}
                >
                  Upload Mock-up / Reference File
                  <input type="file" hidden multiple onChange={(e) => handleFileUpload(e, setMockupFiles)} />
                </Button>

                {mockupFiles.length > 0 && (
                  <Grid container spacing={1.5} sx={{ mt: 1 }}>
                    {mockupFiles.map((file) => (
                      <Grid item xs={12} sm={6} key={file.id}>
                        <Paper variant="outlined" sx={{ p: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F8FAFC' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <FileText size={18} color="#04552B" />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                {file.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {(file.size / 1024).toFixed(1)} KB
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton size="small" onClick={() => removeFile(file.id, setMockupFiles)} sx={{ color: '#DC2626' }}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Grid>

              {/* IT Notes on Mockup */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2.5}
                  label="IT Notes on Mock-up"
                  placeholder="IT team can record observations, technical notes, questions or implementation comments."
                  value={mockupItNotes}
                  onChange={(e) => setMockupItNotes(e.target.value)}
                />
              </Grid>

              {/* Mockup Approved toggle */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                    Mock-up Approved by Requester?
                  </FormLabel>
                  <RadioGroup
                    row
                    value={mockupApproved ? 'yes' : 'no'}
                    onChange={(e) => setMockupApproved(e.target.value === 'yes')}
                  >
                    <FormControlLabel value="yes" control={<Radio size="small" sx={{ color: '#04552B', '&.Mui-checked': { color: '#04552B' } }} />} label="Yes" />
                    <FormControlLabel value="no" control={<Radio size="small" sx={{ color: '#04552B', '&.Mui-checked': { color: '#04552B' } }} />} label="No" />
                  </RadioGroup>
                </FormControl>

                {!mockupApproved && (
                  <Box sx={{ mt: 1.5 }}>
                    <TextField
                      fullWidth
                      required
                      multiline
                      rows={2.5}
                      label="Feedback / Changes Required *"
                      placeholder="Please provide feedback / changes required."
                      value={mockupFeedback}
                      onChange={(e) => setMockupFeedback(e.target.value)}
                      error={Boolean(errors.mockupFeedback)}
                      helperText={errors.mockupFeedback}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* ── SECTION 5 — ADDITIONAL REQUIREMENTS & PROJECT TIMELINE ────────── */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: '#E2E8F0', borderRadius: '10px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 4, height: 18, bgcolor: '#04552B', borderRadius: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: 0.2 }}>
                5 — ADDITIONAL REQUIREMENTS & PROJECT TIMELINE
              </Typography>
            </Box>

            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                    Are there further requirements?
                  </FormLabel>
                  <RadioGroup
                    row
                    value={hasFurtherRequirements ? 'yes' : 'no'}
                    onChange={(e) => setHasFurtherRequirements(e.target.value === 'yes')}
                  >
                    <FormControlLabel value="no" control={<Radio size="small" sx={{ color: '#04552B', '&.Mui-checked': { color: '#04552B' } }} />} label="No — this form is complete" />
                    <FormControlLabel value="yes" control={<Radio size="small" sx={{ color: '#04552B', '&.Mui-checked': { color: '#04552B' } }} />} label="Yes" />
                  </RadioGroup>
                </FormControl>

                {hasFurtherRequirements && (
                  <Box sx={{ mt: 1.5 }}>
                    <TextField
                      fullWidth
                      required
                      multiline
                      rows={2.5}
                      label="Additional Requirements *"
                      placeholder="Describe any additional integration, report, security or hardware requirements..."
                      value={additionalRequirements}
                      onChange={(e) => setAdditionalRequirements(e.target.value)}
                      error={Boolean(errors.additionalRequirements)}
                      helperText={errors.additionalRequirements}
                    />
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2.5}
                  label="Project Timeline"
                  placeholder={`Example:\nRequirement discussion → IT analysis → Development → Testing → User approval → Go-live`}
                  value={projectTimeline}
                  onChange={(e) => setProjectTimeline(e.target.value)}
                  helperText="Describe expected phases, dependencies, milestones or target dates."
                />
              </Grid>
            </Grid>
          </Paper>

          {/* ── SECTION 6 & 7 — APPROVALS & SIGN-OFF PREVIEW ──────────────────── */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: '#E2E8F0', borderRadius: '10px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 4, height: 18, bgcolor: '#04552B', borderRadius: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: 0.2 }}>
                7 — APPROVALS & SIGN-OFF
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {/* Block A: RAISED BY */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F0FDF4', borderColor: '#BBF7D0', borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803D', display: 'block', mb: 0.5 }}>
                    A. RAISED BY (Requester)
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {requesterName || currentUser.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    {designation || currentUser.designation}
                  </Typography>
                  <Chip label="Auto Signed" size="small" sx={{ mt: 1, height: 20, fontSize: '0.65rem', bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700 }} />
                </Paper>
              </Grid>

              {/* Block B: APPROVED BY */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.5 }}>
                    B. APPROVED BY (Manager)
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8' }}>
                    Pending Submission
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Direct Manager Review
                  </Typography>
                </Paper>
              </Grid>

              {/* Block C: IT MANAGER REVIEW */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.5 }}>
                    C. IT MANAGER REVIEW
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8' }}>
                    Pending Manager Stage
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    IT Feasibility Check
                  </Typography>
                </Paper>
              </Grid>

              {/* Block D: DEPARTMENT HEAD */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.5 }}>
                    D. DEPARTMENT HEAD
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8' }}>
                    Final Sign-Off
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Executive Approval
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #E2E8F0', gap: 1.5 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          startIcon={<Save size={16} />}
          onClick={() => handleSubmit(true)}
          sx={{ borderColor: '#CBD5E1', color: '#334155', textTransform: 'none', fontWeight: 600 }}
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          startIcon={<Check size={16} />}
          onClick={() => handleSubmit(false)}
          sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontWeight: 700, px: 3 }}
        >
          {editingItem ? 'Save Changes' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
