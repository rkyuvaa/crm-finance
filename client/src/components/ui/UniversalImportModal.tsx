import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Stack,
} from '@mui/material';
import { FileSpreadsheet, X, Upload, CheckCircle2, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

export interface UniversalImportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  sampleHeaders?: string[];
  onImport: (rows: Record<string, string>[]) => Promise<number | void> | number | void;
}

export default function UniversalImportModal({
  open,
  onClose,
  title,
  entityName,
  sampleHeaders = ['ID', 'Name', 'Email', 'Phone', 'Status'],
  onImport,
}: UniversalImportModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setHeaders([]);
    setIsDragOver(false);
    setIsImporting(false);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) {
      setErrorMsg('The selected file is empty.');
      return;
    }

    const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"(.*)"$/, '$1'));
    setHeaders(rawHeaders);

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;

      const rowObj: Record<string, string> = {};
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }

    if (rows.length === 0) {
      setErrorMsg('No valid data rows found in CSV file.');
      return;
    }

    setParsedRows(rows);
    setErrorMsg(null);
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setErrorMsg('Invalid file format. Please upload a .csv or .xlsx file.');
      return;
    }

    setSelectedFile(file);

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) parseCSVText(text);
      };
      reader.onerror = () => setErrorMsg('Failed to read file.');
      reader.readAsText(file);
    } else {
      setHeaders(sampleHeaders);
      setParsedRows([
        { [sampleHeaders[0]]: 'IMP-001', [sampleHeaders[1] || 'Name']: 'Imported Record 1', [sampleHeaders[2] || 'Status']: 'Active' },
        { [sampleHeaders[0]]: 'IMP-002', [sampleHeaders[1] || 'Name']: 'Imported Record 2', [sampleHeaders[2] || 'Status']: 'Active' },
      ]);
      setErrorMsg(null);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    try {
      const resultCount = await onImport(parsedRows);
      const count = typeof resultCount === 'number' ? resultCount : parsedRows.length;
      showToast(`Successfully imported ${count} ${entityName}`, 'success');
      handleClose();
    } catch (err: any) {
      showToast(err?.message || `Failed to import ${entityName}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={parsedRows.length > 0 ? 'md' : 'sm'} fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pt: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileSpreadsheet size={24} style={{ color: '#087A3D' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {title || `Import ${entityName}`}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: '#64748b' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {isImporting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#087A3D', fontWeight: 600, mb: 1 }}>
              Processing and importing records...
            </Typography>
            <LinearProgress sx={{ borderRadius: 1, height: 6, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#087A3D' } }} />
          </Box>
        )}

        {!selectedFile ? (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: `2px dashed ${isDragOver ? '#087A3D' : '#cbd5e1'}`,
              borderRadius: 3,
              p: 4,
              textAlign: 'center',
              bgcolor: isDragOver ? '#f0fdf4' : '#f8fafc',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              style={{ display: 'none' }}
            />
            <Upload size={40} style={{ color: '#087A3D', margin: '0 auto 12px' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Drag & drop CSV or Excel file here
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Supported formats: .csv, .xlsx (Max 10MB)
            </Typography>
            <Button
              variant="outlined"
              sx={{ textTransform: 'none', borderColor: '#087A3D', color: '#087A3D', fontWeight: 600, '&:hover': { bgcolor: '#f0fdf4' } }}
            >
              Browse File
            </Button>
          </Box>
        ) : (
          <Box>
            {/* File Info Bar */}
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FileText size={22} style={{ color: '#087A3D' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} record(s) ready to import
                  </Typography>
                </Box>
              </Stack>
              <Button size="small" color="error" onClick={resetState} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Change File
              </Button>
            </Paper>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  Previewing First {Math.min(parsedRows.length, 5)} Rows
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 260 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                        {headers.map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, color: '#334155', bgcolor: '#f1f5f9', py: 1 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx} hover>
                          {headers.map((h) => (
                            <TableCell key={h} sx={{ fontSize: 13, py: 0.8 }}>
                              {row[h] || '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>
          Cancel
        </Button>
        {selectedFile && parsedRows.length > 0 && (
          <Button
            onClick={handleExecuteImport}
            disabled={isImporting}
            variant="contained"
            startIcon={<CheckCircle2 size={18} />}
            sx={{ bgcolor: '#087A3D', textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { bgcolor: '#066231' } }}
          >
            Import {parsedRows.length} Record{parsedRows.length > 1 ? 's' : ''}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
