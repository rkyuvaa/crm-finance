import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Drawer,
  Divider,
} from '@mui/material';
import {
  ClipboardList,
  Package,
  Laptop,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building,
  Layers,
  Calendar,
  User,
  FileText,
  Building2,
  DollarSign,
} from 'lucide-react';
import { useTableSort } from '../hooks/useTableSort';
import ErpSortHeaderCell from '../components/ui/ErpSortHeaderCell';
import { useToast } from '@/components/ui/ToastHost';

export interface RequirementItem {
  id: string; // e.g. REQ-MAT-1 or REQ-IT-1
  type: 'MATERIAL' | 'IT';
  title: string;
  category: string;
  quantity: number;
  unit: string;
  estimated_unit_cost: number;
  total_cost: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_PROCUREMENT' | 'FULFILLED' | 'REJECTED';
  department: string;
  requested_by: string;
  required_by_date: string;
  justification: string;
  specifications: string;
  vendor_suggestion?: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'crm_requirements_items_data';

export default function RequirementsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Determine active tab from URL path
  const isIT = location.pathname.includes('/requirements/it');
  const reqType: 'MATERIAL' | 'IT' = isIT ? 'IT' : 'MATERIAL';

  // Rule 1: No Demo/Sample Data — Start with empty array []
  const [requirements, setRequirements] = useState<RequirementItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Save changes to localStorage for state persistence across sessions
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requirements));
    } catch {
      // Ignore write errors
    }
  }, [requirements]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Modal & Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RequirementItem | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<RequirementItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formUnitCost, setFormUnitCost] = useState<number>(0);
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_PROCUREMENT' | 'FULFILLED' | 'REJECTED'>('PENDING');
  const [formDepartment, setFormDepartment] = useState('Operations');
  const [formRequestedBy, setFormRequestedBy] = useState('Admin User');
  const [formRequiredByDate, setFormRequiredByDate] = useState(new Date().toISOString().split('T')[0]);
  const [formJustification, setFormJustification] = useState('');
  const [formSpecifications, setFormSpecifications] = useState('');
  const [formVendorSuggestion, setFormVendorSuggestion] = useState('');

  // Categories list based on active requirement type
  const materialCategories = ['Raw Materials', 'Consumables', 'Safety Equipment', 'Tools & Machinery', 'Office Supplies', 'Packaging'];
  const itCategories = ['Hardware & Laptops', 'Software & SaaS Licenses', 'Cloud Infrastructure', 'Network Equipment', 'Peripherals & Monitors', 'Security & Storage'];

  const categoryOptions = reqType === 'IT' ? itCategories : materialCategories;

  // Filter items matching active type & filter criteria
  const typeFiltered = useMemo(() => {
    return requirements.filter((item) => item.type === reqType);
  }, [requirements, reqType]);

  const filteredItems = useMemo(() => {
    return typeFiltered.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchDept = item.department.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchDept && !matchCat) return false;
      }
      // Status
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      // Priority
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
      // Department
      if (departmentFilter !== 'ALL' && item.department !== departmentFilter) return false;

      return true;
    });
  }, [typeFiltered, searchQuery, statusFilter, priorityFilter, departmentFilter]);

  const { sortState, handleSort, sortData } = useTableSort<RequirementItem>();
  const sortedItems = useMemo(() => sortData(filteredItems), [filteredItems, sortData]);

  // Statistics KPIs
  const totalCount = typeFiltered.length;
  const pendingCount = typeFiltered.filter((i) => i.status === 'PENDING' || i.status === 'DRAFT').length;
  const approvedCount = typeFiltered.filter((i) => i.status === 'APPROVED' || i.status === 'IN_PROCUREMENT').length;
  const fulfilledCount = typeFiltered.filter((i) => i.status === 'FULFILLED').length;
  const totalCostEstimate = typeFiltered.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);

  // Form Reset
  const resetForm = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormCategory(categoryOptions[0] || '');
    setFormQuantity(1);
    setFormUnit(reqType === 'IT' ? 'Units' : 'Pcs');
    setFormUnitCost(0);
    setFormPriority('MEDIUM');
    setFormStatus('PENDING');
    setFormDepartment('Operations');
    setFormRequestedBy('Admin User');
    setFormRequiredByDate(new Date().toISOString().split('T')[0]);
    setFormJustification('');
    setFormSpecifications('');
    setFormVendorSuggestion('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: RequirementItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormQuantity(item.quantity);
    setFormUnit(item.unit);
    setFormUnitCost(item.estimated_unit_cost);
    setFormPriority(item.priority);
    setFormStatus(item.status);
    setFormDepartment(item.department);
    setFormRequestedBy(item.requested_by);
    setFormRequiredByDate(item.required_by_date);
    setFormJustification(item.justification);
    setFormSpecifications(item.specifications);
    setFormVendorSuggestion(item.vendor_suggestion || '');
    setIsCreateOpen(true);
  };

  const handleSaveRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showError('Please enter a requirement title');
      return;
    }

    const calculatedTotal = formQuantity * formUnitCost;

    if (editingItem) {
      // Update existing item
      setRequirements((prev) =>
        prev.map((r) =>
          r.id === editingItem.id
            ? {
                ...r,
                title: formTitle.trim(),
                category: formCategory || categoryOptions[0],
                quantity: Number(formQuantity),
                unit: formUnit.trim(),
                estimated_unit_cost: Number(formUnitCost),
                total_cost: calculatedTotal,
                priority: formPriority,
                status: formStatus,
                department: formDepartment,
                requested_by: formRequestedBy.trim(),
                required_by_date: formRequiredByDate,
                justification: formJustification.trim(),
                specifications: formSpecifications.trim(),
                vendor_suggestion: formVendorSuggestion.trim(),
              }
            : r,
        ),
      );
      showSuccess(`Updated ${editingItem.id} successfully`);
    } else {
      // Create new requirement
      const prefix = reqType === 'IT' ? 'REQ-IT' : 'REQ-MAT';
      const maxId = requirements.reduce((max, r) => {
        const parts = r.id.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);

      const newId = `${prefix}-${maxId + 1}`;
      const newItem: RequirementItem = {
        id: newId,
        type: reqType,
        title: formTitle.trim(),
        category: formCategory || categoryOptions[0],
        quantity: Number(formQuantity),
        unit: formUnit.trim(),
        estimated_unit_cost: Number(formUnitCost),
        total_cost: calculatedTotal,
        priority: formPriority,
        status: formStatus,
        department: formDepartment,
        requested_by: formRequestedBy.trim(),
        required_by_date: formRequiredByDate,
        justification: formJustification.trim(),
        specifications: formSpecifications.trim(),
        vendor_suggestion: formVendorSuggestion.trim(),
        created_at: new Date().toISOString(),
      };

      setRequirements((prev) => [newItem, ...prev]);
      showSuccess(`Created requisition ${newId} successfully`);
    }

    setIsCreateOpen(false);
    resetForm();
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm(`Are you sure you want to delete requisition ${id}?`)) {
      setRequirements((prev) => prev.filter((item) => item.id !== id));
      showSuccess(`Requisition ${id} deleted`);
      if (selectedDetailItem?.id === id) {
        setSelectedDetailItem(null);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      showError('No items available to export');
      return;
    }

    const headers = ['ID', 'Type', 'Title', 'Category', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Priority', 'Status', 'Department', 'Requested By', 'Required By Date'];
    const rows = filteredItems.map((i) => [
      i.id,
      i.type,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      i.quantity,
      i.unit,
      i.estimated_unit_cost,
      i.total_cost,
      i.priority,
      i.status,
      i.department,
      `"${i.requested_by}"`,
      i.required_by_date,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reqType.toLowerCase()}_requirements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Exported ${filteredItems.length} requisitions to CSV`);
  };

  // Helper Badge Colors
  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Chip label="CRITICAL" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '0.65rem' }} />;
      case 'HIGH':
        return <Chip label="HIGH" size="small" sx={{ bgcolor: '#FFEDD5', color: '#EA580C', fontWeight: 700, fontSize: '0.65rem' }} />;
      case 'MEDIUM':
        return <Chip label="MEDIUM" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: '0.65rem' }} />;
      default:
        return <Chip label="LOW" size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '0.65rem' }} />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'FULFILLED':
        return <Chip label="FULFILLED" size="small" icon={<CheckCircle2 size={12} />} sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.68rem' }} />;
      case 'APPROVED':
        return <Chip label="APPROVED" size="small" sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, fontSize: '0.68rem' }} />;
      case 'IN_PROCUREMENT':
        return <Chip label="IN PROCURE" size="small" icon={<Clock size={12} />} sx={{ bgcolor: '#E0E7FF', color: '#4338CA', fontWeight: 700, fontSize: '0.68rem' }} />;
      case 'REJECTED':
        return <Chip label="REJECTED" size="small" icon={<XCircle size={12} />} sx={{ bgcolor: '#FEE2E2', color: '#B91C1C', fontWeight: 700, fontSize: '0.68rem' }} />;
      case 'DRAFT':
        return <Chip label="DRAFT" size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 700, fontSize: '0.68rem' }} />;
      default:
        return <Chip label="PENDING" size="small" icon={<AlertTriangle size={12} />} sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '0.68rem' }} />;
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', minWidth: 0, px: 0, py: 0.5, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* ── Sub-menu Navigation Tabs ────────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={!isIT ? 'contained' : 'text'}
            startIcon={<Package size={18} />}
            onClick={() => navigate('/requirements/material')}
            sx={{
              bgcolor: !isIT ? '#04552B' : 'transparent',
              color: !isIT ? '#ffffff' : 'text.secondary',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '14px',
              borderRadius: '8px 8px 0 0',
              px: 2.5,
              py: 1,
              '&:hover': { bgcolor: !isIT ? '#034120' : 'action.hover' },
            }}
          >
            Material Requirement
          </Button>

          <Button
            variant={isIT ? 'contained' : 'text'}
            startIcon={<Laptop size={18} />}
            onClick={() => navigate('/requirements/it')}
            sx={{
              bgcolor: isIT ? '#04552B' : 'transparent',
              color: isIT ? '#ffffff' : 'text.secondary',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '14px',
              borderRadius: '8px 8px 0 0',
              px: 2.5,
              py: 1,
              '&:hover': { bgcolor: isIT ? '#034120' : 'action.hover' },
            }}
          >
            IT Requirement
          </Button>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={16} />}
            onClick={handleExportCSV}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.primary' }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2 }}
          >
            New Requisition
          </Button>
        </Box>
      </Box>

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, fontSize: 13 }}>
                Total Requisitions
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: '8px', bgcolor: '#F1F5F9', color: '#475569' }}>
                <ClipboardList size={18} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {totalCount}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, fontSize: 13 }}>
                Pending / Draft
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: '8px', bgcolor: '#FEF3C7', color: '#D97706' }}>
                <Clock size={18} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#D97706' }}>
              {pendingCount}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, fontSize: 13 }}>
                Approved / Procuring
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: '8px', bgcolor: '#DBEAFE', color: '#1D4ED8' }}>
                <CheckCircle2 size={18} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1D4ED8' }}>
              {approvedCount}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, fontSize: 13 }}>
                Est. Total Investment
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: '8px', bgcolor: '#DCFCE7', color: '#15803D' }}>
                <DollarSign size={18} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803D' }}>
              ₹{totalCostEstimate.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Toolbar & Filter Controls ────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder={`Search ${reqType.toLowerCase()} requisitions by Title, ID, Department...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#64748B" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="IN_PROCUREMENT">In Procurement</MenuItem>
                <MenuItem value="FULFILLED">Fulfilled</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                <MenuItem value="ALL">All Priorities</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)}>
                <MenuItem value="ALL">All Departments</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
                <MenuItem value="IT">IT & Infrastructure</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="HR">HR & Admin</MenuItem>
                <MenuItem value="Sales">Sales & Marketing</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Main Data Table / Empty State ───────────────────────────────────── */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper', flex: 1 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <ErpSortHeaderCell variant="mui" field="id" label="Requisition ID" sortState={sortState} onSort={handleSort} sx={{ py: 1.5 }} />
              <ErpSortHeaderCell variant="mui" field="title" label="Requirement Title" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="category" label="Category" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="quantity" label="Qty & Unit" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="total_cost" label="Est. Cost (₹)" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="department" label="Department" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="required_by_date" label="Required By" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="priority" label="Priority" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" field="status" label="Status" sortState={sortState} onSort={handleSort} />
              <ErpSortHeaderCell variant="mui" label="Actions" align="right" sortable={false} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedDetailItem(item)}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#04552B' }}>
                  {item.id}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                <TableCell>
                  <Chip label={item.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  ₹{(item.total_cost || 0).toLocaleString()}
                </TableCell>
                <TableCell>{item.department}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{item.required_by_date}</TableCell>
                <TableCell>{getPriorityChip(item.priority)}</TableCell>
                <TableCell>{getStatusChip(item.status)}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => setSelectedDetailItem(item)}>
                      <Eye size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{ color: '#2563EB' }}>
                      <Edit3 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)} sx={{ color: '#DC2626' }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {/* Clean Empty State Message */}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'action.hover', color: '#04552B' }}>
                      {reqType === 'IT' ? <Laptop size={36} /> : <Package size={36} />}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      No {reqType === 'IT' ? 'IT' : 'Material'} Requisitions Found
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 420 }}>
                      There are no {reqType.toLowerCase()} requirements raised matching your filters. Click below to add your first requisition.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={16} />}
                      onClick={handleOpenCreate}
                      sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, mt: 1, textTransform: 'none', fontWeight: 600 }}
                    >
                      Create Requisition
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Create / Edit Requisition Modal ─────────────────────────────────── */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSaveRequirement}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            {reqType === 'IT' ? <Laptop size={20} color="#04552B" /> : <Package size={20} color="#04552B" />}
            {editingItem ? `Edit Requisition (${editingItem.id})` : `New ${reqType === 'IT' ? 'IT' : 'Material'} Requirement Requisition`}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Requirement Title / Item Name"
                  placeholder={reqType === 'IT' ? 'e.g. Developer Laptops i7 16GB' : 'e.g. Safety Helmets & Industrial Gloves'}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select value={formCategory} label="Category" onChange={(e) => setFormCategory(e.target.value)}>
                    {categoryOptions.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  size="small"
                  label="Quantity"
                  inputProps={{ min: 1 }}
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Unit of Measure"
                  placeholder="e.g. Pcs, Licenses, Kg, Sets"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Est. Unit Cost (₹)"
                  inputProps={{ min: 0 }}
                  value={formUnitCost}
                  onChange={(e) => setFormUnitCost(Math.max(0, parseFloat(e.target.value || '0')))}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Total Est. Cost (₹)"
                  value={`₹${(formQuantity * formUnitCost).toLocaleString()}`}
                  InputProps={{ readOnly: true }}
                  sx={{ bgcolor: 'action.hover' }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={formPriority} label="Priority" onChange={(e) => setFormPriority(e.target.value as any)}>
                    <MenuItem value="LOW">Low</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={formStatus} label="Status" onChange={(e) => setFormStatus(e.target.value as any)}>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PENDING">Pending Approval</MenuItem>
                    <MenuItem value="APPROVED">Approved</MenuItem>
                    <MenuItem value="IN_PROCUREMENT">In Procurement</MenuItem>
                    <MenuItem value="FULFILLED">Fulfilled</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Required By Date"
                  InputLabelProps={{ shrink: true }}
                  value={formRequiredByDate}
                  onChange={(e) => setFormRequiredByDate(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select value={formDepartment} label="Department" onChange={(e) => setFormDepartment(e.target.value)}>
                    <MenuItem value="Operations">Operations</MenuItem>
                    <MenuItem value="IT">IT & Infrastructure</MenuItem>
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Finance">Finance</MenuItem>
                    <MenuItem value="HR">HR & Admin</MenuItem>
                    <MenuItem value="Sales">Sales & Marketing</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Requested By"
                  value={formRequestedBy}
                  onChange={(e) => setFormRequestedBy(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="Business Justification / Reason"
                  placeholder="Explain why this requirement is needed..."
                  value={formJustification}
                  onChange={(e) => setFormJustification(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="Technical Specifications / Part Numbers"
                  placeholder="e.g. Model, specs, dimensions, brand preferences..."
                  value={formSpecifications}
                  onChange={(e) => setFormSpecifications(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="Vendor / Supplier Suggestion (Optional)"
                  placeholder="e.g. Preferred supplier or vendor contact..."
                  value={formVendorSuggestion}
                  onChange={(e) => setFormVendorSuggestion(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setIsCreateOpen(false)} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, px: 3 }}>
              {editingItem ? 'Save Changes' : 'Submit Requisition'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Requisition Detail Drawer ────────────────────────────────────────── */}
      <Drawer anchor="right" open={Boolean(selectedDetailItem)} onClose={() => setSelectedDetailItem(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
        {selectedDetailItem && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, color: '#04552B', letterSpacing: 1 }}>
                  {selectedDetailItem.id} • {selectedDetailItem.type} REQUISITION
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {selectedDetailItem.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedDetailItem(null)} size="small">
                <XCircle size={20} />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
              {getStatusChip(selectedDetailItem.status)}
              {getPriorityChip(selectedDetailItem.priority)}
              <Chip label={selectedDetailItem.category} size="small" variant="outlined" />
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Quantity
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {selectedDetailItem.quantity} {selectedDetailItem.unit}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Est. Total Cost
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#15803D' }}>
                  ₹{(selectedDetailItem.total_cost || 0).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Department
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {selectedDetailItem.department}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Requested By
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {selectedDetailItem.requested_by}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Required By Date
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {selectedDetailItem.required_by_date}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {new Date(selectedDetailItem.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>

            {selectedDetailItem.justification && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Justification
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '8px' }}>
                  <Typography variant="body2">{selectedDetailItem.justification}</Typography>
                </Paper>
              </Box>
            )}

            {selectedDetailItem.specifications && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Technical Specifications
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '8px' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {selectedDetailItem.specifications}
                  </Typography>
                </Paper>
              </Box>
            )}

            {selectedDetailItem.vendor_suggestion && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Vendor Suggestion
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '8px' }}>
                  <Typography variant="body2">{selectedDetailItem.vendor_suggestion}</Typography>
                </Paper>
              </Box>
            )}

            <Box sx={{ mt: 'auto', pt: 2, display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Edit3 size={16} />}
                onClick={() => {
                  const item = selectedDetailItem;
                  setSelectedDetailItem(null);
                  handleOpenEdit(item);
                }}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                Edit Requisition
              </Button>
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<Trash2 size={16} />}
                onClick={() => handleDeleteItem(selectedDetailItem.id)}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
