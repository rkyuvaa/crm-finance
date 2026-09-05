import { useState, useMemo, useEffect } from 'react';
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

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: '1',
    emp_id: 'EMP-001',
    name: 'Nickendra M',
    email: 'nickendra.m@kim.com',
    phone: '+91 98765 43210',
    designation: 'CEO',
    department: 'Management',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2020-01-15',
    biometric_id: 'BIO-001',
    gross_salary: '150000',
    uan: '100987654321',
    esi_number: '3100987654',
    reporting_manager: 'Board of Directors',
    cc_persons: 'hr@kim.com',
    linked_user: 'Nickendra (Admin)',
    salary_category: 'Executive',
  },
  {
    id: '2',
    emp_id: 'EMP-002',
    name: 'Akshay Jith P P',
    email: 'akshay.jith@kim.com',
    phone: '+91 98765 43211',
    designation: 'NPD Manager',
    department: 'NPD',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2021-03-10',
    biometric_id: 'BIO-002',
    gross_salary: '95000',
    uan: '100987654322',
    esi_number: '3100987655',
    reporting_manager: 'Nickendra M',
    cc_persons: 'nickendra.m@kim.com',
    linked_user: 'Akshay Jith',
    salary_category: 'Management',
  },
  {
    id: '3',
    emp_id: 'EMP-003',
    name: 'Three Vishnu',
    email: 'three.vishnu@kim.com',
    phone: '+91 98765 43212',
    designation: 'Testing & Validation Engineer',
    department: 'NPD',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2022-06-01',
    biometric_id: 'BIO-003',
    gross_salary: '65000',
    uan: '100987654323',
    esi_number: '3100987656',
    reporting_manager: 'Akshay Jith P P',
    cc_persons: 'akshay.jith@kim.com',
    linked_user: 'Three Vishnu',
    salary_category: 'Staff',
  },
  {
    id: '4',
    emp_id: 'EMP-004',
    name: 'Edwin Ezhilarasu',
    email: 'edwin.e@kim.com',
    phone: '+91 98765 43213',
    designation: 'Chief Operating Officer',
    department: 'Management',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2020-04-01',
    biometric_id: 'BIO-004',
    gross_salary: '135000',
    uan: '100987654324',
    esi_number: '3100987657',
    reporting_manager: 'Nickendra M',
    cc_persons: 'hr@kim.com',
    linked_user: 'Edwin Ezhilarasu',
    salary_category: 'Executive',
  },
  {
    id: '5',
    emp_id: 'EMP-005',
    name: 'Naveen Raman',
    email: 'naveen.r@kim.com',
    phone: '+91 98765 43214',
    designation: 'Accounts Manager',
    department: 'Accounts',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Inactive',
    joining_date: '2021-08-15',
    biometric_id: 'BIO-005',
    gross_salary: '80000',
    uan: '100987654325',
    esi_number: '3100987658',
    reporting_manager: 'Edwin Ezhilarasu',
    cc_persons: 'edwin.e@kim.com',
    linked_user: 'Naveen Raman',
    salary_category: 'Management',
  },
  {
    id: '6',
    emp_id: 'EMP-006',
    name: 'Yuvanesh Kumar',
    email: 'yuvanesh.k@kim.com',
    phone: '+91 98765 43215',
    designation: 'NPD Integration Engineer',
    department: 'NPD',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2022-11-20',
    biometric_id: 'BIO-006',
    gross_salary: '60000',
    uan: '100987654326',
    esi_number: '3100987659',
    reporting_manager: 'Akshay Jith P P',
    cc_persons: 'akshay.jith@kim.com',
    linked_user: 'Yuvanesh Kumar',
    salary_category: 'Staff',
  },
  {
    id: '7',
    emp_id: 'EMP-007',
    name: 'Satishkumar M',
    email: 'satishkumar.m@kim.com',
    phone: '+91 98765 43216',
    designation: 'NPD Integration Engineer',
    department: 'NPD',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2023-01-10',
    biometric_id: 'BIO-007',
    gross_salary: '62000',
    uan: '100987654327',
    esi_number: '3100987660',
    reporting_manager: 'Akshay Jith P P',
    cc_persons: 'akshay.jith@kim.com',
    linked_user: 'Satishkumar M',
    salary_category: 'Staff',
  },
  {
    id: '8',
    emp_id: 'EMP-008',
    name: 'Suthith RaviChandran',
    email: 'suthith.r@kim.com',
    phone: '+91 98765 43217',
    designation: 'Engineer',
    department: 'Service',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2023-02-01',
    biometric_id: 'BIO-008',
    gross_salary: '55000',
    uan: '100987654328',
    esi_number: '3100987661',
    reporting_manager: 'Harish A',
    cc_persons: 'harish.a@kim.com',
    linked_user: 'Suthith R',
    salary_category: 'Staff',
  },
  {
    id: '9',
    emp_id: 'EMP-009',
    name: 'Vijaya Kumar',
    email: 'vijaya.k@kim.com',
    phone: '+91 98765 43218',
    designation: 'Project Manager',
    department: 'NPD',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Inactive',
    joining_date: '2021-05-12',
    biometric_id: 'BIO-009',
    gross_salary: '90000',
    uan: '100987654329',
    esi_number: '3100987662',
    reporting_manager: 'Nickendra M',
    cc_persons: 'nickendra.m@kim.com',
    linked_user: 'Vijaya Kumar',
    salary_category: 'Management',
  },
  {
    id: '10',
    emp_id: 'EMP-010',
    name: 'Vinoth S',
    email: 'vinoth.s@kim.com',
    phone: '+91 98765 43219',
    designation: 'Stores and Purchase Coordinator',
    department: 'Stores',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2022-09-15',
    biometric_id: 'BIO-010',
    gross_salary: '52000',
    uan: '100987654330',
    esi_number: '3100987663',
    reporting_manager: 'Kalimuthu P',
    cc_persons: 'kalimuthu.p@kim.com',
    linked_user: 'Vinoth S',
    salary_category: 'Staff',
  },
  {
    id: '11',
    emp_id: 'EMP-011',
    name: 'Kalimuthu P',
    email: 'kalimuthu.p@kim.com',
    phone: '+91 98765 43220',
    designation: 'SCM Manager',
    department: 'SCM',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Inactive',
    joining_date: '2020-11-01',
    biometric_id: 'BIO-011',
    gross_salary: '88000',
    uan: '100987654331',
    esi_number: '3100987664',
    reporting_manager: 'Edwin Ezhilarasu',
    cc_persons: 'edwin.e@kim.com',
    linked_user: 'Kalimuthu P',
    salary_category: 'Management',
  },
  {
    id: '12',
    emp_id: 'EMP-012',
    name: 'Harish A',
    email: 'harish.a@kim.com',
    phone: '+91 98765 43221',
    designation: 'Sales and Service Manager',
    department: 'Sales',
    branch: 'Bangalore Office',
    shift: 'Bangalore office',
    status: 'Active',
    joining_date: '2021-12-01',
    biometric_id: 'BIO-012',
    gross_salary: '92000',
    uan: '100987654332',
    esi_number: '3100987665',
    reporting_manager: 'Edwin Ezhilarasu',
    cc_persons: 'edwin.e@kim.com',
    linked_user: 'Harish A',
    salary_category: 'Management',
  },
  {
    id: '13',
    emp_id: 'EMP-013',
    name: 'Sathish N',
    email: 'sathish.n@kim.com',
    phone: '+91 98765 43222',
    designation: 'Quality Manager',
    department: '—',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Inactive',
    joining_date: '2022-04-18',
    biometric_id: 'BIO-013',
    gross_salary: '85000',
    uan: '100987654333',
    esi_number: '3100987666',
    reporting_manager: 'Akshay Jith P P',
    cc_persons: 'akshay.jith@kim.com',
    linked_user: 'Sathish N',
    salary_category: 'Management',
  },
  {
    id: '14',
    emp_id: 'EMP-014',
    name: 'Ramesh Kumar Y',
    email: 'ramesh.y@kim.com',
    phone: '+91 98765 43223',
    designation: 'IT Manager',
    department: 'IT',
    branch: 'Coimbatore Office',
    shift: 'KIM Office',
    status: 'Active',
    joining_date: '2020-09-01',
    biometric_id: 'BIO-014',
    gross_salary: '98000',
    uan: '100987654334',
    esi_number: '3100987667',
    reporting_manager: 'Nickendra M',
    cc_persons: 'nickendra.m@kim.com',
    linked_user: 'Ramesh Kumar Y',
    salary_category: 'Management',
  },
];

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

      {/* Main Employee Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
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
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748b' }}>
                  No employee records found matching "{searchTerm}"
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
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
                <MenuItem value="Management">Management</MenuItem>
                <MenuItem value="NPD">NPD</MenuItem>
                <MenuItem value="Accounts">Accounts</MenuItem>
                <MenuItem value="Service">Service</MenuItem>
                <MenuItem value="Stores">Stores</MenuItem>
                <MenuItem value="SCM">SCM</MenuItem>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="IT">IT</MenuItem>
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
                <MenuItem value="Coimbatore Office">Coimbatore Office</MenuItem>
                <MenuItem value="Bangalore Office">Bangalore Office</MenuItem>
                <MenuItem value="Chennai Branch">Chennai Branch</MenuItem>
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
        sampleHeaders={['Employee ID', 'Full Name', 'Email', 'Phone', 'Designation', 'Department Name', 'Branch Name', 'Manager Name', 'Shift Name', 'Date of Joining', 'UAN', 'ESI Number', 'Status']}
        onImport={(rows) => {
          const newEmps: EmployeeRecord[] = rows.map((r, i) => ({
            id: String(Date.now() + i),
            emp_id: r['Employee ID'] || r['emp_id'] || `EMP-${Math.floor(100 + Math.random() * 900)}`,
            name: r['Full Name'] || r['Name'] || r['name'] || 'Imported Employee',
            email: r['Email'] || r['email'] || '',
            phone: r['Phone'] || r['phone'] || '',
            designation: r['Designation'] || r['designation'] || 'Staff',
            department: r['Department Name'] || r['Department'] || r['department'] || 'Accounts',
            branch: r['Branch Name'] || r['Branch'] || r['branch'] || 'Coimbatore Office',
            shift: r['Shift Name'] || r['Shift'] || r['shift'] || 'KIM Office',
            status: (r['Status'] || r['status']) === 'Inactive' ? 'Inactive' : 'Active',
            joining_date: r['Date of Joining'] || r['joining_date'] || new Date().toISOString().split('T')[0],
            biometric_id: r['biometric_id'] || '',
            gross_salary: r['gross_salary'] || '50000',
            uan: r['UAN'] || r['uan'] || '',
            esi_number: r['ESI Number'] || r['esi_number'] || '',
            reporting_manager: r['Manager Name'] || r['reporting_manager'] || 'Nickendra M',
            cc_persons: '',
            linked_user: '',
            salary_category: 'Staff',
          }));
          setEmployees((prev) => [...newEmps, ...prev]);
          return newEmps.length;
        }}
      />

      {/* Delete Confirmation Modal */}
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
    </Box>
  );
}
