import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  IconButton,
  Divider,
  Stack,
  Tooltip
} from '@mui/material';
import { ArrowLeft, Upload, ChevronLeft, ChevronRight, Eye, Download, Edit2, History, CheckCircle2 } from 'lucide-react';

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
      id={`onboarding-tabpanel-${index}`}
      aria-labelledby={`onboarding-tab-${index}`}
      {...other}
      style={{ flexGrow: 1, display: value === index ? 'block' : 'none' }}
    >
      {value === index && <Box sx={{ py: 3, px: 1 }}>{children}</Box>}
    </div>
  );
}

export default function EmployeeOnboardingPage() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const [documents, setDocuments] = useState<Record<string, { name: string; url: string }>>({});

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFileUpload = (docName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const url = URL.createObjectURL(file);
      setDocuments((prev) => ({ ...prev, [docName]: { name: file.name, url } }));
    }
  };

  const handleDownload = (docName: string) => {
    const doc = documents[docName];
    if (doc) {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.name;
      a.click();
    }
  };

  const handlePreview = (docName: string) => {
    const doc = documents[docName];
    if (doc) {
      window.open(doc.url, '_blank');
    }
  };

  const docList = [
    'Education certificates (10th, 12th, degree)',
    'Previous relieving letter',
    'Previous salary slips (last 3 months)',
    'Bank passbook/cancelled cheque',
    'Signed offer letter',
    'Signed appointment letter',
    'Signed NDA'
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton onClick={() => navigate('/hr?tab=onboarding')} size="small" sx={{ color: '#44584C', bgcolor: '#F1F5EF', '&:hover': { bgcolor: '#E4EBE1' } }}>
            <ArrowLeft size={18} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#023020' }}>
            Initiate Onboarding
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
            <Tooltip title="Previous Record">
              <IconButton size="small" sx={{ border: '1px solid #E4EBE1', borderRadius: 2 }}>
                <ChevronLeft size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next Record">
              <IconButton size="small" sx={{ border: '1px solid #E4EBE1', borderRadius: 2 }}>
                <ChevronRight size={18} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Button variant="outlined" onClick={() => navigate('/hr?tab=onboarding')} sx={{ borderColor: '#E4EBE1', color: '#44584C', borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ bgcolor: '#087A3D', '&:hover': { bgcolor: '#066231' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
            Save & Submit
          </Button>
        </Stack>
      </div>

      {/* Main Layout */}
      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 20, alignItems: 'start', maxWidth: '100%' }}>
        {/* Left Side: Forms */}
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3, minWidth: 0, boxShadow: 'none' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc', px: 2, pt: 1 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' },
                  '& .Mui-selected': { color: '#087A3D !important' },
                  '& .MuiTabs-indicator': { backgroundColor: '#087A3D' },
                }}
              >
                <Tab label="Personal Details" />
                <Tab label="Identity & Statutory" />
                <Tab label="Employment Details" />
                <Tab label="Document Uploads" />
                <Tab label="Asset Allocation" />
              </Tabs>
            </Box>

            <CardContent sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <TabPanel value={tabValue} index={0}>
                {/* Personal Details */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Employee ID" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Full name" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Date of birth" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Gender</InputLabel>
                      <Select label="Gender" defaultValue="">
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Blood group" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Marital status</InputLabel>
                      <Select label="Marital status" defaultValue="">
                        <MenuItem value="Single">Single</MenuItem>
                        <MenuItem value="Married">Married</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Nationality" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Mobile number (personal)" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Alternative Number" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Personal email" type="email" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Biometric/attendance ID" size="small" /></Grid>
                  
                  <Grid item xs={12}>
                     <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Addresses</Typography>
                     <Grid container spacing={3}>
                       <Grid item xs={12} sm={6}><TextField fullWidth multiline rows={3} label="Current address" size="small" /></Grid>
                       <Grid item xs={12} sm={6}><TextField fullWidth multiline rows={3} label="Permanent address" size="small" /></Grid>
                     </Grid>
                  </Grid>

                  <Grid item xs={12}>
                     <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Emergency Contact</Typography>
                     <Grid container spacing={3}>
                       <Grid item xs={12} sm={4}><TextField fullWidth label="Name" size="small" /></Grid>
                       <Grid item xs={12} sm={4}><TextField fullWidth label="Phone" size="small" /></Grid>
                       <Grid item xs={12} sm={4}><TextField fullWidth label="Relation" size="small" /></Grid>
                     </Grid>
                  </Grid>

                  <Grid item xs={12}>
                     <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Photo</Typography>
                     <Button variant="outlined" component="label" startIcon={<Upload size={16} />}>
                       Upload Photo
                       <input type="file" hidden accept="image/*" />
                     </Button>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {/* Identity & Statutory */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Aadhaar number" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="PAN number" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Passport number (if applicable)" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="UAN (Universal Account Number)" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="ESI number" size="small" /></Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Bank Details</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={4}><TextField fullWidth label="Bank account number" size="small" /></Grid>
                      <Grid item xs={12} sm={4}><TextField fullWidth label="Bank name & branch" size="small" /></Grid>
                      <Grid item xs={12} sm={4}><TextField fullWidth label="IFSC code" size="small" /></Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Tax & Nominees</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Tax regime selected</InputLabel>
                          <Select label="Tax regime selected" defaultValue="">
                            <MenuItem value="Old">Old</MenuItem>
                            <MenuItem value="New">New</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}><TextField fullWidth label="Form 12B details (if mid-year joiner)" size="small" /></Grid>
                      <Grid item xs={12} sm={6}><TextField fullWidth label="Gratuity nominee name & relation" size="small" /></Grid>
                      <Grid item xs={12} sm={6}><TextField fullWidth label="Insurance/mediclaim nominee" size="small" /></Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {/* Employment Details */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Designation" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Department" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Employment type</InputLabel>
                      <Select label="Employment type" defaultValue="">
                        <MenuItem value="Full-Time">Full-Time</MenuItem>
                        <MenuItem value="Contract">Contract</MenuItem>
                        <MenuItem value="Intern">Intern</MenuItem>
                        <MenuItem value="Fixed">Fixed</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Employment grade/level" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Reporting manager" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Functional manager" placeholder="If different from reporting" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Work location/branch" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Date of joining" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Shift/work schedule" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="CTC (annual)" type="number" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Salary structure breakup" size="small" /></Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                {/* Document Uploads */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Upload required documents below. Each document will show its verification status.
                </Typography>
                <Grid container spacing={3}>
                  {docList.map((docName, idx) => {
                    const doc = documents[docName];
                    return (
                      <Grid item xs={12} sm={6} key={idx}>
                        <Card variant="outlined">
                          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={docName}>
                                {docName}
                              </Typography>
                              {doc ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <CheckCircle2 size={14} color="#087A3D" style={{ marginRight: 4 }} />
                                  <Typography variant="caption" sx={{ color: '#087A3D', fontWeight: 600 }}>Uploaded: {doc.name}</Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 500 }}>Pending Verification</Typography>
                              )}
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                              {doc ? (
                                <>
                                  <Tooltip title="Preview">
                                    <IconButton size="small" onClick={() => handlePreview(docName)}>
                                      <Eye size={18} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Download">
                                    <IconButton size="small" onClick={() => handleDownload(docName)}>
                                      <Download size={18} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Re-upload">
                                    <IconButton size="small" component="label">
                                      <Edit2 size={18} />
                                      <input type="file" hidden onChange={(e) => handleFileUpload(docName, e)} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              ) : (
                                <Button variant="outlined" component="label" size="small" startIcon={<Upload size={16} />}>
                                  Upload
                                  <input type="file" hidden onChange={(e) => handleFileUpload(docName, e)} />
                                </Button>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={4}>
                {/* Asset Allocation */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Asset type</InputLabel>
                      <Select label="Asset type" defaultValue="">
                        <MenuItem value="Laptop">Laptop</MenuItem>
                        <MenuItem value="Mobile">Mobile</MenuItem>
                        <MenuItem value="SIM">SIM</MenuItem>
                        <MenuItem value="Tools">Tools</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth label="Serial number" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Issue date" size="small" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth label="Condition at issue" size="small" /></Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" sx={{ mt: 1, bgcolor: '#087A3D', '&:hover': { bgcolor: '#066231' } }}>Add Asset</Button>
                  </Grid>
                </Grid>
              </TabPanel>
            </CardContent>
        </Paper>
        
        {/* Right Side: Activity Log */}
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3, minWidth: 0, boxShadow: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', bgcolor: '#f8fafc' }}>
              <History size={18} style={{ marginRight: 8, color: '#64748b' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Activity & Log History</Typography>
            </Box>
            <CardContent sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Stack spacing={3}>
                {/* Empty State Rule applied here - no dummy data */}
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No activity logs yet.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Actions taken on this record will appear here.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
        </Paper>
      </div>
    </div>
  );
}
