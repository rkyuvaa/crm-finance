import { useState } from 'react';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  X,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  Edit,
  Trash2,
  Eye,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joinDate: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Inactive';
  manager?: string;
  avatar?: string;
  address: string;
  bankAccount: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  hoursWorked: number;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'Sick' | 'Casual' | 'Earned' | 'Unpaid';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'Draft' | 'Processed' | 'Paid';
}

interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewer: string;
  rating: number;
  comments: string;
  date: string;
  status: 'Completed' | 'Pending';
}

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Vijay Kumar',
    email: 'vijay.kumar@company.com',
    phone: '+91 98765 43210',
    department: 'Engineering',
    designation: 'Senior Engineer',
    joinDate: '15 Jan 2022',
    salary: 750000,
    status: 'Active',
    manager: 'Rahul Sharma',
    address: '123 Tech Park, Bangalore',
    bankAccount: 'ACC-1234567890',
  },
  {
    id: 'EMP-002',
    name: 'Anisha Reddy',
    email: 'anisha.reddy@company.com',
    phone: '+91 98765 43211',
    department: 'HR',
    designation: 'HR Manager',
    joinDate: '10 Feb 2021',
    salary: 650000,
    status: 'Active',
    manager: 'Priya Singh',
    address: '456 Business Hub, Hyderabad',
    bankAccount: 'ACC-1234567891',
  },
  {
    id: 'EMP-003',
    name: 'Pooja Singh',
    email: 'pooja.singh@company.com',
    phone: '+91 98765 43212',
    department: 'Marketing',
    designation: 'Marketing Executive',
    joinDate: '20 Mar 2023',
    salary: 450000,
    status: 'Active',
    manager: 'Rajesh Verma',
    address: '789 Marketing Plaza, Delhi',
    bankAccount: 'ACC-1234567892',
  },
  {
    id: 'EMP-004',
    name: 'Deepak Joshi',
    email: 'deepak.joshi@company.com',
    phone: '+91 98765 43213',
    department: 'Finance',
    designation: 'Finance Manager',
    joinDate: '05 Jun 2020',
    salary: 800000,
    status: 'On Leave',
    manager: 'Arjun Nair',
    address: '321 Finance Tower, Mumbai',
    bankAccount: 'ACC-1234567893',
  },
  {
    id: 'EMP-005',
    name: 'Tharun Iyer',
    email: 'tharun.iyer@company.com',
    phone: '+91 98765 43214',
    department: 'Engineering',
    designation: 'Junior Engineer',
    joinDate: '12 Jul 2023',
    salary: 350000,
    status: 'Active',
    manager: 'Vijay Kumar',
    address: '654 Tech Valley, Pune',
    bankAccount: 'ACC-1234567894',
  },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'ATT-001',
    employeeId: 'EMP-001',
    employeeName: 'Vijay Kumar',
    date: '02 Sep 2026',
    checkIn: '09:15 AM',
    checkOut: '06:45 PM',
    status: 'Present',
    hoursWorked: 9.5,
  },
  {
    id: 'ATT-002',
    employeeId: 'EMP-002',
    employeeName: 'Anisha Reddy',
    date: '02 Sep 2026',
    checkIn: '09:00 AM',
    checkOut: '05:30 PM',
    status: 'Present',
    hoursWorked: 8.5,
  },
  {
    id: 'ATT-003',
    employeeId: 'EMP-003',
    employeeName: 'Pooja Singh',
    date: '02 Sep 2026',
    checkIn: '10:20 AM',
    checkOut: '06:00 PM',
    status: 'Late',
    hoursWorked: 7.67,
  },
];

const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LRQ-001',
    employeeId: 'EMP-001',
    employeeName: 'Vijay Kumar',
    startDate: '10 Sep 2026',
    endDate: '15 Sep 2026',
    type: 'Earned',
    reason: 'Personal work',
    status: 'Pending',
  },
  {
    id: 'LRQ-002',
    employeeId: 'EMP-004',
    employeeName: 'Deepak Joshi',
    startDate: '01 Sep 2026',
    endDate: '05 Sep 2026',
    type: 'Sick',
    reason: 'Medical treatment',
    status: 'Approved',
  },
];

const INITIAL_PAYROLL: PayrollRecord[] = [
  {
    id: 'PAY-001',
    employeeId: 'EMP-001',
    employeeName: 'Vijay Kumar',
    month: 'August 2026',
    baseSalary: 750000,
    allowances: 50000,
    deductions: 75000,
    netSalary: 725000,
    status: 'Paid',
  },
  {
    id: 'PAY-002',
    employeeId: 'EMP-002',
    employeeName: 'Anisha Reddy',
    month: 'August 2026',
    baseSalary: 650000,
    allowances: 45000,
    deductions: 65000,
    netSalary: 630000,
    status: 'Paid',
  },
];

const INITIAL_PERFORMANCE: PerformanceReview[] = [
  {
    id: 'PRF-001',
    employeeId: 'EMP-001',
    employeeName: 'Vijay Kumar',
    reviewer: 'Rahul Sharma',
    rating: 4.5,
    comments: 'Excellent technical skills and leadership qualities. Great team player.',
    date: '15 Aug 2026',
    status: 'Completed',
  },
  {
    id: 'PRF-002',
    employeeId: 'EMP-003',
    employeeName: 'Pooja Singh',
    reviewer: 'Rajesh Verma',
    rating: 3.8,
    comments: 'Good performance. Needs improvement in project management.',
    date: '10 Aug 2026',
    status: 'Completed',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`hr-tabpanel-${index}`}
      aria-labelledby={`hr-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function HRPage() {
  const { showToast } = useToast();
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [payroll, setPayroll] = useState<PayrollRecord[]>(INITIAL_PAYROLL);
  const [performance, setPerformance] = useState<PerformanceReview[]>(INITIAL_PERFORMANCE);

  // Dialog states
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');

  // Form states
  const [formData, setFormData] = useState<Employee>({
    id: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joinDate: '',
    salary: 0,
    status: 'Active',
    address: '',
    bankAccount: '',
  });

  const [leaveFormData, setLeaveFormData] = useState<LeaveRequest>({
    id: '',
    employeeId: '',
    employeeName: '',
    startDate: '',
    endDate: '',
    type: 'Casual',
    reason: '',
    status: 'Pending',
  });

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || emp.status === filterStatus;
    const matchesDepartment = filterDepartment === 'All' || emp.department === filterDepartment;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Add or update employee
  const handleSaveEmployee = () => {
    if (!formData.name || !formData.email || !formData.department) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (selectedEmployee) {
      setEmployees(employees.map((e) => (e.id === selectedEmployee.id ? formData : e)));
      showToast('Employee updated successfully', 'success');
    } else {
      const newEmployee = { ...formData, id: `EMP-${String(employees.length + 1).padStart(3, '0')}` };
      setEmployees([...employees, newEmployee]);
      showToast('Employee added successfully', 'success');
    }
    handleCloseEmployeeDialog();
  };

  const handleOpenEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setFormData(employee);
      setSelectedEmployee(employee);
    } else {
      setFormData({
        id: '',
        name: '',
        email: '',
        phone: '',
        department: '',
        designation: '',
        joinDate: '',
        salary: 0,
        status: 'Active',
        address: '',
        bankAccount: '',
      });
      setSelectedEmployee(null);
    }
    setEmployeeDialog(true);
  };

  const handleCloseEmployeeDialog = () => {
    setEmployeeDialog(false);
    setSelectedEmployee(null);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));
    showToast('Employee deleted successfully', 'success');
  };

  const handleApproveLeave = (id: string) => {
    setLeaveRequests(
      leaveRequests.map((lr) => (lr.id === id ? { ...lr, status: 'Approved' } : lr))
    );
    showToast('Leave request approved', 'success');
  };

  const handleRejectLeave = (id: string) => {
    setLeaveRequests(
      leaveRequests.map((lr) => (lr.id === id ? { ...lr, status: 'Rejected' } : lr))
    );
    showToast('Leave request rejected', 'success');
  };

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const presentToday = attendance.filter((a) => a.status === 'Present').length;
  const pendingLeaves = leaveRequests.filter((lr) => lr.status === 'Pending').length;
  const departments = Array.from(new Set(employees.map((e) => e.department)));

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
          <Users style={{ display: 'inline-block', marginRight: 12, color: '#087A3D' }} />
          HR & Employee Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={() => handleOpenEmployeeDialog()}
          sx={{ bgcolor: '#087A3D', textTransform: 'none', borderRadius: 1 }}
        >
          Add Employee
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#666', fontSize: 12, mb: 1 }}>Total Employees</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {employees.length}
                  </Typography>
                </Box>
                <Users size={32} style={{ color: '#087A3D', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#666', fontSize: 12, mb: 1 }}>Active Employees</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {activeEmployees}
                  </Typography>
                </Box>
                <TrendingUp size={32} style={{ color: '#4CAF50', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#666', fontSize: 12, mb: 1 }}>Present Today</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {presentToday}
                  </Typography>
                </Box>
                <Clock size={32} style={{ color: '#2196F3', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#666', fontSize: 12, mb: 1 }}>Pending Leaves</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {pendingLeaves}
                  </Typography>
                </Box>
                <Calendar size={32} style={{ color: '#FF9800', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: '1px solid #e0e0e0',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, color: '#666' },
            '& .Mui-selected': { color: '#087A3D' },
            '& .MuiTabs-indicator': { backgroundColor: '#087A3D' },
          }}
        >
          <Tab label="Employees" id="hr-tab-0" aria-controls="hr-tabpanel-0" />
          <Tab label="Attendance" id="hr-tab-1" aria-controls="hr-tabpanel-1" />
          <Tab label="Leave Requests" id="hr-tab-2" aria-controls="hr-tabpanel-2" />
          <Tab label="Payroll" id="hr-tab-3" aria-controls="hr-tabpanel-3" />
          <Tab label="Performance" id="hr-tab-4" aria-controls="hr-tabpanel-4" />
        </Tabs>

        {/* Employees Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8 }} /> }}
              size="small"
              sx={{ flex: 1, maxWidth: 300 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={filterDepartment}
                label="Department"
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Designation</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Salary</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#087A3D' }}>
                          {emp.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{emp.name}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#666' }}>{emp.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>₹{(emp.salary / 100000).toFixed(1)}L</TableCell>
                    <TableCell>
                      <Chip
                        label={emp.status}
                        size="small"
                        sx={{
                          bgcolor:
                            emp.status === 'Active'
                              ? '#e8f5e9'
                              : emp.status === 'On Leave'
                                ? '#fff3e0'
                                : '#f5f5f5',
                          color:
                            emp.status === 'Active'
                              ? '#2e7d32'
                              : emp.status === 'On Leave'
                                ? '#e65100'
                                : '#666',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEmployeeDialog(emp)}>
                        <Edit size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteEmployee(emp.id)}>
                        <Trash2 size={16} style={{ color: '#d32f2f' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Check Out</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Hours Worked</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                    <TableCell>{record.employeeName}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.checkIn}</TableCell>
                    <TableCell>{record.checkOut}</TableCell>
                    <TableCell>{record.hoursWorked.toFixed(1)} hrs</TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        size="small"
                        sx={{
                          bgcolor:
                            record.status === 'Present'
                              ? '#e8f5e9'
                              : record.status === 'Late'
                                ? '#fff3e0'
                                : '#ffebee',
                          color:
                            record.status === 'Present'
                              ? '#2e7d32'
                              : record.status === 'Late'
                                ? '#e65100'
                                : '#c62828',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Leave Requests Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveRequests.map((leave) => (
                  <TableRow key={leave.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                    <TableCell>{leave.employeeName}</TableCell>
                    <TableCell>
                      <Chip label={leave.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{leave.startDate}</TableCell>
                    <TableCell>{leave.endDate}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <Chip
                        label={leave.status}
                        size="small"
                        sx={{
                          bgcolor:
                            leave.status === 'Approved'
                              ? '#e8f5e9'
                              : leave.status === 'Pending'
                                ? '#fff3e0'
                                : '#ffebee',
                          color:
                            leave.status === 'Approved'
                              ? '#2e7d32'
                              : leave.status === 'Pending'
                                ? '#e65100'
                                : '#c62828',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {leave.status === 'Pending' && (
                        <>
                          <Button
                            size="small"
                            onClick={() => handleApproveLeave(leave.id)}
                            sx={{ color: '#2e7d32', textTransform: 'none' }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleRejectLeave(leave.id)}
                            sx={{ color: '#c62828', textTransform: 'none' }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Payroll Tab */}
        <TabPanel value={tabValue} index={3}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Base Salary
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Allowances
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Deductions
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Net Salary
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payroll.map((record) => (
                  <TableRow key={record.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                    <TableCell>{record.employeeName}</TableCell>
                    <TableCell>{record.month}</TableCell>
                    <TableCell align="right">₹{record.baseSalary.toLocaleString()}</TableCell>
                    <TableCell align="right">₹{record.allowances.toLocaleString()}</TableCell>
                    <TableCell align="right">₹{record.deductions.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ₹{record.netSalary.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        size="small"
                        sx={{
                          bgcolor: record.status === 'Paid' ? '#e8f5e9' : '#fff3e0',
                          color: record.status === 'Paid' ? '#2e7d32' : '#e65100',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={2}>
            {performance.map((review) => (
              <Grid item xs={12} md={6} key={review.id}>
                <Card sx={{ bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{review.employeeName}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#666' }}>Reviewed by {review.reviewer}</Typography>
                      </Box>
                      <Chip
                        label={review.status}
                        size="small"
                        sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography sx={{ fontSize: 12, color: '#666' }}>Rating:</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#087A3D' }}>
                          {review.rating} / 5.0
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(review.rating / 5) * 100}
                        sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0' }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: 13, color: '#555', mb: 1 }}>{review.comments}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#999' }}>{review.date}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={employeeDialog} onClose={handleCloseEmployeeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Designation"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Salary"
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Join Date"
            type="date"
            value={formData.joinDate}
            onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            margin="normal"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee['status'] })}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="On Leave">On Leave</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmployeeDialog}>Cancel</Button>
          <Button onClick={handleSaveEmployee} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
