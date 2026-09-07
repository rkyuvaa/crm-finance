import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
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
} from '@mui/material';
import {
  RefreshCw,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  ShieldCheck,
  Upload,
  Download,
  Pencil,
  Trash2,
  BarChart3,
  LayoutDashboard,
  BellRing,
  Settings2,
  Mail,
  Sliders,
  FolderCog,
  Code2,
  CheckSquare,
  Eye,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

interface RenewalItem {
  id: number;
  asset_name: string;
  asset_code: string;
  category: string;
  reference_no: string;
  provider: string;
  issue_date: string;
  expiry_date: string;
  cost: number;
  reminder_days: number;
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

const INITIAL_RENEWALS: RenewalItem[] = [
  {
    id: 1,
    asset_name: 'Tata Primavera 3525.K (KA-01-EQ-9821)',
    asset_code: 'VEH-9821',
    category: 'Insurance',
    reference_no: 'POL-ICICI-99882',
    provider: 'ICICI Lombard General Insurance',
    issue_date: '2025-09-15',
    expiry_date: '2026-09-15',
    cost: 45000,
    reminder_days: 15,
    status: 'EXPIRING_SOON',
  },
  {
    id: 2,
    asset_name: 'Ashok Leyland Captain 2823 (KA-05-MH-4412)',
    asset_code: 'VEH-4412',
    category: 'Fitness Certificate',
    reference_no: 'FC-KA05-2025-098',
    provider: 'Regional Transport Office (RTO South)',
    issue_date: '2025-09-01',
    expiry_date: '2026-09-05',
    cost: 8500,
    reminder_days: 30,
    status: 'EXPIRED',
  },
  {
    id: 3,
    asset_name: 'BharatBenz 2823C Tippers (KA-51-AB-1204)',
    asset_code: 'VEH-1204',
    category: 'Permit',
    reference_no: 'NP-IND-88371',
    provider: 'National Permit Authority',
    issue_date: '2025-10-10',
    expiry_date: '2026-10-10',
    cost: 16000,
    reminder_days: 30,
    status: 'ACTIVE',
  },
  {
    id: 4,
    asset_name: 'Mahindra Blazo X 28 (KA-03-JJ-7711)',
    asset_code: 'VEH-7711',
    category: 'Pollution (PUC)',
    reference_no: 'PUC-2026-00441',
    provider: 'State Pollution Control Board',
    issue_date: '2026-03-01',
    expiry_date: '2026-09-01',
    cost: 1200,
    reminder_days: 7,
    status: 'EXPIRED',
  },
  {
    id: 5,
    asset_name: 'Heavy Hydraulic Tipper Fleet #12',
    asset_code: 'EQ-HIP-12',
    category: 'AMC & Warranty',
    reference_no: 'AMC-CAT-2025-01',
    provider: 'Caterpillar India Service',
    issue_date: '2025-12-01',
    expiry_date: '2026-12-01',
    cost: 120000,
    reminder_days: 30,
    status: 'ACTIVE',
  },
];

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 1, name: 'Insurance', color: '#2563EB', default_validity_months: 12, default_reminder_days: 30, is_active: true },
  { id: 2, name: 'Fitness Certificate', color: '#D97706', default_validity_months: 12, default_reminder_days: 30, is_active: true },
  { id: 3, name: 'Permit', color: '#059669', default_validity_months: 60, default_reminder_days: 30, is_active: true },
  { id: 4, name: 'Pollution (PUC)', color: '#DC2626', default_validity_months: 6, default_reminder_days: 15, is_active: true },
  { id: 5, name: 'Road Tax', color: '#7C3AED', default_validity_months: 12, default_reminder_days: 15, is_active: true },
  { id: 6, name: 'AMC & Warranty', color: '#475569', default_validity_months: 12, default_reminder_days: 30, is_active: true },
  { id: 7, name: 'Enterprise License', color: '#087A3D', default_validity_months: 24, default_reminder_days: 45, is_active: true },
];

const DEFAULT_MAIL_TEMPLATES: Record<string, MailTemplate> = {
  reminder: {
    id: 'reminder',
    title: 'Upcoming Renewal Reminder (Advance Alert)',
    subject: 'Renewal Reminder: {{asset_name}} ({{category}}) expires in {{days_remaining}} days',
    body: `Dear Fleet / Operations Manager,

This is an automated system reminder that the following asset renewal is coming due shortly:

Asset Name: {{asset_name}}
Asset Code: {{asset_code}}
Renewal Category: {{category}}
Policy / Reference No.: {{reference_no}}
Provider / Authority: {{provider}}
Expiry Date: {{expiry_date}}
Estimated Cost / Premium: ₹{{cost}}

Please initiate the renewal process with {{provider}} prior to the expiration date to ensure uninterrupted operations.

Best regards,
Enterprise Renewal Notification System`,
  },
  critical: {
    id: 'critical',
    title: 'Urgent Expiry Warning (Critical Alert)',
    subject: 'URGENT: {{asset_name}} expires in {{days_remaining}} days!',
    body: `ATTENTION: CRITICAL RENEWAL WARNING

The statutory compliance document for {{asset_name}} is expiring in less than 7 days.

Asset Code: {{asset_code}}
Document Category: {{category}}
Expiry Date: {{expiry_date}}
Current Status: EXPIRING SOON

Failure to renew before {{expiry_date}} may result in regulatory penalties or operational shutdown. Please process immediately.

Regards,
Compliance Department`,
  },
  overdue: {
    id: 'overdue',
    title: 'Overdue Expiry Alert (Post Expiry)',
    subject: 'EXPIRED ALERT: {{asset_name}} ({{category}}) expired on {{expiry_date}}',
    body: `NOTICE OF EXPIRED COMPLIANCE RECORD

The statutory renewal for {{asset_name}} has EXPIRED on {{expiry_date}}.

Asset Code: {{asset_code}}
Category: {{category}}
Reference No.: {{reference_no}}

This asset is currently flagged as NON-COMPLIANT in the enterprise system. Please complete the renewal and upload the updated document immediately.

Regards,
Enterprise Admin`,
  },
  renewed: {
    id: 'renewed',
    title: 'Renewal Confirmation Notification',
    subject: 'CONFIRMED: {{asset_name}} ({{category}}) successfully renewed',
    body: `RENEWAL CONFIRMATION

The renewal process for {{asset_name}} has been marked as COMPLETED.

Asset Code: {{asset_code}}
Category: {{category}}
New Expiry Date: {{expiry_date}}
Updated By System User.

Thank you for maintaining enterprise compliance standards.`,
  },
};

export default function RenewalTrackerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [renewals, setRenewals] = useState<RenewalItem[]>(INITIAL_RENEWALS);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [mailTemplates, setMailTemplates] = useState<Record<string, MailTemplate>>(DEFAULT_MAIL_TEMPLATES);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('reminder');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Configuration Policy State
  const [configSubTab, setConfigSubTab] = useState<'categories' | 'reminders' | 'templates' | 'rules'>('categories');
  const [advanceDaysList, setAdvanceDaysList] = useState<string>('60, 30, 15, 7, 1');
  const [emailFrequency, setEmailFrequency] = useState<string>('DAILY_DIGEST');
  const [autoEscalateOverdue, setAutoEscalateOverdue] = useState<boolean>(true);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState<boolean>(true);
  const [requireRefNo, setRequireRefNo] = useState<boolean>(true);
  const [requireDocUpload, setRequireDocUpload] = useState<boolean>(false);
  const [autoCalcExpiry, setAutoCalcExpiry] = useState<boolean>(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#2563EB');
  const [catValidityMonths, setCatValidityMonths] = useState(12);
  const [catReminderDays, setCatReminderDays] = useState(30);

  // Item Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [category, setCategory] = useState<string>('Insurance');
  const [referenceNo, setReferenceNo] = useState('');
  const [provider, setProvider] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [reminderDays, setReminderDays] = useState<number>(30);

  // Active Tab determined by URL path
  const currentTab = location.pathname.endsWith('/tracker')
    ? 'tracker'
    : location.pathname.endsWith('/reports')
    ? 'reports'
    : location.pathname.endsWith('/configuration')
    ? 'configuration'
    : 'dashboard';

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    navigate(`/renewal/${newValue}`);
  };

  const handleOpenModal = (item?: RenewalItem) => {
    if (item) {
      setEditingId(item.id);
      setAssetName(item.asset_name);
      setAssetCode(item.asset_code);
      setCategory(item.category);
      setReferenceNo(item.reference_no);
      setProvider(item.provider);
      setIssueDate(item.issue_date);
      setExpiryDate(item.expiry_date);
      setCost(item.cost);
      setReminderDays(item.reminder_days);
    } else {
      setEditingId(null);
      setAssetName('');
      setAssetCode(`VEH-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('Insurance');
      setReferenceNo('');
      setProvider('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      setExpiryDate('');
      setCost('');
      setReminderDays(30);
    }
    setModalOpen(true);
  };

  const handleSaveRenewal = () => {
    if (!assetName.trim() || !expiryDate) {
      showToast('Asset name and expiry date are required', 'error');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let calculatedStatus: RenewalItem['status'] = 'ACTIVE';
    if (expiryDate < today) {
      calculatedStatus = 'EXPIRED';
    } else {
      const expTime = new Date(expiryDate).getTime();
      const todayTime = new Date().getTime();
      const diffDays = Math.ceil((expTime - todayTime) / (1000 * 3600 * 24));
      if (diffDays <= reminderDays) {
        calculatedStatus = 'EXPIRING_SOON';
      }
    }

    if (editingId) {
      setRenewals((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                asset_name: assetName,
                asset_code: assetCode,
                category,
                reference_no: referenceNo,
                provider,
                issue_date: issueDate,
                expiry_date: expiryDate,
                cost: cost ? Number(cost) : 0,
                reminder_days: reminderDays,
                status: calculatedStatus,
              }
            : r,
        ),
      );
      showToast('Renewal item updated successfully', 'success');
    } else {
      const newItem: RenewalItem = {
        id: Date.now(),
        asset_name: assetName,
        asset_code: assetCode || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
        category,
        reference_no: referenceNo || 'N/A',
        provider: provider || 'Standard Authority',
        issue_date: issueDate,
        expiry_date: expiryDate,
        cost: cost ? Number(cost) : 0,
        reminder_days: reminderDays,
        status: calculatedStatus,
      };
      setRenewals((prev) => [newItem, ...prev]);
      showToast('New renewal item created', 'success');
    }

    setModalOpen(false);
  };

  const handleMarkRenewed = (id: number) => {
    setRenewals((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextExpiry = new Date(r.expiry_date || Date.now());
          nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);
          return {
            ...r,
            issue_date: new Date().toISOString().split('T')[0],
            expiry_date: nextExpiry.toISOString().split('T')[0],
            status: 'RENEWED',
          };
        }
        return r;
      }),
    );
    showToast('Item marked as renewed for another term!', 'success');
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

  // Mail Template Save
  const handleSaveMailTemplate = () => {
    showToast('Mail notification template saved successfully', 'success');
  };

  // Filtered List
  const filteredRenewals = renewals.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.asset_name.toLowerCase().includes(q) ||
      r.asset_code.toLowerCase().includes(q) ||
      r.reference_no.toLowerCase().includes(q) ||
      r.provider.toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Metrics
  const totalCount = renewals.length;
  const expiringSoonCount = renewals.filter((r) => r.status === 'EXPIRING_SOON').length;
  const expiredCount = renewals.filter((r) => r.status === 'EXPIRED').length;
  const renewedCount = renewals.filter((r) => r.status === 'RENEWED' || r.status === 'ACTIVE').length;
  const totalAnnualCost = renewals.reduce((acc, r) => acc + (r.cost || 0), 0);

  const getStatusChip = (status: RenewalItem['status']) => {
    switch (status) {
      case 'EXPIRING_SOON':
        return <Chip label="Expiring Soon" size="small" sx={{ bg: '#FEF3C7', color: '#D97706', fontWeight: 700, borderRadius: '6px' }} />;
      case 'EXPIRED':
        return <Chip label="Expired" size="small" sx={{ bg: '#FEE2E2', color: '#DC2626', fontWeight: 700, borderRadius: '6px' }} />;
      case 'RENEWED':
        return <Chip label="Renewed" size="small" sx={{ bg: '#DCFCE7', color: '#15803D', fontWeight: 700, borderRadius: '6px' }} />;
      default:
        return <Chip label="Active" size="small" sx={{ bg: '#E0F2FE', color: '#0369A1', fontWeight: 700, borderRadius: '6px' }} />;
    }
  };

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: '#04552B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <RefreshCw size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#023020', lineHeight: 1.2 }}>
              Renewal Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: '#667A6D' }}>
              Track vehicle insurance, fitness certificates, permits, PUC, warranties & statutory renewals.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Upload size={18} />}
            onClick={() => showToast('Import format ready', 'info')}
            sx={{ borderColor: '#cbd5e1', color: '#334155', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => handleOpenModal()}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            New Renewal Item
          </Button>
        </Box>
      </Box>

      {/* Tabs Navigation */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, backgroundColor: 'transparent' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14, minHeight: 44 },
            '& .Mui-selected': { color: '#04552B' },
            '& .MuiTabs-indicator': { backgroundColor: '#04552B', height: 3 },
          }}
        >
          <Tab icon={<LayoutDashboard size={17} />} iconPosition="start" value="dashboard" label="Dashboard" />
          <Tab icon={<Clock size={17} />} iconPosition="start" value="tracker" label="Renewal Tracker" />
          <Tab icon={<BarChart3 size={17} />} iconPosition="start" value="reports" label="Reports & Analytics" />
          <Tab icon={<Settings2 size={17} />} iconPosition="start" value="configuration" label="Configuration" />
        </Tabs>
      </Paper>

      {/* ── TAB 1: RENEWAL DASHBOARD ───────────────────────────────────────── */}
      {currentTab === 'dashboard' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                <AlertTriangle size={22} color={expiredCount > 0 ? '#DC2626' : '#D97706'} />
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: expiredCount > 0 ? '#991B1B' : '#92400E' }}>
                    Attention Required: {expiredCount} Expired & {expiringSoonCount} Expiring Soon Items
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: expiredCount > 0 ? '#B91C1C' : '#B45309' }}>
                    Immediate renewal action recommended to maintain compliance and avoid fines or downtime.
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
                View Tracker List
              </Button>
            </Paper>
          )}

          {/* Metric KPI Cards */}
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#EAF6E8', color: '#04552B' }}>
                    <ShieldCheck size={20} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600 }}>
                    Total Renewals Tracked
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#023020' }}>
                  {totalCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#7A8B80' }}>
                  Annual Cost: {currencySymbol}{totalAnnualCost.toLocaleString('en-IN')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706' }}>
                    <BellRing size={20} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600 }}>
                    Expiring Soon (&lt;30 Days)
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706' }}>
                  {expiringSoonCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>
                  Requires vendor followup
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                    <AlertCircle size={20} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600 }}>
                    Expired Overdue
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#DC2626' }}>
                  {expiredCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 600 }}>
                  Action mandatory
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                    <CheckCircle2 size={20} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#7A8B80', fontWeight: 600 }}>
                    Active & Renewed
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803D' }}>
                  {renewedCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600 }}>
                  Compliance: {totalCount > 0 ? Math.round((renewedCount / totalCount) * 100) : 100}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Quick Action Table preview */}
          <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 2.5, bgcolor: '#FFFFFF' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 2 }}>
              Upcoming & Priority Renewals Overview
            </Typography>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#F8FAF7' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Asset / Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Provider</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Fee / Premium</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#44584C' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renewals.slice(0, 5).map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#16231B' }}>{row.asset_name}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#7A8B80' }}>Ref: {row.reference_no}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.category} size="small" variant="outlined" sx={{ fontSize: 11, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: '#44584C' }}>{row.provider}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, fontWeight: 600, color: row.status === 'EXPIRED' ? '#DC2626' : '#16231B' }}>
                      {row.expiry_date}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: '#023020' }}>
                      {currencySymbol}{row.cost.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>{getStatusChip(row.status)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => handleMarkRenewed(row.id)}
                        sx={{ textTransform: 'none', fontWeight: 700, color: '#04552B' }}
                      >
                        Mark Renewed
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* ── TAB 2: RENEWAL TRACKER GRID ───────────────────────────────────── */}
      {currentTab === 'tracker' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Controls Bar */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search vehicle, asset, provider or ref no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} color="#7A8B80" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.name}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="EXPIRING_SOON">Expiring Soon</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                    <MenuItem value="RENEWED">Renewed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  sx={{ textTransform: 'none', color: '#7A8B80', borderColor: '#CBD5E1' }}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Main Table */}
          <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', overflow: 'hidden', bgcolor: '#FFFFFF' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#F8FAF7' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Asset / Vehicle Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Reference No.</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Provider / RTO</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Fee / Cost</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#44584C' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#44584C' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRenewals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#7A8B80' }}>
                      No renewal items match the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRenewals.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#16231B' }}>{r.asset_name}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#7A8B80', fontFamily: 'monospace' }}>{r.asset_code}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={r.category} size="small" sx={{ fontWeight: 600, fontSize: 11, bgcolor: '#F1F5F9' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace', color: '#334155' }}>{r.reference_no}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: '#44584C' }}>{r.provider}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: r.status === 'EXPIRED' ? '#DC2626' : '#16231B' }}>
                          {r.expiry_date}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: '#7A8B80' }}>Alert @ {r.reminder_days} days</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#023020' }}>
                        {currencySymbol}{r.cost.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>{getStatusChip(r.status)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Mark Renewed">
                            <IconButton size="small" onClick={() => handleMarkRenewed(r.id)} sx={{ color: '#04552B' }}>
                              <CheckCircle2 size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenModal(r)} sx={{ color: '#3B82F6' }}>
                              <Pencil size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(r.id)} sx={{ color: '#EF4444' }}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* ── TAB 3: REPORTS & ANALYTICS ────────────────────────────────────── */}
      {currentTab === 'reports' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', p: 3, bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020', mb: 2 }}>
                  Category Renewal Expense Distribution
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {categories.slice(0, 5).map((c, i) => {
                    const catItems = renewals.filter((r) => r.category === c.name);
                    const catTotal = catItems.reduce((a, b) => a + (b.cost || 0), 0);
                    const pct = totalAnnualCost > 0 ? Math.round((catTotal / totalAnnualCost) * 100) : 0;
                    return (
                      <Box key={c.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#16231B' }}>{c.name}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#023020' }}>
                            {currencySymbol}{catTotal.toLocaleString('en-IN')} ({pct}%)
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
                  Compliance & Expiry Audit Summary
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#F8FAF7', borderRadius: '10px', border: '1px solid #E4EBE1', mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#023020', mb: 0.5 }}>
                    Fleet Statutory Compliance Rating
                  </Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#04552B' }}>
                    {totalCount > 0 ? Math.round(((totalCount - expiredCount) / totalCount) * 100) : 100}%
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#7A8B80' }}>
                    Calculated based on active vs expired vehicle certificates and permits.
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  onClick={() => showToast('Full Renewal Compliance Audit Exported', 'success')}
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
          {/* Sub-Navigation Tabs inside Configuration */}
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
                    Configure renewal categories, default validity terms, color badges, and default reminder advance days.
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
                Advance Reminder & Notification Policy
              </Typography>
              <Typography variant="body2" sx={{ color: '#667A6D', mb: 3 }}>
                Configure trigger intervals, email dispatch frequencies, and escalation rules for upcoming or overdue renewals.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Advance Alert Trigger Days (Comma-separated)"
                    fullWidth
                    size="small"
                    value={advanceDaysList}
                    onChange={(e) => setAdvanceDaysList(e.target.value)}
                    helperText="Triggers advance email alerts at X days prior to expiry date (e.g. 60, 30, 15, 7, 1)"
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
                    label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Auto-escalate Overdue Expiries to Operations Head</Typography>}
                    sx={{ display: 'block' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAF7', border: '1px solid #E4EBE1', borderRadius: '10px' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#023020', mb: 1 }}>
                      Reminder Escalation Matrix
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#667A6D', mb: 2 }}>
                      Automated email notification rules applied based on remaining expiry days:
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ p: 1.5, bg: '#FFFFFF', borderRadius: '6px', borderLeft: '4px solid #2563EB' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>30 Days Before Expiry</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Notifies Asset Owner & Vehicle Driver</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bg: '#FFFFFF', borderRadius: '6px', borderLeft: '4px solid #D97706' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>7 Days Before Expiry (Urgent)</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Notifies Fleet Manager & Procurement Department</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bg: '#FFFFFF', borderRadius: '6px', borderLeft: '4px solid #DC2626' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#991B1B' }}>0 Days / Post Expiry (Overdue)</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Escalates to General Manager & Compliance Head</Typography>
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
                Customize automated email templates sent to managers, drivers, and vendors.
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
                      <Code2 size={15} /> Available Dynamic Placeholders
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['{{asset_name}}', '{{asset_code}}', '{{category}}', '{{expiry_date}}', '{{days_remaining}}', '{{provider}}', '{{reference_no}}', '{{cost}}'].map((tag) => (
                        <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10.5, fontFamily: 'monospace', bgcolor: '#EAF6E8', color: '#04552B' }} />
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
                        label="Email Body Content (PlainText / HTML)"
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

                      {/* Live Preview Box */}
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#F1F5F9', borderRadius: '8px', border: '1px dashed #94A3B8' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Eye size={14} /> Live Sample Email Preview
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', mb: 1 }}>
                          Subject: {mailTemplates[selectedTemplateKey].subject.replace('{{asset_name}}', 'Tata Primavera 3525.K').replace('{{category}}', 'Insurance').replace('{{days_remaining}}', '15')}
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-wrap', color: '#334155', fontFamily: 'monospace' }}>
                          {mailTemplates[selectedTemplateKey].body
                            .replace(/{{asset_name}}/g, 'Tata Primavera 3525.K (KA-01-EQ-9821)')
                            .replace(/{{asset_code}}/g, 'VEH-9821')
                            .replace(/{{category}}/g, 'Insurance')
                            .replace(/{{reference_no}}/g, 'POL-ICICI-99882')
                            .replace(/{{provider}}/g, 'ICICI Lombard Insurance')
                            .replace(/{{expiry_date}}/g, '2026-09-15')
                            .replace(/{{cost}}/g, '45,000')
                            .replace(/{{days_remaining}}/g, '15')}
                        </Typography>
                      </Paper>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          onClick={handleSaveMailTemplate}
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
                Compliance Workflow & Statutory Setup
              </Typography>
              <Typography variant="body2" sx={{ color: '#667A6D', mb: 3 }}>
                Configure statutory mandatory fields, default currency, and document verification rules.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={<Switch checked={requireRefNo} onChange={(e) => setRequireRefNo(e.target.checked)} color="success" />}
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Require Policy / Reference Number on Creation</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch checked={requireDocUpload} onChange={(e) => setRequireDocUpload(e.target.checked)} color="success" />}
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Require Scanned PDF / Document Upload on Renewal</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch checked={autoCalcExpiry} onChange={(e) => setAutoCalcExpiry(e.target.checked)} color="success" />}
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#16231B' }}>Auto-calculate Next Expiry Date (+1 Year) on Mark Renewed</Typography>}
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
                      Statutory Audit Mode Active
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#667A6D' }}>
                      All category modifications, email dispatch logs, and status updates are recorded in the central Enterprise Audit Trail.
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

      {/* Item Modal (Add/Edit Renewal) */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020' }}>
          {editingId ? 'Edit Renewal Record' : 'New Renewal Item'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Asset / Vehicle Name"
            fullWidth
            size="small"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="e.g. Tata Primavera 3525.K (KA-01-EQ-9821)"
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Asset / Vehicle Code"
                fullWidth
                size="small"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value as any)}>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Reference / Policy No."
                fullWidth
                size="small"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Provider / Authority"
                fullWidth
                size="small"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Issue Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Expiry Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label={`Renewal Fee / Premium (${currencySymbol})`}
                type="number"
                fullWidth
                size="small"
                value={cost}
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Reminder Advance Days"
                type="number"
                fullWidth
                size="small"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
                helperText="Send alert X days before expiry"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none', color: '#7A8B80' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRenewal}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' }, textTransform: 'none', fontWeight: 700 }}
          >
            Save Renewal Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Modal (Add/Edit Category) */}
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
            placeholder="e.g. Commercial Fitness Certificate"
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Color Badge Hex"
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
            label="Default Advance Reminder (Days)"
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
