import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  CircularProgress,
  LinearProgress,
  Paper,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  Settings,
  Briefcase,
  Users,
  Clock,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  PenTool,
  Eraser,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useGetProjectQuery } from '@/api/projectsApi';
import ProjectTasksList from '@/components/projects/ProjectTasksList';
import ProjectMilestonesList from '@/components/projects/ProjectMilestonesList';
import ProjectTimelineView from '@/components/projects/ProjectTimelineView';
import ProjectTimesheetsView from '@/components/projects/ProjectTimesheetsView';
import ProjectTeamView from '@/components/projects/ProjectTeamView';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const numericId = Number(id);
  const { data: project, isLoading, isError } = useGetProjectQuery(numericId, {
    skip: !numericId,
  });

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#04552B');
  const [penLineWidth, setPenLineWidth] = useState(3);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penLineWidth;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleDownloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `${project?.name || 'Project'}_Whiteboard_Design.png`;
    link.click();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (isError || !project) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <AlertCircle size={40} color="#DC2626" style={{ marginBottom: 12 }} />
        <Typography variant="h6" color="error">Project not found</Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  const projectCode = project.code || `PRJ-${project.id}`;
  const totalTasks = project.tasks_count?.total || 0;
  const doneTasks = project.tasks_count?.done || 0;
  const progressPercent = project.progress ?? (totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      {/* Sticky Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/projects')} size="small">
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
              {project.name}
              <Chip size="small" label={projectCode} variant="outlined" sx={{ fontWeight: 600, fontSize: 12 }} />
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Settings size={16} />}
            onClick={() => navigate('/projects/configuration')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Settings
          </Button>
        </Box>

        {/* KPI Strip */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>Health</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#16A34A' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, color: 'text.primary' }}>On Track</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>Progress</Typography>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, fontSize: 18, color: 'text.primary' }}>{progressPercent}%</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>Tasks Completion</Typography>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, fontSize: 18, color: 'text.primary' }}>
                  {doneTasks} / {totalTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>Budget Usage</Typography>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, fontSize: 18, color: 'text.primary' }}>
                  ₹{(project.actual_cost || 0).toLocaleString()} / ₹{(project.budget || 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Workspace Tabs */}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              minHeight: 40,
              py: 1,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#04552B',
              height: 3,
            },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Tasks" value="tasks" />
          <Tab label="Milestones" value="milestones" />
          <Tab label="Timeline (Gantt)" value="timeline" />
          <Tab label="Team" value="team" />
          <Tab label="Timesheets" value="timesheets" />
          <Tab label="Whiteboard" value="whiteboard" />
          <Tab label="Expenses" value="expenses" />
          <Tab label="Documents" value="documents" />
        </Tabs>
      </Box>

      {/* Tab Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <Grid container spacing={3}>
            {/* Project Summary & Details */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                  Project Overview
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                  {project.description || 'No detailed description provided for this project yet.'}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>CATEGORY</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                        {project.category || 'Vehicle Customization'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>PROJECT OWNER</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <User size={14} color="#04552B" /> {project.owner_name || 'Admin'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>TARGET START DATE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Calendar size={14} color="#64748B" /> {project.target_start_date || 'Not set'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>TARGET COMPLETION DATE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Calendar size={14} color="#64748B" /> {project.target_end_date || 'Not set'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Progress & Milestone Tracking */}
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
                  Completion Status
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Overall Project Progress</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#04552B' }}>{progressPercent}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: '#04552B' } }}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Side Column: Linked Lead & Financial Details */}
            <Grid item xs={12} md={4}>
              {/* Linked CRM Lead Info */}
              {project.lead_customer_name && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 3, mb: 3 }}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700, mb: 1 }}>
                    LINKED CRM APPLICATION
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {project.lead_customer_name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                    App No: {project.lead_app_no || 'N/A'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/leads/${project.lead_id}`)}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    View CRM Lead Details
                  </Button>
                </Paper>
              )}

              {/* Financial Breakdown */}
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 3 }}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700, mb: 2 }}>
                  FINANCIAL SUMMARY
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Total Budget:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      ₹{(project.budget || 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Estimated Cost:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      ₹{(project.estimated_cost || 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">Actual Cost Logged:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16A34A' }}>
                      ₹{(project.actual_cost || 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Remaining Budget:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#04552B' }}>
                      ₹{Math.max(0, (project.budget || 0) - (project.actual_cost || 0)).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ── OTHER TABS ─────────────────────────────────────────────────── */}
        {tab === 'tasks' && <ProjectTasksList projectId={id!} />}
        {tab === 'milestones' && <ProjectMilestonesList projectId={id!} />}
        {tab === 'timeline' && <ProjectTimelineView projectId={id!} />}
        {tab === 'team' && <ProjectTeamView projectId={id!} />}
        {tab === 'timesheets' && <ProjectTimesheetsView projectId={id!} />}

        {/* ── CLICKUP WHITEBOARD / CANVAS TAB ────────────────────────────── */}
        {tab === 'whiteboard' && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PenTool size={20} color="#04552B" /> Project Interactive Whiteboard
              </Typography>

              {/* Whiteboard Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                  {['#04552B', '#2563EB', '#D97706', '#DC2626', '#0F172A'].map((c) => (
                    <Box
                      key={c}
                      onClick={() => setPenColor(c)}
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: c,
                        cursor: 'pointer',
                        border: penColor === c ? '2px solid #000' : 'none',
                      }}
                    />
                  ))}
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RotateCcw size={14} />}
                  onClick={handleClearCanvas}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  Clear Canvas
                </Button>

                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Download size={14} />}
                  onClick={handleDownloadCanvas}
                  sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontSize: 12, fontWeight: 600 }}
                >
                  Export Design
                </Button>
              </Box>
            </Box>

            <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden', bgcolor: '#FFFFFF' }}>
              <canvas
                ref={canvasRef}
                width={1000}
                height={550}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ cursor: 'crosshair', display: 'block', width: '100%', height: '550px' }}
              />
            </Box>
          </Paper>
        )}

        {tab === 'expenses' && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 4, textAlign: 'center' }}>
            <DollarSign size={32} color="#04552B" style={{ marginBottom: 8 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Project Expenses</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Track purchase orders, vendor invoices, and material costs logged against {project.name}.
            </Typography>
          </Paper>
        )}

        {tab === 'documents' && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 4, textAlign: 'center' }}>
            <FileText size={32} color="#04552B" style={{ marginBottom: 8 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Project Documents</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Centralized file attachment repository for engineering blueprints, customer approvals, and invoices.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
