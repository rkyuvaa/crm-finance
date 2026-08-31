import { useState, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
  Chip,
  MenuItem,
  Select,
} from '@mui/material';
import { Download, UploadCloud, Database, RefreshCw, AlertTriangle, CheckCircle2, Archive } from 'lucide-react';

import { useGetBackupSummaryQuery, useRestoreBackupMutation } from '@/api/backupApi';
import { useToast } from '@/components/ui/ToastHost';

export default function SystemBackupCard() {
  const { showToast } = useToast();
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useGetBackupSummaryQuery();
  const [restoreBackup, { isLoading: isRestoring }] = useRestoreBackupMutation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'zip' | 'sql' | 'json'>('zip');
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportBackup = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/admin/backup/export?format=${exportFormat}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      if (exportFormat === 'zip') {
        a.download = `crm_finance_full_backup_${timestamp}.zip`;
      } else if (exportFormat === 'sql') {
        a.download = `crm_finance_db_dump_${timestamp}.sql`;
      } else {
        a.download = `crm_finance_backup_${timestamp}.json`;
      }

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Backup exported successfully as .${exportFormat.toUpperCase()}`, 'success');
    } catch {
      showToast('Failed to export system backup', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.toLowerCase();
      if (!ext.endsWith('.zip') && !ext.endsWith('.sql') && !ext.endsWith('.json')) {
        showToast('Please select a valid .zip, .sql, or .json backup archive', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedFile) return;
    try {
      setConfirmModalOpen(false);
      const res = await restoreBackup({ file: selectedFile, mode: restoreMode }).unwrap();
      
      let msg = res.message || 'System data restored successfully!';
      if (res.restored_files_count !== undefined) {
        msg += ` (${res.restored_files_count} uploaded files/images restored)`;
      }
      showToast(msg, 'success');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refetchSummary();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail || 'Restoration failed. Please check backup file validity.', 'error');
    }
  };

  return (
    <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3, background: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              backgroundColor: '#EAF3EC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#023020',
            }}
          >
            <Database size={20} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#023020' }}>
              Complete System Backup & Restore (Database SQL + Uploaded Images)
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#7A8B80' }}>
              Export full PostgreSQL/SQL dump along with all uploaded document images into a ZIP package, or restore an existing archive.
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          onClick={() => refetchSummary()}
          disabled={loadingSummary}
          startIcon={<RefreshCw size={14} />}
          sx={{ textTransform: 'none', color: '#023020' }}
        >
          Refresh Stats
        </Button>
      </Box>

      {/* Database stats summary */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 1.5,
          p: 2,
          backgroundColor: '#F8FAF7',
          borderRadius: '10px',
          border: '1px solid #E4EBE1',
          mb: 3,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 11, color: '#7A8B80', textTransform: 'uppercase', fontWeight: 700 }}>
            Custom Tabs
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#023020' }}>
            {loadingSummary ? '...' : (summary?.crm_tabs ?? 0)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, color: '#7A8B80', textTransform: 'uppercase', fontWeight: 700 }}>
            Custom Fields
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#023020' }}>
            {loadingSummary ? '...' : (summary?.crm_tab_fields ?? 0)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, color: '#7A8B80', textTransform: 'uppercase', fontWeight: 700 }}>
            Applications / Leads
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#023020' }}>
            {loadingSummary ? '...' : (summary?.applications ?? 0)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, color: '#7A8B80', textTransform: 'uppercase', fontWeight: 700 }}>
            User Accounts
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#023020' }}>
            {loadingSummary ? '...' : (summary?.users ?? 0)}
          </Typography>
        </Box>
      </Box>

      {/* Action sections: Export & Restore */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Export Card */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px',
            border: '1px solid #D6E4D9',
            backgroundColor: '#FAFCFA',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#023020', mb: 0.5 }}>
              Export System Backup
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#667A6D', mb: 2 }}>
              Generate a full backup package containing PostgreSQL database statements and uploaded images/documents.
            </Typography>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#7A8B80', mb: 0.5 }}>
                Export Format
              </Typography>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'zip' | 'sql' | 'json')}
                sx={{ backgroundColor: '#FFFFFF', borderRadius: '6px' }}
              >
                <MenuItem value="zip">Full Package (.ZIP) — Database SQL Dump + Uploaded Images/Docs</MenuItem>
                <MenuItem value="sql">Database Dump (.SQL) — Raw SQL Insert Statements</MenuItem>
                <MenuItem value="json">Database Archive (.JSON) — Portable Data Payload</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            onClick={handleExportBackup}
            disabled={downloading}
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : exportFormat === 'zip' ? <Archive size={16} /> : <Download size={16} />}
            sx={{
              backgroundColor: '#023020',
              '&:hover': { backgroundColor: '#012015' },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {downloading ? 'Preparing Backup Package...' : `Download ${exportFormat.toUpperCase()} Backup`}
          </Button>
        </Box>

        {/* Restore Card */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px',
            border: '1px solid #D6E4D9',
            backgroundColor: '#FAFCFA',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#023020', mb: 0.5 }}>
              Restore System Backup
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#667A6D', mb: 1.5 }}>
              Upload a previously exported .ZIP package (or .SQL / .JSON) to restore database tables and uploaded images.
            </Typography>

            <input
              type="file"
              accept=".zip,.sql,.json"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="backup-file-input"
            />
            <label htmlFor="backup-file-input">
              <Box
                sx={{
                  border: '2px dashed #C2D6C7',
                  borderRadius: '8px',
                  p: 1.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: selectedFile ? '#F0F7F2' : '#FFFFFF',
                  '&:hover': { backgroundColor: '#F4FAF5' },
                  mb: 1.5,
                }}
              >
                <UploadCloud size={20} style={{ color: '#023020', marginBottom: 4 }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#023020' }}>
                  {selectedFile ? selectedFile.name : 'Click to browse backup archive (.zip, .sql, .json)'}
                </Typography>
                {selectedFile && (
                  <Chip
                    size="small"
                    label={`${(selectedFile.size / 1024).toFixed(1)} KB`}
                    sx={{ mt: 0.5, height: 20, fontSize: 11 }}
                  />
                )}
              </Box>
            </label>

            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: 11.5, fontWeight: 700, color: '#7A8B80' }}>
                Restore Mode
              </FormLabel>
              <RadioGroup
                row
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value as 'overwrite' | 'merge')}
              >
                <FormControlLabel
                  value="overwrite"
                  control={<Radio size="small" />}
                  label={<Typography sx={{ fontSize: 12 }}>Overwrite (Replace tables & files)</Typography>}
                />
                <FormControlLabel
                  value="merge"
                  control={<Radio size="small" />}
                  label={<Typography sx={{ fontSize: 12 }}>Merge (Update matches)</Typography>}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            color="warning"
            onClick={() => setConfirmModalOpen(true)}
            disabled={!selectedFile || isRestoring}
            startIcon={isRestoring ? <CircularProgress size={16} color="inherit" /> : <UploadCloud size={16} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              mt: 1,
            }}
          >
            {isRestoring ? 'Restoring Package...' : 'Restore System Package'}
          </Button>
        </Box>
      </Box>

      {/* Restoration Confirmation Dialog */}
      <Dialog open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#D32F2F', fontWeight: 800 }}>
          <AlertTriangle size={22} />
          Confirm System Data Restore
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13, color: '#4A5568' }}>
            Are you sure you want to restore system data & files from <strong>{selectedFile?.name}</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2, fontSize: 12 }}>
            <strong>Mode: {restoreMode.toUpperCase()}</strong>. {restoreMode === 'overwrite' ? 'This action will replace existing database records and upload files with the backup payload.' : 'This action will merge and update matching records.'}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setConfirmModalOpen(false)} sx={{ textTransform: 'none', color: '#7A8B80' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleExecuteRestore}
            startIcon={<CheckCircle2 size={16} />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Proceed with Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
