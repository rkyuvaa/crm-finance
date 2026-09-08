import { useState, useMemo, useEffect } from 'react';
import { useGetDepartmentsQuery } from '../../api/rbacApi';
import { useBranchesQuery } from '../../api/mastersApi';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Tooltip,
  Stack,
  Divider,
  Checkbox,
  Menu,
} from '@mui/material';
import {
  Search,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X as XIcon,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  Building2,
  UserCheck,
  CheckSquare,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';
import UniversalImportModal from '@/components/ui/UniversalImportModal';

export interface EmployeeRecord {
  id: string;
  emp_id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  branch: string;
  shift: string;
  status: 'Active' | 'Inactive';
  joining_date: string;
  biometric_id: string;
  gross_salary: string;
  uan: string;
  esi_number: string;
  reporting_manager: string;
  cc_persons: string;
  linked_user: string;
  salary_category: string;
}
const INITIAL_EMPLOYEES: EmployeeRecord[] = [];


const DEFAULT_FORM: Omit<EmployeeRecord, 'id'> = {
  emp_id: 'EMP-028',
  name: '',
  email: '',
  phone: '',
  designation: '',
  department: 'Management',
  branch: 'Coimbatore Office',
  shift: 'KIM Office',
  status: 'Active',
  joining_date: new Date().toISOString().split('T')[0],
  biometric_id: '',
  gross_salary: '',
  uan: '',
  esi_number: '',
  reporting_manager: 'Nickendra M (CEO)',
  cc_persons: '',
  linked_user: '',
  salary_category: 'Executive',
};

export default function EmployeeMaster() {
  const { showToast } = useToast();

  const { data: deptsList = [] } = useGetDepartmentsQuery();
  const departmentOptions = useMemo(() => {
    if (deptsList && deptsList.length > 0) {
      return deptsList.filter((d: any) => d.status !== 'INACTIVE').map((d: any) => d.name);
    }
    return [];
  }, [deptsList]);

  const [branchUpdateVer, setBranchUpdateVer] = useState(0);
  useEffect(() => {
    const handleBranchUpdate = () => setBranchUpdateVer((v) => v + 1);
    window.addEventListener('crm_branches_changed', handleBranchUpdate);
    window.addEventListener('storage', handleBranchUpdate);
    return () => {
      window.removeEventListener('crm_branches_changed', handleBranchUpdate);
      window.removeEventListener('storage', handleBranchUpdate);
    };
  }, []);

  const { data: apiBranches = [] } = useBranchesQuery();
  const branchOptions = useMemo(() => {
    const list: string[] = [];

    // 1. From backend API
    if (Array.isArray(apiBranches) && apiBranches.length > 0) {
      apiBranches.forEach((b: any) => {
        if (b.name && b.is_active !== false && !list.includes(b.name)) {
          list.push(b.name);
        }
      });
    }

    // 2. From Settings > Branches (Local Storage)
    try {
      const saved = localStorage.getItem('crm_branches_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((b: any) => {
            if (b.name && b.status !== 'INACTIVE' && b.is_active !== false && !list.includes(b.name)) {
              list.push(b.name);
            }
          });
        }
      }
    } catch {}

    return list;
  }, [apiBranches, branchUpdateVer]);


  // Load employees from localStorage if available so deletions and additions persist on page refresh
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('crm_employee_master_data');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback if parsing fails
    }
    return INITIAL_EMPLOYEES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_employee_master_data', JSON.stringify(employees));
    } catch {
      // Ignore write errors
    }
  }, [employees]);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Multi-Selection State
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Dialog States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<EmployeeRecord, 'id'>>(DEFAULT_FORM);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sort State
  const [sortField, setSortField] = useState<keyof EmployeeRecord>('emp_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtered & Sorted Employees List
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        if (!emp) return false;
        const query = (searchTerm || '').toLowerCase();
        return (
          (emp.emp_id || '').toLowerCase().includes(query) ||
          (emp.name || '').toLowerCase().includes(query) ||
          (emp.email || '').toLowerCase().includes(query) ||
          (emp.designation || '').toLowerCase().includes(query) ||
          (emp.department || '').toLowerCase().includes(query) ||
          (emp.branch || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const valA = a[sortField] || '';
        const valB = b[sortField] || '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [employees, searchTerm, sortField, sortOrder]);

  const handleSort = (field: keyof EmployeeRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmpIds(filteredEmployees.map((emp) => emp.id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkChangeStatus = (newStatus: 'Active' | 'Inactive') => {
    if (selectedEmpIds.length === 0) return;
    setEmployees((prev) =>
      prev.map((emp) => (selectedEmpIds.includes(emp.id) ? { ...emp, status: newStatus } : emp))
    );
    showToast(`Updated status to ${newStatus} for ${selectedEmpIds.length} employee(s)`, 'success');
  };

  const handleBulkChangeDepartment = (dept: string) => {
    if (selectedEmpIds.length === 0 || !dept) return;
    setEmployees((prev) =>
      prev.map((emp) => (selectedEmpIds.includes(emp.id) ? { ...emp, department: dept } : emp))
    );
    showToast(`Updated department to ${dept} for ${selectedEmpIds.length} employee(s)`, 'success');
  };

  const handleBulkChangeBranch = (branch: string) => {
    if (selectedEmpIds.length === 0 || !branch) return;
    setEmployees((prev) =>
      prev.map((emp) => (selectedEmpIds.includes(emp.id) ? { ...emp, branch } : emp))
    );
    showToast(`Updated branch to ${branch} for ${selectedEmpIds.length} employee(s)`, 'success');
  };

  const handleBulkChangeShift = (shift: string) => {
    if (selectedEmpIds.length === 0 || !shift) return;
    setEmployees((prev) =>
      prev.map((emp) => (selectedEmpIds.includes(emp.id) ? { ...emp, shift } : emp))
    );
    showToast(`Updated shift to ${shift} for ${selectedEmpIds.length} employee(s)`, 'success');
  };

  const handleExportSelected = () => {
    const selectedEmps = employees.filter((emp) => selectedEmpIds.includes(emp.id));
    if (selectedEmps.length === 0) return;

    const headers = [
      'Employee ID',
      'Name',
      'Email',
      'Phone',
      'Designation',
      'Department',
      'Branch',
      'Shift',
      'Status',
      'Joining Date',
      'UAN',
      'ESI Number',
      'Reporting Manager',
    ];

    const rows = selectedEmps.map((emp) => [
      emp.emp_id,
      emp.name,
      emp.email,
      emp.phone,
      emp.designation,
      emp.department,
      emp.branch,
      emp.shift,
      emp.status,
      emp.joining_date,
      emp.uan,
      emp.esi_number,
      emp.reporting_manager,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val || ''}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employees_bulk_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${selectedEmps.length} selected employees to CSV`, 'success');
  };

  const handleConfirmBulkDelete = () => {
    setEmployees((prev) => prev.filter((emp) => !selectedEmpIds.includes(emp.id)));
    showToast(`Deleted ${selectedEmpIds.length} employee records`, 'success');
    setSelectedEmpIds([]);
    setBulkDeleteConfirmOpen(false);
  };

  // Open Modal for Create
  const handleOpenCreate = () => {
    const nextNum = employees.length + 1;
    const nextEmpId = `EMP-${String(nextNum).padStart(3, '0')}`;
    setEditingId(null);
    setFormData({
      ...DEFAULT_FORM,
      emp_id: nextEmpId,
    });
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (emp: EmployeeRecord) => {
    setEditingId(emp.id);
    setFormData({
      emp_id: emp.emp_id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department,
      branch: emp.branch,
      shift: emp.shift,
      status: emp.status,
      joining_date: emp.joining_date,
      biometric_id: emp.biometric_id,
      gross_salary: emp.gross_salary,
      uan: emp.uan,
      esi_number: emp.esi_number,
      reporting_manager: emp.reporting_manager,
      cc_persons: emp.cc_persons,
      linked_user: emp.linked_user,
      salary_category: emp.salary_category,
    });
    setModalOpen(true);
  };

  // Toggle Active / Inactive
  const handleToggleStatus = (id: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
          showToast(`Employee ${emp.emp_id} status updated to ${newStatus}`, 'success');
          return { ...emp, status: newStatus };
        }
        return emp;
      })
    );
  };

  // Delete Employee
  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    setEmployees((prev) => prev.filter((e) => e.id !== deleteConfirmId));
    showToast('Employee record deleted', 'success');
    setDeleteConfirmId(null);
  };

  // Save Employee Form (Add or Edit)
  const handleSaveEmployee = () => {
    if (!formData.name || !formData.emp_id) {
      showToast('Please enter Employee Name and ID', 'error');
      return;
    }

    if (editingId) {
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === editingId ? { ...emp, ...formData } : emp))
      );
      showToast(`Employee ${formData.emp_id} updated successfully`, 'success');
    } else {
      const newEmp: EmployeeRecord = {
        id: String(Date.now()),
        ...formData,
      };
      setEmployees([newEmp, ...employees]);
      showToast(`Employee ${formData.emp_id} created successfully`, 'success');
    }

    setModalOpen(false);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Bar */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Employee Master
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<Upload size={18} />}
            onClick={() => setImportDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: '#334155',
              borderColor: '#cbd5e1',
              bgcolor: '#ffffff',
              borderRadius: 2,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
            }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreate}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#087A3D',
              borderRadius: 2,
              px: 2.5,
              '&:hover': { bgcolor: '#066231' },
            }}
          >
            Add Employee
          </Button>
        </Stack>
      </Box>

      {/* Search Input Bar */}
      <Box sx={{ px: 2, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, ID or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search size={18} style={{ marginRight: 10, color: '#64748b' }} />,
          }}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              borderColor: '#e2e8f0',
            },
          }}
        />
      </Box>

      {/* Bulk Action Toolbar */}
      {selectedEmpIds.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            mx: 2,
            mb: 2,
            p: 1.5,
            bgcolor: '#152518',
            color: '#FFFFFF',
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            border: '1px solid #087A3D',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              label={`${selectedEmpIds.length} Selected`}
              size="small"
              sx={{ bgcolor: '#087A3D', color: '#FFF', fontWeight: 700, fontSize: 12 }}
            />
            <Button
              size="small"
              onClick={() => setSelectedEmpIds([])}
              sx={{ textTransform: 'none', color: '#A0B2A6', fontSize: 12, '&:hover': { color: '#FFF' } }}
            >
              Clear Selection
            </Button>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Set Status Dropdown */}
            <Select
              size="small"
              displayEmpty
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkChangeStatus(e.target.value as any);
              }}
              renderValue={() => 'Set Status'}
              sx={{
                bgcolor: '#233827',
                color: '#FFF',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 1.5,
                minWidth: 120,
                '& .MuiSelect-icon': { color: '#4ADE80' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              <MenuItem value="" disabled>Select Status</MenuItem>
              <MenuItem value="Active">Set Active</MenuItem>
              <MenuItem value="Inactive">Set Inactive</MenuItem>
            </Select>

            {/* Set Department Dropdown */}
            <Select
              size="small"
              displayEmpty
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkChangeDepartment(e.target.value);
              }}
              renderValue={() => 'Set Department'}
              sx={{
                bgcolor: '#233827',
                color: '#FFF',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 1.5,
                minWidth: 140,
                '& .MuiSelect-icon': { color: '#4ADE80' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              <MenuItem value="" disabled>Select Department</MenuItem>
              <MenuItem value="Management">Management</MenuItem>
              <MenuItem value="NPD">NPD</MenuItem>
              <MenuItem value="Accounts">Accounts</MenuItem>
              <MenuItem value="Service">Service</MenuItem>
              <MenuItem value="Stores">Stores</MenuItem>
              <MenuItem value="SCM">SCM</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
            </Select>

            {/* Set Branch Dropdown */}
            <Select
              size="small"
              displayEmpty
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkChangeBranch(e.target.value);
              }}
              renderValue={() => 'Set Branch'}
              sx={{
                bgcolor: '#233827',
                color: '#FFF',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 1.5,
                minWidth: 130,
                '& .MuiSelect-icon': { color: '#4ADE80' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              }}
            >
              <MenuItem value="" disabled>Select Branch</MenuItem>
              {branchOptions.length === 0 ? (
                <MenuItem value="" disabled>No Branches in Settings</MenuItem>
              ) : (
                branchOptions.map((b) => (
                  <MenuItem key={b} value={b}>{b}</MenuItem>
                ))
              )}
            </Select>

            {/* Export Selected Button */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download size={15} />}
              onClick={handleExportSelected}
              sx={{
                textTransform: 'none',
                color: '#4ADE80',
                borderColor: '#233827',
                fontWeight: 600,
                fontSize: 12.5,
                bgcolor: '#233827',
                '&:hover': { bgcolor: '#2C442E', borderColor: '#087A3D' },
              }}
            >
              Export Selected
            </Button>

            {/* Delete Selected Button */}
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<Trash2 size={15} />}
              onClick={() => setBulkDeleteConfirmOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 1.5,
              }}
            >
              Delete Selected ({selectedEmpIds.length})
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Main Employee Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedEmpIds.length > 0 && selectedEmpIds.length < filteredEmployees.length
                  }
                  checked={
                    filteredEmployees.length > 0 && selectedEmpIds.length === filteredEmployees.length
                  }
                  onChange={handleSelectAll}
                  size="small"
                  sx={{ color: '#64748b', '&.Mui-checked': { color: '#087A3D' }, '&.MuiCheckbox-indeterminate': { color: '#087A3D' } }}
                />
              </TableCell>
              <TableCell onClick={() => handleSort('emp_id')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  EMP ID {sortField === 'emp_id' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('name')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  NAME {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('designation')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  DESIGNATION {sortField === 'designation' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('department')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  DEPARTMENT {sortField === 'department' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('branch')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  BRANCH {sortField === 'branch' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('shift')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  SHIFT {sortField === 'shift' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell onClick={() => handleSort('status')} sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#475569' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  STATUS {sortField === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748b' }}>
                  No employee records found matching "{searchTerm}"
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id} hover selected={selectedEmpIds.includes(emp.id)} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedEmpIds.includes(emp.id)}
                      onChange={() => handleSelectOne(emp.id)}
                      size="small"
                      sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#087A3D' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#087A3D', fontSize: 13 }}>
                    {emp.emp_id}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                    {emp.name}
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 13 }}>
                    {emp.designation}
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 13 }}>
                    {emp.department}
                  </TableCell>
                  <TableCell sx={{ color: '#475569', fontSize: 13 }}>
                    {emp.branch}
                  </TableCell>
                  <TableCell sx={{ color: '#475569', fontSize: 13 }}>
                    {emp.shift}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={emp.status}
                      size="small"
                      sx={{
                        bgcolor: emp.status === 'Active' ? '#e6f4ea' : '#fce8e6',
                        color: emp.status === 'Active' ? '#047857' : '#c5221f',
                        fontWeight: 700,
                        fontSize: 11.5,
                        height: 24,
                        borderRadius: 999,
                        px: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Edit Employee">
                        <IconButton size="small" onClick={() => handleOpenEdit(emp)} sx={{ color: '#64748b', '&:hover': { color: '#087A3D', bgcolor: '#f0fdf4' } }}>
                          <Edit2 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={emp.status === 'Active' ? 'Set Inactive' : 'Set Active'}>
                        <IconButton size="small" onClick={() => handleToggleStatus(emp.id)} sx={{ color: '#047857', '&:hover': { bgcolor: '#f0fdf4' } }}>
                          {emp.status === 'Active' ? <Eye size={16} /> : <EyeOff size={16} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Employee">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirmId(emp.id)}
                          sx={{
                            color: '#dc2626',
                            bgcolor: '#fef2f2',
                            borderRadius: 1.5,
                            ml: 0.5,
                            '&:hover': { bgcolor: '#fee2e2' },
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 2-Column Add / Edit Employee Dialog (Exact match to Image 1) */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pt: 2, px: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {editingId ? 'Edit Employee' : 'Add Employee'}
          </Typography>
          <IconButton onClick={() => setModalOpen(false)} size="small" sx={{ color: '#64748b' }}>
            <XIcon size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2 }}>
          <Grid container spacing={2}>
            {/* Row 1: Employee ID & Full Name */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Employee ID
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.emp_id}
                onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                placeholder="EMP-001"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Full Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full Name"
              />
            </Grid>

            {/* Row 2: Email & Phone */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email Address"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Phone
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone Number"
              />
            </Grid>

            {/* Row 3: Designation & Department Name */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Designation
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Designation"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Department Name
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <MenuItem value="— Select —">— Select —</MenuItem>
                {departmentOptions.length === 0 ? (
                  <MenuItem value="" disabled>No Departments in Settings</MenuItem>
                ) : (
                  departmentOptions.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))
                )}
              </Select>
            </Grid>

            {/* Row 4: Branch Name & Manager Name */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Branch Name
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              >
                <MenuItem value="— Select —">— Select —</MenuItem>
                {branchOptions.length === 0 ? (
                  <MenuItem value="" disabled>No Branches in Settings</MenuItem>
                ) : (
                  branchOptions.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))
                )}
              </Select>

            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Manager Name
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.reporting_manager}
                onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}
              >
                <MenuItem value="— Select Manager —">— Select Manager —</MenuItem>
                <MenuItem value="Nickendra M">Nickendra M</MenuItem>
                <MenuItem value="Edwin Ezhilarasu">Edwin Ezhilarasu</MenuItem>
                <MenuItem value="Akshay Jith P P">Akshay Jith P P</MenuItem>
                <MenuItem value="Harish A">Harish A</MenuItem>
              </Select>
            </Grid>

            {/* Row 5: Shift Name & Date of Joining */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Shift Name
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
              >
                <MenuItem value="— Select —">— Select —</MenuItem>
                <MenuItem value="KIM Office">KIM Office</MenuItem>
                <MenuItem value="Bangalore office">Bangalore office</MenuItem>
                <MenuItem value="Night Shift">Night Shift</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Date of Joining
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Row 6: UAN & ESI Number */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                UAN
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.uan}
                onChange={(e) => setFormData({ ...formData, uan: e.target.value })}
                placeholder="Universal Account Number"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                ESI Number
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.esi_number}
                onChange={(e) => setFormData({ ...formData, esi_number: e.target.value })}
                placeholder="ESI Number"
              />
            </Grid>

            {/* Row 7: Status */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', mb: 0.5, display: 'block' }}>
                Status
              </Typography>
              <Select
                fullWidth
                size="small"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEmployee}
            variant="contained"
            sx={{ bgcolor: '#087A3D', textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { bgcolor: '#066231' } }}
          >
            {editingId ? 'Save Changes' : 'Add Employee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV/Excel Import Modal */}
      <UniversalImportModal
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Import Employees"
        entityName="Employees"
        erpFields={[
          { key: 'emp_id', label: 'Employee ID', required: true },
          { key: 'name', label: 'Full Name', required: true },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'designation', label: 'Designation' },
          { key: 'department', label: 'Department Name' },
          { key: 'branch', label: 'Branch Name' },
          { key: 'reporting_manager', label: 'Manager Name' },
          { key: 'shift', label: 'Shift Name' },
          { key: 'joining_date', label: 'Date of Joining' },
          { key: 'uan', label: 'UAN' },
          { key: 'esi_number', label: 'ESI Number' },
          { key: 'status', label: 'Status' },
        ]}
        onImport={(mappedRows) => {
          const newEmps: EmployeeRecord[] = mappedRows.map((r, i) => ({
            id: String(Date.now() + i),
            emp_id: r.emp_id || `EMP-${Math.floor(100 + Math.random() * 900)}`,
            name: r.name || 'Imported Employee',
            email: r.email || '',
            phone: r.phone || '',
            designation: r.designation || 'Staff',
            department: r.department || 'Accounts',
            branch: r.branch || 'Coimbatore Office',
            shift: r.shift || 'KIM Office',
            status: r.status === 'Inactive' ? 'Inactive' : 'Active',
            joining_date: r.joining_date || new Date().toISOString().split('T')[0],
            biometric_id: r.biometric_id || '',
            gross_salary: r.gross_salary || '50000',
            uan: r.uan || '',
            esi_number: r.esi_number || '',
            reporting_manager: r.reporting_manager || 'Nickendra M',
            cc_persons: '',
            linked_user: '',
            salary_category: 'Staff',
          }));
          setEmployees((prev) => [...newEmps, ...prev]);
          return newEmps.length;
        }}
      />

      {/* Single Item Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Employee Record?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Are you sure you want to delete this employee record? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Selected Employees?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Are you sure you want to delete {selectedEmpIds.length} employee records? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmBulkDelete} variant="contained" color="error">
            Delete {selectedEmpIds.length} Records
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
