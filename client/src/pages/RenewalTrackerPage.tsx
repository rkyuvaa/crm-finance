import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  InputAdornment,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Menu,
} from '@mui/material';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Upload,
  Download,
  Pencil,
  Trash2,
  BellRing,
  Mail,
  Sliders,
  FolderCog,
  Code2,
  MoreVertical,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

export interface RenewalItem {
  id: number;
  item_service: string;
  description: string;
  category: string;
  department: string;
  branch_location: string;
  start_date: string;
  due_date: string;
  last_renewed_date: string;
  reminder_days: number;
  renewal_owner: string;
  remarks: string;
  cost?: number;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED';
}

interface CategoryConfig {
  id: number;
  name: string;
  color: string;
  default_validity_months: number;
  default_reminder_days: number;
  is_active: boolean;
}

interface MailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
}

const DEPARTMENTS = [
  'Logistics & Fleet',
  'IT & Infrastructure',
  'Legal & Statutory',
  'Operations',
  'HR & Admin',
  'Finance & Accounts',
  'Maintenance & Equipment',
];

const BRANCH_LOCATIONS = [
  'Bangalore HQ',
  'Chennai Hub',
  'Hyderabad Depot',
  'Mumbai West',
  'Delhi North',
  'Kolkata East',
];

// No demo data rule: starts as empty array []
const INITIAL_RENEWALS: RenewalItem[] = [];

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 1, name: 'Insurance', color: '#2563EB', default_validity_months: 12, default_reminder_days: 30, is_active: true },
  { id: 2, name: 'Fitness Certificate', color: '#D97706', default_validity_months: 12, default_reminder_days: 30, is_active: true },
  { id: 3, name: 'Permit', color: '#059669', default_validity_months: 60, default_reminder_days: 30, is_active: true },
  { id: 4, name: 'Pollution (PUC)', color: '#DC2626', default_validity_months: 6, default_reminder_days: 15, is_active: true },
  { id: 5, name: 'Road Tax', color: '#7C3AED', default_validity_months: 12, default_reminder_days: 15, is_active: true },
  { id: 6, name: 'Software License', color: '#087A3D', default_validity_months: 12, default_reminder_days: 45, is_active: true },
  { id: 7, name: 'AMC & Maintenance', color: '#475569', default_validity_months: 12, default_reminder_days: 30, is_active: true },
  { id: 8, name: 'Building Lease', color: '#EA580C', default_validity_months: 36, default_reminder_days: 60, is_active: true },
];

const DEFAULT_MAIL_TEMPLATES: Record<string, MailTemplate> = {
  reminder: {
    id: 'reminder',
    title: 'Upcoming Renewal Alert (Advance Warning)',
    subject: 'Renewal Reminder: {{item_service}} ({{category}}) due on {{due_date}}',
    body: `Dear {{renewal_owner}},

This is an automated system reminder that the following renewal item is coming due shortly:

Renewal Item / Service: {{item_service}}
Description: {{description}}
Category: {{category}}
Department: {{department}}
Branch / Location: {{branch_location}}
Renewal Due Date: {{due_date}}
Days Remaining: {{days_remaining}} days
Last Renewed Date: {{last_renewed_date}}
Renewal Owner: {{renewal_owner}}

Remarks / Notes:
{{remarks}}

Please initiate the renewal process prior to the due date to avoid service disruption or non-compliance.

Best regards,
Enterprise Renewal Management System`,
  },
  critical: {
    id: 'critical',
    title: 'Urgent Due Alert (Critical Warning)',
    subject: 'URGENT: {{item_service}} due in {{days_remaining}} days!',
    body: `ATTENTION: CRITICAL RENEWAL WARNING

The compliance item "{{item_service}}" is expiring in less than 7 days.

Department: {{department}}
Branch / Location: {{branch_location}}
Renewal Due Date: {{due_date}}
Owner: {{renewal_owner}}

Please process immediately to prevent statutory penalties or operational downtime.

Regards,
Compliance Department`,
  },
  overdue: {
    id: 'overdue',
    title: 'Overdue Expiry Alert (Post Due Date)',
    subject: 'EXPIRED ALERT: {{item_service}} ({{category}}) expired on {{due_date}}',
    body: `NOTICE OF OVERDUE COMPLIANCE ITEM

The renewal for {{item_service}} has EXPIRED on {{due_date}}.

Department: {{department}}
Location: {{branch_location}}
Owner: {{renewal_owner}}

This item is currently flagged as OVERDUE / NON-COMPLIANT. Please complete the renewal and record updated details immediately.

Regards,
Enterprise Admin`,
  },
  renewed: {
    id: 'renewed',
    title: 'Renewal Confirmation Notification',
    subject: 'CONFIRMED: {{item_service}} successfully renewed',
    body: `RENEWAL CONFIRMATION

The renewal process for {{item_service}} has been marked as COMPLETED.

Department: {{department}}
Next Due Date: {{due_date}}
Updated By: {{renewal_owner}}

Thank you for maintaining enterprise compliance standards.`,
  },
};

/** Helper to calculate days remaining dynamically from due_date */
function getDaysRemaining(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function RenewalTrackerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [renewals, setRenewals] = useState<RenewalItem[]>(INITIAL_RENEWALS);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [mailTemplates, setMailTemplates] = useState<Record<string, MailTemplate>>(DEFAULT_MAIL_TEMPLATES);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('reminder');

  // 3-Dots Action Menu State
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ element: HTMLElement; item: RenewalItem } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Config SubTab State
  const [configSubTab, setConfigSubTab] = useState<'categories' | 'reminders' | 'templates' | 'rules'>('categories');
  const [advanceDaysList, setAdvanceDaysList] = useState<string>('60, 30, 15, 7, 1');
  const [emailFrequency, setEmailFrequency] = useState<string>('DAILY_DIGEST');
  const [autoEscalateOverdue, setAutoEscalateOverdue] = useState<boolean>(true);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState<boolean>(true);
  const [requireOwner, setRequireOwner] = useState<boolean>(true);
  const [autoCalcNextDue, setAutoCalcNextDue] = useState<boolean>(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#2563EB');
  const [catValidityMonths, setCatValidityMonths] = useState(12);
  const [catReminderDays, setCatReminderDays] = useState(30);

  // Item Modal State (Add / Edit 12 Fields)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [itemService, setItemService] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Insurance');
  const [department, setDepartment] = useState<string>('Logistics & Fleet');
  const [branchLocation, setBranchLocation] = useState<string>('Bangalore HQ');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lastRenewedDate, setLastRenewedDate] = useState('');
  const [reminderDays, setReminderDays] = useState<number>(30);
  const [renewalOwner, setRenewalOwner] = useState('');
  const [remarks, setRemarks] = useState('');
  const [cost, setCost] = useState<number | ''>('');

  // Active Tab from URL
  const currentTab = location.pathname.endsWith('/tracker')
    ? 'tracker'
    : location.pathname.endsWith('/reports')
    ? 'reports'
    : location.pathname.endsWith('/configuration')
    ? 'configuration'
    : 'dashboard';

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, item: RenewalItem) => {
    setActionMenuAnchor({ element: event.currentTarget, item });
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
  };

  const handleOpenModal = (item?: RenewalItem) => {
    if (item) {
      setEditingId(item.id);
      setItemService(item.item_service);
      setDescription(item.description || '');
      setCategory(item.category);
      setDepartment(item.department || 'Logistics & Fleet');
      setBranchLocation(item.branch_location || 'Bangalore HQ');
      setStartDate(item.start_date || '');
      setDueDate(item.due_date);
      setLastRenewedDate(item.last_renewed_date || '');
      setReminderDays(item.reminder_days || 30);
      setRenewalOwner(item.renewal_owner || '');
      setRemarks(item.remarks || '');
      setCost(item.cost || '');
    } else {
      setEditingId(null);
      setItemService('');
      setDescription('');
      setCategory('Insurance');
      setDepartment('Logistics & Fleet');
      setBranchLocation('Bangalore HQ');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setLastRenewedDate('');
      setReminderDays(30);
      setRenewalOwner('');
      setRemarks('');
      setCost('');
    }
    setModalOpen(true);
  };

  const handleSaveRenewal = () => {
    if (!itemService.trim() || !dueDate) {
      showToast('Renewal Item / Service name and Renewal Due Date are mandatory', 'error');
      return;
    }

    const daysLeft = getDaysRemaining(dueDate);
    let calculatedStatus: RenewalItem['status'] = 'ACTIVE';
    if (daysLeft < 0) {
      calculatedStatus = 'EXPIRED';
    } else if (daysLeft <= reminderDays) {
      calculatedStatus = 'EXPIRING_SOON';
    }

    if (editingId) {
      setRenewals((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                item_service: itemService.trim(),
                description: description.trim(),
                category,
                department,
                branch_location: branchLocation,
                start_date: startDate,
                due_date: dueDate,
                last_renewed_date: lastRenewedDate,
                reminder_days: Number(reminderDays),
                renewal_owner: renewalOwner.trim(),
                remarks: remarks.trim(),
                cost: cost ? Number(cost) : 0,
                status: calculatedStatus,
              }
            : r,
        ),
      );
      showToast('Renewal item updated successfully', 'success');
    } else {
      const newItem: RenewalItem = {
        id: Date.now(),
        item_service: itemService.trim(),
        description: description.trim(),
        category,
        department,
        branch_location: branchLocation,
        start_date: startDate || new Date().toISOString().split('T')[0],
        due_date: dueDate,
        last_renewed_date: lastRenewedDate || 'N/A',
        reminder_days: Number(reminderDays),
        renewal_owner: renewalOwner.trim() || 'System Admin',
        remarks: remarks.trim(),
        cost: cost ? Number(cost) : 0,
        status: calculatedStatus,
      };
      setRenewals((prev) => [newItem, ...prev]);
      showToast('New renewal item created successfully', 'success');
    }

    setModalOpen(false);
  };

  const handleMarkRenewed = (id: number) => {
    setRenewals((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const todayStr = new Date().toISOString().split('T')[0];
          const nextDue = new Date(r.due_date || Date.now());
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          return {
            ...r,
            last_renewed_date: todayStr,
            start_date: todayStr,
            due_date: nextDue.toISOString().split('T')[0],
            status: 'RENEWED',
          };
        }
        return r;
      }),
    );
    showToast('Marked as renewed! Updated last renewed date & calculated next due date.', 'success');
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this renewal record?')) {
      setRenewals((prev) => prev.filter((r) => r.id !== id));
      showToast('Renewal record deleted', 'info');
    }
  };

  // Category Modal Handlers
  const handleOpenCatModal = (cat?: CategoryConfig) => {
    if (cat) {
      setEditingCatId(cat.id);
      setCatName(cat.name);
      setCatColor(cat.color);
      setCatValidityMonths(cat.default_validity_months);
      setCatReminderDays(cat.default_reminder_days);
    } else {
      setEditingCatId(null);
      setCatName('');
      setCatColor('#2563EB');
      setCatValidityMonths(12);
      setCatReminderDays(30);
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) {
      showToast('Category name is mandatory', 'error');
      return;
    }
    if (editingCatId) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCatId
            ? {
                ...c,
                name: catName.trim(),
                color: catColor,
                default_validity_months: catValidityMonths,
                default_reminder_days: catReminderDays,
              }
            : c,
        ),
      );
      showToast('Renewal category updated', 'success');
    } else {
      const newCat: CategoryConfig = {
        id: Date.now(),
        name: catName.trim(),
        color: catColor,
        default_validity_months: catValidityMonths,
        default_reminder_days: catReminderDays,
        is_active: true,
      };
      setCategories((prev) => [...prev, newCat]);
      showToast('New renewal category added', 'success');
    }
    setCatModalOpen(false);
  };

  const handleToggleCatActive = (id: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c)),
    );
    showToast('Category status updated', 'info');
  };

  const handleDeleteCat = (id: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Category removed', 'info');
    }
  };

  // Filtered List
  const filteredRenewals = renewals.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.item_service.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.renewal_owner && r.renewal_owner.toLowerCase().includes(q)) ||
      (r.branch_location && r.branch_location.toLowerCase().includes(q)) ||
      (r.remarks && r.remarks.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesDepartment = departmentFilter === 'ALL' || r.department === departmentFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesCategory && matchesDepartment && matchesStatus;
  });

  // Metrics
  const totalCount = renewals.length;
  const expiringSoonCount = renewals.filter((r) => {
    const days = getDaysRemaining(r.due_date);
    return days >= 0 && days <= r.reminder_days;
  }).length;
  const expiredCount = renewals.filter((r) => getDaysRemaining(r.due_date) < 0).length;
  const activeCount = totalCount - expiredCount - expiringSoonCount;

  const renderDaysRemainingChip = (dueDateStr: string) => {
    const days = getDaysRemaining(dueDateStr);
    if (days < 0) {
      return (
        <Chip
          label={`${Math.abs(days)}d Overdue`}
          size="small"
          sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700, borderRadius: '4px', fontSize: 10.5, height: 22 }}
        />
      );
    } else if (days <= 30) {
      return (
        <Chip
          label={`${days}d Left`}
          size="small"
          sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700, borderRadius: '4px', fontSize: 10.5, height: 22 }}
        />
      );
    } else {
      return (
        <Chip
          label={`${days}d Left`}
          size="small"
          sx={{ bgcolor: '#EAF6E8', color: '#04552B', fontWeight: 700, borderRadius: '4px', fontSize: 10.5, height: 22 }}
        />
      );
    }
  };

  return (
    <Box sx={{ p: 2.5, width: '100%', boxSizing: 'border-box' }}>
      {/* Top Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Upload size={16} />}
          onClick={() => showToast('Import format ready for 12 renewal fields', 'info')}
          sx={{ borderColor: '#cbd5e1', color: '#334155', borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 13 }}
        >
          Import
        </Button>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => handleOpenModal()}
          sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 13 }}
        >
          New Renewal Item / Service
        </Button>
      </Box>

      {/* ── TAB 1: RENEWAL DASHBOARD ───────────────────────────────────────── */}
      {currentTab === 'dashboard' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Critical Alerts Banner */}
          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: expiredCount > 0 ? '#FEF2F2' : '#FFFBEB',
                border: '1px solid',
                borderColor: expiredCount > 0 ? '#FCA5A5' : '#FCD34D',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AlertTriangle size={20} color={expiredCount > 0 ? '#DC2626' : '#D97706'} />
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: expiredCount > 0 ? '#991B1B' : '#92400E' }}>
                    Attention Required: {expiredCount} Expired & {expiringSoonCount} Expiring Soon Items
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: expiredCount > 0 ? '#B91C1C' : '#B45309' }}>
                    Action required to avoid compliance non-conformity or service downtime.
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate('/renewal/tracker')}
                sx={{
                  backgroundColor: expiredCount > 0 ? '#DC2626' : '#D97706',
                  '&:hover': { backgroundColor: expiredCount > 0 ? '#B91C1C' : '#B45309' },
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '6px',
                }}
              >
                View Renewal Tracker
              </Button>
            </Paper>
          )}

          {/* Metric KPI Cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 0.8, borderRadius: '8px', backgroundColor: '#EAF6E8', color: '#04552B' }}>
                    <ShieldCheck size={18} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600, fontSize: 12.5 }}>
                    Total Renewal Items
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#023020' }}>
                  {totalCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#7A8B80' }}>
                  Across all departments & branches
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 0.8, borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706' }}>
                    <BellRing size={18} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600, fontSize: 12.5 }}>
                    Expiring Soon (&lt;30 Days)
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#D97706' }}>
                  {expiringSoonCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>
                  Reminder lead alerts active
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 0.8, borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                    <AlertCircle size={18} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600, fontSize: 12.5 }}>
                    Expired Overdue
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#DC2626' }}>
                  {expiredCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 600 }}>
                  Action mandatory
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 0.8, borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                    <CheckCircle2 size={18} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600, fontSize: 12.5 }}>
                    Active & Compliant
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803D' }}>
                  {activeCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600 }}>
                  Compliance: {totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Priority Services Table */}
          <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#023020', mb: 1.5 }}>
              Priority Renewal Services Overview
            </Typography>
            {renewals.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#7A8B80' }}>
                <Typography variant="body2">No renewal items found. Click 'New Renewal Item / Service' above to add your first record.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#F8FAF7' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Renewal Item / Service</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Renewal Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Branch / Location</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Renewal Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Days Remaining (Auto-calculated)</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Renewal Owner</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#44584C' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renewals.slice(0, 5).map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: '#16231B' }}>{row.item_service}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#7A8B80' }}>{row.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.category} size="small" variant="outlined" sx={{ fontSize: 10.5, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#44584C' }}>{row.branch_location}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600, color: getDaysRemaining(row.due_date) < 0 ? '#DC2626' : '#16231B' }}>
                        {row.due_date}
                      </TableCell>
                      <TableCell>{renderDaysRemainingChip(row.due_date)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{row.renewal_owner}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => handleOpenActionMenu(e, row)}>
                          <MoreVertical size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Box>
      )}

      {/* ── TAB 2: RENEWAL TRACKER GRID (SINGLE SCREEN FULL FIT, EXACT 12 COLUMNS, 3-DOTS ACTION) ── */}
      {currentTab === 'tracker' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Filter Controls Bar */}
          <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search item, description, owner, branch, remarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={15} color="#7A8B80" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiInputBase-input': { fontSize: 12.5 } }}
                />
              </Grid>

              <Grid item xs={6} sm={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 12.5 }}>Renewal Category</InputLabel>
                  <Select value={categoryFilter} label="Renewal Category" onChange={(e) => setCategoryFilter(e.target.value)} sx={{ fontSize: 12.5 }}>
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.name}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 12.5 }}>Department</InputLabel>
                  <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)} sx={{ fontSize: 12.5 }}>
                    <MenuItem value="ALL">All Departments</MenuItem>
                    {DEPARTMENTS.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 12.5 }}>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 12.5 }}>
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="EXPIRING_SOON">Expiring Soon</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                    <MenuItem value="RENEWED">Renewed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    setDepartmentFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  sx={{ textTransform: 'none', color: '#7A8B80', borderColor: '#CBD5E1', fontSize: 11.5, px: 1 }}
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Main Revamped Tracker Table */}
          <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', overflowX: 'auto', width: '100%', bgcolor: '#FFFFFF' }}>
            <Table size="medium" sx={{ minWidth: 1550, tableLayout: 'auto' }}>
              <TableHead sx={{ backgroundColor: '#F8FAF7' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 220 }}>Renewal Item / Service</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 180 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 130 }}>Renewal Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 140 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 140 }}>Branch / Location</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 110 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 125 }}>Renewal Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 150 }}>Days Remaining (Auto-calculated)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 125 }}>Last Renewed Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 120 }}>Reminder Lead Time (Days)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 140 }}>Renewal Owner</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1.5, py: 1.5, minWidth: 180 }}>Remarks / Notes</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#44584C', fontSize: 12.5, px: 1, py: 1.5, minWidth: 80 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRenewals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 6, color: '#7A8B80' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#64748B' }}>
                        No renewal items found. Click 'New Renewal Item / Service' to create a new record.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRenewals.map((r) => (
                    <TableRow key={r.id} hover sx={{ '& td': { px: 1.5, py: 1.2 } }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#16231B' }}>
                          {r.item_service}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: '#64748B', whiteSpace: 'normal' }}>
                          {r.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={r.category} size="small" sx={{ fontWeight: 600, fontSize: 11, bgcolor: '#F1F5F9' }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                          {r.department || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: '#475569' }}>
                          {r.branch_location || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: '#44584C' }}>{r.start_date || 'N/A'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: getDaysRemaining(r.due_date) < 0 ? '#DC2626' : '#16231B' }}>
                        {r.due_date}
                      </TableCell>
                      <TableCell>{renderDaysRemainingChip(r.due_date)}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: '#44584C' }}>{r.last_renewed_date || 'N/A'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>{r.reminder_days} Days</TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#04552B' }}>
                          {r.renewal_owner || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: '#64748B', whiteSpace: 'normal' }}>
                          {r.remarks || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={(e) => handleOpenActionMenu(e, r)} sx={{ p: 0.8 }}>
                          <MoreVertical size={18} color="#475569" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* 3-Dots Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor?.element}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
        slotProps={{
          paper: {
            sx: {
              border: '1px solid #E4EBE1',
              borderRadius: '8px',
              minWidth: 150,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (actionMenuAnchor) handleMarkRenewed(actionMenuAnchor.item.id);
            handleCloseActionMenu();
          }}
          sx={{ fontSize: 12.5, fontWeight: 600, color: '#04552B', py: 1 }}
        >
          <CheckCircle2 size={14} style={{ marginRight: 8 }} />
          Mark Renewed
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionMenuAnchor) handleOpenModal(actionMenuAnchor.item);
            handleCloseActionMenu();
          }}
          sx={{ fontSize: 12.5, fontWeight: 600, color: '#2563EB', py: 1 }}
        >
          <Pencil size={14} style={{ marginRight: 8 }} />
          Edit Record
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionMenuAnchor) handleDelete(actionMenuAnchor.item.id);
            handleCloseActionMenu();
          }}
          sx={{ fontSize: 12.5, fontWeight: 600, color: '#DC2626', py: 1 }}
        >
          <Trash2 size={14} style={{ marginRight: 8 }} />
          Delete Record
        </MenuItem>
      </Menu>

      {/* ── TAB 3: REPORTS & ANALYTICS ────────────────────────────────────── */}
      {currentTab === 'reports' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 2 }}>
                  Category Renewal Distribution
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {categories.slice(0, 6).map((c) => {
                    const catItems = renewals.filter((r) => r.category === c.name);
                    const pct = totalCount > 0 ? Math.round((catItems.length / totalCount) * 100) : 0;
                    return (
                      <Box key={c.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#16231B' }}>{c.name}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#023020' }}>
                            {catItems.length} Items ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#F1F5F9',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: c.color || '#04552B',
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 2 }}>
                  Compliance & Renewal Audit Summary
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#F8FAF7', borderRadius: '10px', border: '1px solid #E4EBE1', mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#023020', mb: 0.5 }}>
                    Enterprise Statutory Compliance Rating
                  </Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#04552B' }}>
                    {totalCount > 0 ? Math.round(((totalCount - expiredCount) / totalCount) * 100) : 100}%
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#7A8B80' }}>
                    Calculated on Active / Valid Items vs Overdue Expiries across all branches.
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  onClick={() => showToast('Full 12-Field Renewal Compliance Audit Exported (.CSV)', 'success')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#04552B', color: '#04552B' }}
                >
                  Download Full Compliance Audit Report (.CSV)
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── TAB 4: RENEWAL CONFIGURATION ──────────────────────────────────── */}
      {currentTab === 'configuration' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 1.5, bgcolor: '#F8FAF7' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={configSubTab === 'categories' ? 'contained' : 'text'}
                onClick={() => setConfigSubTab('categories')}
                startIcon={<FolderCog size={15} />}
                sx={{
                  backgroundColor: configSubTab === 'categories' ? '#04552B' : 'transparent',
                  color: configSubTab === 'categories' ? '#FFFFFF' : '#44584C',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '6px',
                }}
              >
                Categories Config
              </Button>
              <Button
                size="small"
                variant={configSubTab === 'reminders' ? 'contained' : 'text'}
                onClick={() => setConfigSubTab('reminders')}
                startIcon={<BellRing size={15} />}
                sx={{
                  backgroundColor: configSubTab === 'reminders' ? '#04552B' : 'transparent',
                  color: configSubTab === 'reminders' ? '#FFFFFF' : '#44584C',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '6px',
                }}
              >
                Reminder Policy & Days
              </Button>
              <Button
                size="small"
                variant={configSubTab === 'templates' ? 'contained' : 'text'}
                onClick={() => setConfigSubTab('templates')}
                startIcon={<Mail size={15} />}
                sx={{
                  backgroundColor: configSubTab === 'templates' ? '#04552B' : 'transparent',
                  color: configSubTab === 'templates' ? '#FFFFFF' : '#44584C',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '6px',
                }}
              >
                Mail Notification Templates
              </Button>
              <Button
                size="small"
                variant={configSubTab === 'rules' ? 'contained' : 'text'}
                onClick={() => setConfigSubTab('rules')}
                startIcon={<Sliders size={15} />}
                sx={{
                  backgroundColor: configSubTab === 'rules' ? '#04552B' : 'transparent',
                  color: configSubTab === 'rules' ? '#FFFFFF' : '#44584C',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '6px',
                }}
              >
                Compliance Rules & Setup
              </Button>
            </Box>
          </Paper>

          {/* Sub-Tab 1: Categories Configuration */}
          {configSubTab === 'categories' && (
            <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020' }}>
                    Renewal Category Master
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#667A6D' }}>
                    Configure categories, default validity terms, and advance reminder lead times.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => handleOpenCatModal()}
                  sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                >
                  Add Category
                </Button>
              </Box>

              <Table size="small">
                <TableHead sx={{ backgroundColor: '#F8FAF7' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Category Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Color Badge</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Default Validity (Months)</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Default Advance Reminder</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#44584C' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#16231B' }}>{c.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.color }} />
                          <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{c.color}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{c.default_validity_months} Months</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{c.default_reminder_days} Days Before Expiry</TableCell>
                      <TableCell>
                        <Switch size="small" checked={c.is_active} onChange={() => handleToggleCatActive(c.id)} color="success" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenCatModal(c)} sx={{ color: '#3B82F6' }}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteCat(c.id)} sx={{ color: '#EF4444' }}>
                          <Trash2 size={15} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* Sub-Tab 2: Reminder & Notification Policy */}
          {configSubTab === 'reminders' && (
            <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 1 }}>
                Advance Reminder Lead Time & Escalation Policy
              </Typography>
              <Typography variant="body2" sx={{ color: '#667A6D', mb: 3 }}>
                Configure trigger lead times and escalation rules for upcoming or overdue renewals.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Advance Alert Trigger Days (Comma-separated)"
                    fullWidth
                    size="small"
                    value={advanceDaysList}
                    onChange={(e) => setAdvanceDaysList(e.target.value)}
                    helperText="Triggers advance email alerts at X days prior to due date (e.g. 60, 30, 15, 7, 1)"
                    sx={{ mb: 2.5 }}
                  />

                  <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
                    <InputLabel>Email Notification Frequency</InputLabel>
                    <Select value={emailFrequency} label="Email Notification Frequency" onChange={(e) => setEmailFrequency(e.target.value)}>
                      <MenuItem value="DAILY_DIGEST">Daily Morning Digest (08:00 AM)</MenuItem>
                      <MenuItem value="INSTANT">Instant Alert on Trigger Date</MenuItem>
                      <MenuItem value="WEEKLY_SUMMARY">Weekly Summary (Every Monday)</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={<Switch checked={enableEmailAlerts} onChange={(e) => setEnableEmailAlerts(e.target.checked)} color="success" />}
                    label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Enable Automatic SMTP Email Reminders</Typography>}
                    sx={{ mb: 1, display: 'block' }}
                  />

                  <FormControlLabel
                    control={<Switch checked={autoEscalateOverdue} onChange={(e) => setAutoEscalateOverdue(e.target.checked)} color="warning" />}
                    label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Auto-escalate Overdue Expiries to Department Head</Typography>}
                    sx={{ display: 'block' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAF7', border: '1px solid #E4EBE1', borderRadius: '10px' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#023020', mb: 1 }}>
                      Reminder Escalation Matrix
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#667A6D', mb: 2 }}>
                      Automated email notifications triggered based on calculated days remaining:
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ p: 1.5, bg: '#FFFFFF', borderRadius: '6px', borderLeft: '4px solid #2563EB' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>Reminder Lead Time (e.g., 30 Days)</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Notifies Renewal Owner & Department Lead</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bg: '#FFFFFF', borderRadius: '6px', borderLeft: '4px solid #D97706' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>7 Days Before Renewal Due Date</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Escalates to Branch Manager & Procurement</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bg: '#FFFFFF', borderRadius: '6px', borderLeft: '4px solid #DC2626' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#991B1B' }}>Overdue (0 Days / Past Due Date)</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Escalates to Operations Head & Legal</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => showToast('Reminder Policy Settings Saved', 'success')}
                  sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, textTransform: 'none', fontWeight: 700 }}
                >
                  Save Reminder Policy
                </Button>
              </Box>
            </Paper>
          )}

          {/* Sub-Tab 3: Mail Templates Manager */}
          {configSubTab === 'templates' && (
            <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 1 }}>
                Email Notification Templates Editor
              </Typography>
              <Typography variant="body2" sx={{ color: '#667A6D', mb: 3 }}>
                Customize automated notification emails for all 12 renewal fields.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#44584C', mb: 1 }}>
                    Select Template Event
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.values(mailTemplates).map((tmpl) => (
                      <Button
                        key={tmpl.id}
                        variant={selectedTemplateKey === tmpl.id ? 'contained' : 'outlined'}
                        onClick={() => setSelectedTemplateKey(tmpl.id)}
                        sx={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 12.5,
                          p: 1.2,
                          backgroundColor: selectedTemplateKey === tmpl.id ? '#04552B' : '#FFFFFF',
                          borderColor: selectedTemplateKey === tmpl.id ? '#04552B' : '#E4EBE1',
                          color: selectedTemplateKey === tmpl.id ? '#FFFFFF' : '#334155',
                        }}
                      >
                        {tmpl.title}
                      </Button>
                    ))}
                  </Box>

                  <Box sx={{ mt: 3, p: 2, bgcolor: '#F8FAF7', borderRadius: '8px', border: '1px solid #E4EBE1' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#023020', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Code2 size={15} /> Dynamic Placeholders
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {[
                        '{{item_service}}',
                        '{{description}}',
                        '{{category}}',
                        '{{department}}',
                        '{{branch_location}}',
                        '{{start_date}}',
                        '{{due_date}}',
                        '{{days_remaining}}',
                        '{{last_renewed_date}}',
                        '{{renewal_owner}}',
                        '{{remarks}}',
                      ].map((tag) => (
                        <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10, fontFamily: 'monospace', bgcolor: '#EAF6E8', color: '#04552B' }} />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  {mailTemplates[selectedTemplateKey] && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Email Subject Line"
                        fullWidth
                        size="small"
                        value={mailTemplates[selectedTemplateKey].subject}
                        onChange={(e) =>
                          setMailTemplates((prev) => ({
                            ...prev,
                            [selectedTemplateKey]: { ...prev[selectedTemplateKey], subject: e.target.value },
                          }))
                        }
                      />

                      <TextField
                        label="Email Body Content"
                        fullWidth
                        multiline
                        rows={10}
                        value={mailTemplates[selectedTemplateKey].body}
                        onChange={(e) =>
                          setMailTemplates((prev) => ({
                            ...prev,
                            [selectedTemplateKey]: { ...prev[selectedTemplateKey], body: e.target.value },
                          }))
                        }
                        sx={{ fontFamily: 'monospace', fontSize: 12.5 }}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          onClick={() => showToast('Email template saved successfully', 'success')}
                          sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, textTransform: 'none', fontWeight: 700 }}
                        >
                          Save Email Template
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Sub-Tab 4: Compliance Rules & Setup */}
          {configSubTab === 'rules' && (
            <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 1 }}>
                Compliance Rules & System Setup
              </Typography>
              <Typography variant="body2" sx={{ color: '#667A6D', mb: 3 }}>
                Configure statutory validation rules and auto-calculation logic.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={<Switch checked={requireOwner} onChange={(e) => setRequireOwner(e.target.checked)} color="success" />}
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Require Renewal Owner on Creation</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch checked={autoCalcNextDue} onChange={(e) => setAutoCalcNextDue(e.target.checked)} color="success" />}
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Auto-calculate Next Renewal Due Date (+1 Year) on Mark Renewed</Typography>}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Default Currency Symbol"
                    size="small"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    sx={{ width: 180, mb: 2 }}
                  />

                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAF7', border: '1px solid #E4EBE1', borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#023020', mb: 0.5 }}>
                      Auto-Calculated Days Remaining Active
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#667A6D' }}>
                      Days remaining are recalculated dynamically every midnight relative to system clock and Renewal Due Date.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => showToast('Compliance rules saved successfully', 'success')}
                  sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, textTransform: 'none', fontWeight: 700 }}
                >
                  Save Compliance Rules
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* ── ITEM MODAL (ADD / EDIT ALL 12 REVAMPED FIELDS) ───────────────────────── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020', borderBottom: '1px solid #E4EBE1' }}>
          {editingId ? 'Edit Renewal Item / Service' : 'New Renewal Item / Service'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Section 1: Core Details */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#04552B', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 }}>
            1. Core Service & Organization Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Renewal Item / Service"
                fullWidth
                required
                size="small"
                value={itemService}
                onChange={(e) => setItemService(e.target.value)}
                placeholder="e.g. Tata Primavera Motor Insurance or Microsoft 365 Subscription"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Renewal Category</InputLabel>
                <Select value={category} label="Renewal Category" onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed coverage specs, policy scope, or terms summary..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select value={department} label="Department" onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Branch / Location</InputLabel>
                <Select value={branchLocation} label="Branch / Location" onChange={(e) => setBranchLocation(e.target.value)}>
                  {BRANCH_LOCATIONS.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider />

          {/* Section 2: Dates & Schedule */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#04552B', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 }}>
            2. Schedule, Validity & Auto-Calculations
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Renewal Due Date"
                type="date"
                required
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Last Renewed Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={lastRenewedDate}
                onChange={(e) => setLastRenewedDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Reminder Lead Time (Days)"
                type="number"
                fullWidth
                size="small"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
                helperText="Send advance reminder alert X days before Renewal Due Date"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              {/* Days Remaining Auto-calculated Box Preview */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: '#F8FAF7',
                  border: '1px solid #E4EBE1',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#44584C', textTransform: 'uppercase' }}>
                    Days Remaining (Auto-calculated)
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#023020', mt: 0.2 }}>
                    {dueDate ? `${getDaysRemaining(dueDate)} Days` : 'Select Due Date'}
                  </Typography>
                </Box>
                {dueDate && renderDaysRemainingChip(dueDate)}
              </Paper>
            </Grid>
          </Grid>

          <Divider />

          {/* Section 3: Ownership & Remarks */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#04552B', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 }}>
            3. Ownership & Remarks
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Renewal Owner"
                fullWidth
                size="small"
                value={renewalOwner}
                onChange={(e) => setRenewalOwner(e.target.value)}
                placeholder="e.g. Rajesh Kumar (Fleet Mgr)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label={`Estimated Cost (${currencySymbol}) - Optional`}
                type="number"
                fullWidth
                size="small"
                value={cost}
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Remarks / Notes"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Vendor contacts, quotation status, approval notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #E4EBE1' }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none', color: '#7A8B80' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRenewal}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, textTransform: 'none', fontWeight: 700 }}
          >
            Save Renewal Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Modal (Add / Edit Category) */}
      <Dialog open={catModalOpen} onClose={() => setCatModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020' }}>
          {editingCatId ? 'Edit Renewal Category' : 'New Renewal Category'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Category Name"
            fullWidth
            size="small"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Software License"
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Color Hex"
                fullWidth
                size="small"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Validity (Months)"
                type="number"
                fullWidth
                size="small"
                value={catValidityMonths}
                onChange={(e) => setCatValidityMonths(Number(e.target.value))}
              />
            </Grid>
          </Grid>

          <TextField
            label="Default Reminder Lead Time (Days)"
            type="number"
            fullWidth
            size="small"
            value={catReminderDays}
            onChange={(e) => setCatReminderDays(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCatModalOpen(false)} sx={{ textTransform: 'none', color: '#7A8B80' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, textTransform: 'none', fontWeight: 700 }}
          >
            Save Category
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
