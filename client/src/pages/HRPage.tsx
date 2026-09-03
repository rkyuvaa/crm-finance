import { useState } from 'react';
import {
  Avatar,
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
  Alert,
} from '@mui/material';
import {
  Users,
  Plus,
  Search,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Edit,
  Trash2,
  Check,
  X as XIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';
import {
  useListAttendanceQuery,
  useCreateAttendanceMutation,
  useUpdateAttendanceMutation,
  useDeleteAttendanceMutation,
  useListLeaveRequestsQuery,
  useCreateLeaveRequestMutation,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useListPayrollQuery,
  useCreatePayrollRecordMutation,
  useUpdatePayrollRecordMutation,
  useListPerformanceReviewsQuery,
  useCreatePerformanceReviewMutation,
  type Attendance,
  type LeaveRequest,
  type PayrollRecord,
  type PerformanceReview,
} from '@/api/hrApi';



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

  // RTK Query hooks
  const { data: attendanceRecords = [], isLoading: attendanceLoading, error: attendanceError } = useListAttendanceQuery();
  const { data: leaveRequests = [], isLoading: leaveLoading, error: leaveError } = useListLeaveRequestsQuery();
  const { data: payrollRecords = [], isLoading: payrollLoading, error: payrollError } = useListPayrollQuery();
  const { data: performanceReviews = [], isLoading: perfLoading, error: perfError } = useListPerformanceReviewsQuery();

  // Mutations
  const [createAttendance] = useCreateAttendanceMutation();
  const [deleteAttendance] = useDeleteAttendanceMutation();
  const [approveLeave] = useApproveLeaveRequestMutation();
  const [rejectLeave] = useRejectLeaveRequestMutation();

  // Dialog states
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Form states
  const [attendanceForm, setAttendanceForm] = useState({
    user_id: 1,
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    status: 'PRESENT' as const,
    notes: '',
  });

  const handleSaveAttendance = async () => {
    try {
      if (!attendanceForm.user_id || !attendanceForm.attendance_date || !attendanceForm.status) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      await createAttendance({
        ...attendanceForm,
        check_in_time: attendanceForm.check_in_time || null,
        check_out_time: attendanceForm.check_out_time || null,
      }).unwrap();

      showToast('Attendance record created successfully', 'success');
      handleCloseAttendanceDialog();
    } catch (error) {
      showToast('Failed to save attendance record', 'error');
    }
  };

  const handleOpenAttendanceDialog = () => {
    setAttendanceForm({
      user_id: 1,
      attendance_date: new Date().toISOString().split('T')[0],
      check_in_time: '',
      check_out_time: '',
      status: 'PRESENT',
      notes: '',
    });
    setSelectedAttendance(null);
    setAttendanceDialog(true);
  };

  const handleCloseAttendanceDialog = () => {
    setAttendanceDialog(false);
    setSelectedAttendance(null);
  };

  const handleDeleteAttendance = async (id: number) => {
    try {
      await deleteAttendance(id).unwrap();
      showToast('Attendance record deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete attendance record', 'error');
    }
  };

  const handleApproveLeave = async (id: number) => {
    try {
      await approveLeave({ id, approved_by_id: 1 }).unwrap();
      showToast('Leave request approved', 'success');
    } catch (error) {
      showToast('Failed to approve leave request', 'error');
    }
  };

  const handleRejectLeave = async (id: number) => {
    try {
      await rejectLeave({ id, rejection_reason: 'Not applicable' }).unwrap();
      showToast('Leave request rejected', 'success');
    } catch (error) {
      showToast('Failed to reject leave request', 'error');
    }
  };

  // Statistics
  const presentToday = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const pendingLeaves = leaveRequests.filter((lr) => lr.status === 'PENDING').length;
  const paidPayroll = payrollRecords.filter((p) => p.status === 'PAID').length;
  const avgRating =
    performanceReviews.length > 0
      ? (performanceReviews.reduce((acc, r) => acc + r.rating, 0) / performanceReviews.length).toFixed(1)
      : 0;

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
          onClick={handleOpenAttendanceDialog}
          sx={{ bgcolor: '#087A3D', textTransform: 'none', borderRadius: 1 }}
        >
          Log Attendance
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#666', fontSize: 12, mb: 1 }}>Total Records</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {attendanceRecords.length}
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
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#666', fontSize: 12, mb: 1 }}>Avg Rating</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {avgRating}/5.0
                  </Typography>
                </Box>
                <TrendingUp size={32} style={{ color: '#4CAF50', opacity: 0.3 }} />
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
          <Tab label="Attendance" id="hr-tab-0" aria-controls="hr-tabpanel-0" />
          <Tab label="Leave Requests" id="hr-tab-1" aria-controls="hr-tabpanel-1" />
          <Tab label="Payroll" id="hr-tab-2" aria-controls="hr-tabpanel-2" />
          <Tab label="Performance" id="hr-tab-3" aria-controls="hr-tabpanel-3" />
        </Tabs>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={0}>
          {attendanceLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : attendanceError ? (
            <Alert severity="error">Failed to load attendance records</Alert>
          ) : (
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
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                      <TableCell>{record.user_name}</TableCell>
                      <TableCell>{record.attendance_date}</TableCell>
                      <TableCell>{record.check_in_time || '-'}</TableCell>
                      <TableCell>{record.check_out_time || '-'}</TableCell>
                      <TableCell>{record.hours_worked ? `${record.hours_worked.toFixed(1)} hrs` : '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          sx={{
                            bgcolor:
                              record.status === 'PRESENT'
                                ? '#e8f5e9'
                                : record.status === 'LATE'
                                  ? '#fff3e0'
                                  : '#ffebee',
                            color:
                              record.status === 'PRESENT'
                                ? '#2e7d32'
                                : record.status === 'LATE'
                                  ? '#e65100'
                                  : '#c62828',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAttendance(record.id)}
                        >
                          <Trash2 size={16} style={{ color: '#d32f2f' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Leave Requests Tab */}
        <TabPanel value={tabValue} index={1}>
          {leaveLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : leaveError ? (
            <Alert severity="error">Failed to load leave requests</Alert>
          ) : (
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
                      <TableCell>{leave.user_name}</TableCell>
                      <TableCell>
                        <Chip label={leave.leave_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{leave.start_date}</TableCell>
                      <TableCell>{leave.end_date}</TableCell>
                      <TableCell>{leave.reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={leave.status}
                          size="small"
                          sx={{
                            bgcolor:
                              leave.status === 'APPROVED'
                                ? '#e8f5e9'
                                : leave.status === 'PENDING'
                                  ? '#fff3e0'
                                  : '#ffebee',
                            color:
                              leave.status === 'APPROVED'
                                ? '#2e7d32'
                                : leave.status === 'PENDING'
                                  ? '#e65100'
                                  : '#c62828',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {leave.status === 'PENDING' && (
                          <>
                            <IconButton size="small" onClick={() => handleApproveLeave(leave.id)}>
                              <Check size={16} style={{ color: '#2e7d32' }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleRejectLeave(leave.id)}>
                              <XIcon size={16} style={{ color: '#c62828' }} />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Payroll Tab */}
        <TabPanel value={tabValue} index={2}>
          {payrollLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : payrollError ? (
            <Alert severity="error">Failed to load payroll records</Alert>
          ) : (
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
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                      <TableCell>{record.user_name}</TableCell>
                      <TableCell>{record.payroll_month}</TableCell>
                      <TableCell align="right">₹{record.base_salary.toLocaleString()}</TableCell>
                      <TableCell align="right">₹{record.allowances.toLocaleString()}</TableCell>
                      <TableCell align="right">₹{record.deductions.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ₹{record.net_salary.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          sx={{
                            bgcolor: record.status === 'PAID' ? '#e8f5e9' : '#fff3e0',
                            color: record.status === 'PAID' ? '#2e7d32' : '#e65100',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={tabValue} index={3}>
          {perfLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : perfError ? (
            <Alert severity="error">Failed to load performance reviews</Alert>
          ) : (
            <Grid container spacing={2}>
              {performanceReviews.map((review) => (
                <Grid item xs={12} md={6} key={review.id}>
                  <Card sx={{ bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{review.user_name}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#666' }}>
                            Reviewed by {review.reviewer_name}
                          </Typography>
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
                      <Typography sx={{ fontSize: 12, color: '#999' }}>{review.review_date}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Card>

      {/* Add Attendance Dialog */}
      <Dialog open={attendanceDialog} onClose={handleCloseAttendanceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Log Attendance</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Employee ID"
            type="number"
            value={attendanceForm.user_id}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, user_id: parseInt(e.target.value) })}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={attendanceForm.attendance_date}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })}
            margin="normal"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Check In Time"
            type="time"
            value={attendanceForm.check_in_time}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
            margin="normal"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Check Out Time"
            type="time"
            value={attendanceForm.check_out_time}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
            margin="normal"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={attendanceForm.status}
              label="Status"
              onChange={(e) =>
                setAttendanceForm({
                  ...attendanceForm,
                  status: e.target.value as 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HALF_DAY',
                })
              }
            >
              <MenuItem value="PRESENT">Present</MenuItem>
              <MenuItem value="ABSENT">Absent</MenuItem>
              <MenuItem value="LATE">Late</MenuItem>
              <MenuItem value="LEAVE">Leave</MenuItem>
              <MenuItem value="HALF_DAY">Half Day</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttendanceDialog}>Cancel</Button>
          <Button onClick={handleSaveAttendance} variant="contained" sx={{ bgcolor: '#087A3D' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
