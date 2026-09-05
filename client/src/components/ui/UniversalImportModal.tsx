import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
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
  Select,
  MenuItem,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import { FileSpreadsheet, X, Upload, CheckCircle2, FileText, ArrowRight, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/ui/ToastHost';

export interface ERPFieldOption {
  key: string;
  label: string;
  required?: boolean;
}

export interface UniversalImportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  erpFields: ERPFieldOption[];
  onImport: (mappedRows: Record<string, string>[], rawRows: Record<string, string>[]) => Promise<number | void> | number | void;
}

export default function UniversalImportModal({
  open,
  onClose,
  title,
  entityName,
  erpFields,
  onImport,
}: UniversalImportModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stepper State (0: Upload, 1: Map Fields, 2: Preview & Validate, 3: Confirm)
  const [activeStep, setActiveStep] = useState<number>(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  
  // Mapping state: Record<uploadedHeader, erpFieldKey | '__IGNORE__'>
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  
  // Duplicate Handling
  const [duplicateOption, setDuplicateOption] = useState<'SKIP' | 'UPDATE' | 'CREATE'>('SKIP');

  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setFieldMapping({});
    setActiveStep(0);
    setIsDragOver(false);
    setIsImporting(false);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Automatic intelligent header matching
  const generateSuggestedMapping = (detectedHeaders: string[], fields: ERPFieldOption[]) => {
    const mapping: Record<string, string> = {};
    const usedErpKeys = new Set<string>();

    detectedHeaders.forEach((header) => {
      const normHeader = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Exact or normalized match against erpField label or key
      const matchedField = fields.find((f) => {
        const normLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normKey = f.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normHeader === normLabel || normHeader === normKey;
      });

      if (matchedField && !usedErpKeys.has(matchedField.key)) {
        mapping[header] = matchedField.key;
        usedErpKeys.add(matchedField.key);
      } else {
        // Known aliases helper
        let aliasMatchKey = '';
        if (['empid', 'id', 'code', 'employeeid'].includes(normHeader)) aliasMatchKey = 'emp_id';
        else if (['fullname', 'name', 'employeename', 'candidate'].includes(normHeader)) aliasMatchKey = 'name';
        else if (['email', 'emailid', 'mail'].includes(normHeader)) aliasMatchKey = 'email';
        else if (['phone', 'mobile', 'cell', 'contact', 'phonenumber'].includes(normHeader)) aliasMatchKey = 'phone';
        else if (['designation', 'role', 'title', 'jobtitle'].includes(normHeader)) aliasMatchKey = 'designation';
        else if (['department', 'dept', 'departmentname'].includes(normHeader)) aliasMatchKey = 'department';
        else if (['branch', 'branchname', 'office', 'location'].includes(normHeader)) aliasMatchKey = 'branch';
        else if (['manager', 'managername', 'reportingmanager', 'l1manager'].includes(normHeader)) aliasMatchKey = 'reporting_manager';
        else if (['shift', 'shiftname'].includes(normHeader)) aliasMatchKey = 'shift';
        else if (['joiningdate', 'dateofjoining', 'doj', 'startdate'].includes(normHeader)) aliasMatchKey = 'joining_date';
        else if (['uan', 'universalaccountnumber'].includes(normHeader)) aliasMatchKey = 'uan';
        else if (['esi', 'esinumber', 'esic'].includes(normHeader)) aliasMatchKey = 'esi_number';
        else if (['status', 'state'].includes(normHeader)) aliasMatchKey = 'status';

        if (aliasMatchKey && fields.some((f) => f.key === aliasMatchKey) && !usedErpKeys.has(aliasMatchKey)) {
          mapping[header] = aliasMatchKey;
          usedErpKeys.add(aliasMatchKey);
        } else {
          mapping[header] = '__IGNORE__';
        }
      }
    });

    setFieldMapping(mapping);
  };

  // Real Excel & CSV File Parsing using SheetJS (XLSX)
  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setErrorMsg('Invalid file format. Please upload a valid .csv, .xlsx or .xls file.');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert sheet to JSON rows
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

      if (!json || json.length === 0) {
        setErrorMsg('The selected spreadsheet contains no data rows.');
        return;
      }

      // Extract detected raw column headers
      const detectedHeaders = Object.keys(json[0]);
      setRawHeaders(detectedHeaders);

      // Convert all cell values to string
      const parsedDataRows: Record<string, string>[] = json.map((row) => {
        const obj: Record<string, string> = {};
        detectedHeaders.forEach((h) => {
          obj[h] = row[h] !== undefined && row[h] !== null ? String(row[h]).trim() : '';
        });
        return obj;
      });

      setRawRows(parsedDataRows);
      generateSuggestedMapping(detectedHeaders, erpFields);
      setActiveStep(1); // Advance directly to Step 2: Mapping
    } catch (err: any) {
      setErrorMsg(`Failed to parse file: ${err?.message || 'Invalid spreadsheet structure'}`);
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

  // Change individual column mapping
  const handleMappingChange = (header: string, targetKey: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [header]: targetKey,
    }));
  };

  // Validate mapping before moving to preview
  const requiredFields = erpFields.filter((f) => f.required);
  const mappedErpKeys = Object.values(fieldMapping).filter((k) => k !== '__IGNORE__');
  
  const unmappedRequiredFields = requiredFields.filter((rf) => !mappedErpKeys.includes(rf.key));
  
  // Find duplicate mapped ERP fields
  const erpKeyCounts: Record<string, number> = {};
  mappedErpKeys.forEach((k) => {
    erpKeyCounts[k] = (erpKeyCounts[k] || 0) + 1;
  });
  const duplicateErpKeys = Object.keys(erpKeyCounts).filter((k) => erpKeyCounts[k] > 1);

  // Generate mapped rows for preview & insertion
  const getMappedRows = (): Record<string, string>[] => {
    return rawRows.map((rawRow) => {
      const mappedRow: Record<string, string> = {};
      Object.entries(fieldMapping).forEach(([uploadedHeader, erpKey]) => {
        if (erpKey && erpKey !== '__IGNORE__') {
          mappedRow[erpKey] = rawRow[uploadedHeader] || '';
        }
      });
      return mappedRow;
    });
  };

  const handleNextFromMapping = () => {
    if (unmappedRequiredFields.length > 0) {
      setErrorMsg(`Required field(s) not mapped: ${unmappedRequiredFields.map((f) => f.label).join(', ')}`);
      return;
    }
    if (duplicateErpKeys.length > 0) {
      const dupLabels = duplicateErpKeys.map((k) => erpFields.find((f) => f.key === k)?.label || k);
      setErrorMsg(`Duplicate mapping detected for ERP field(s): ${dupLabels.join(', ')}. Please assign each ERP field to only one Excel column.`);
      return;
    }
    setErrorMsg(null);
    setActiveStep(2); // Preview step
  };

  const handleExecuteImport = async () => {
    const mappedRows = getMappedRows();
    if (mappedRows.length === 0) return;
    setIsImporting(true);

    try {
      const resultCount = await onImport(mappedRows, rawRows);
      const count = typeof resultCount === 'number' ? resultCount : mappedRows.length;
      showToast(`Successfully imported ${count} ${entityName}`, 'success');
      handleClose();
    } catch (err: any) {
      showToast(err?.message || `Failed to import ${entityName}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const steps = ['Upload File', 'Map Fields', 'Preview & Validate', 'Confirm Import'];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={activeStep >= 1 ? 'lg' : 'sm'}
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
    >
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

      {/* Workflow Stepper */}
      <Box sx={{ px: 3, pt: 1, pb: 2, borderBottom: '1px solid #e2e8f0' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-active': { color: '#087A3D' },
                    '&.Mui-completed': { color: '#087A3D' },
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5, minHeight: 380 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {isImporting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#087A3D', fontWeight: 600, mb: 1 }}>
              Executing import for {rawRows.length} records...
            </Typography>
            <LinearProgress sx={{ borderRadius: 1, height: 6, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#087A3D' } }} />
          </Box>
        )}

        {/* STEP 0: UPLOAD FILE */}
        {activeStep === 0 && (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: `2px dashed ${isDragOver ? '#087A3D' : '#cbd5e1'}`,
              borderRadius: 3,
              p: 6,
              textAlign: 'center',
              bgcolor: isDragOver ? '#f0fdf4' : '#f8fafc',
              transition: 'all 0.2s',
              cursor: 'pointer',
              my: 2,
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
            <Upload size={48} style={{ color: '#087A3D', margin: '0 auto 16px' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
              Drag & drop CSV or Excel file here
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Supported formats: .csv, .xlsx, .xls (Max 10MB)
            </Typography>
            <Button
              variant="outlined"
              sx={{ textTransform: 'none', borderColor: '#087A3D', color: '#087A3D', fontWeight: 600, px: 4, py: 1, '&:hover': { bgcolor: '#f0fdf4' } }}
            >
              Browse File
            </Button>
          </Box>
        )}

        {/* STEP 1: FIELD MAPPING */}
        {activeStep === 1 && selectedFile && (
          <Box>
            {/* Summary File Card */}
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FileText size={24} style={{ color: '#087A3D' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • {rawRows.length} record(s) detected • {rawHeaders.length} Excel column(s)
                  </Typography>
                </Box>
              </Stack>
              <Button size="small" color="error" onClick={resetState} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Change File
              </Button>
            </Paper>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Map Uploaded Columns to ERP Fields
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Verify and confirm which Excel column corresponds to each ERP Employee field.
            </Typography>

            {/* Mapping Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 340 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', bgcolor: '#f1f5f9', py: 1.2, width: '35%' }}>
                      Uploaded File Column Header
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', bgcolor: '#f1f5f9', py: 1.2, width: '15%' }}>
                      Sample Value (Row 1)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', bgcolor: '#f1f5f9', py: 1.2, width: '40%' }}>
                      ERP Field Target
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', bgcolor: '#f1f5f9', py: 1.2, width: '10%' }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rawHeaders.map((header) => {
                    const currentMappedKey = fieldMapping[header] || '__IGNORE__';
                    const sampleVal = rawRows[0]?.[header] || '—';
                    const isMatched = currentMappedKey !== '__IGNORE__';

                    return (
                      <TableRow key={header} hover>
                        <TableCell sx={{ fontWeight: 600, color: '#0f172a', py: 1 }}>
                          {header}
                        </TableCell>
                        <TableCell sx={{ color: '#64748b', fontSize: 13, py: 1 }}>
                          {sampleVal}
                        </TableCell>
                        <TableCell sx={{ py: 0.8 }}>
                          <Select
                            fullWidth
                            size="small"
                            value={currentMappedKey}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                            sx={{ height: 36, fontSize: 13, bgcolor: '#ffffff' }}
                          >
                            <MenuItem value="__IGNORE__" sx={{ color: '#94a3b8', italic: true }}>
                              ⛔ — Ignore Column (Do Not Import) —
                            </MenuItem>
                            {erpFields.map((f) => (
                              <MenuItem key={f.key} value={f.key}>
                                {f.label} {f.required ? ' * (Required)' : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          {isMatched ? (
                            <Chip label="Mapped" size="small" color="success" sx={{ fontWeight: 600, height: 24, fontSize: 11 }} />
                          ) : (
                            <Chip label="Ignored" size="small" variant="outlined" sx={{ color: '#94a3b8', height: 24, fontSize: 11 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* STEP 2: PREVIEW & VALIDATE */}
        {activeStep === 2 && selectedFile && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Confirmed Data Preview
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Previewing records mapped into ERP fields before final insertion.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={14} />}
                onClick={() => setActiveStep(1)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Reconfigure Mapping
              </Button>
            </Box>

            {/* Mapped Data Preview Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 320, mb: 3 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    {Object.entries(fieldMapping)
                      .filter(([_, erpKey]) => erpKey !== '__IGNORE__')
                      .map(([uploadedHeader, erpKey]) => {
                        const erpLabel = erpFields.find((f) => f.key === erpKey)?.label || erpKey;
                        return (
                          <TableCell key={erpKey} sx={{ fontWeight: 700, color: '#334155', bgcolor: '#f1f5f9', py: 1 }}>
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#087A3D', display: 'block' }}>
                                {erpLabel}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10 }}>
                                (from: {uploadedHeader})
                              </Typography>
                            </Box>
                          </TableCell>
                        );
                      })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getMappedRows().slice(0, 5).map((mappedRow, idx) => (
                    <TableRow key={idx} hover>
                      {Object.values(fieldMapping)
                        .filter((erpKey) => erpKey !== '__IGNORE__')
                        .map((erpKey) => (
                          <TableCell key={erpKey} sx={{ fontSize: 13, py: 1 }}>
                            {mappedRow[erpKey] || '—'}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Duplicate Handling Options */}
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 700, color: '#0f172a', fontSize: 14, mb: 1 }}>
                  If Employee Record / ID Already Exists:
                </FormLabel>
                <RadioGroup
                  row
                  value={duplicateOption}
                  onChange={(e) => setDuplicateOption(e.target.value as any)}
                >
                  <FormControlLabel value="SKIP" control={<Radio size="small" sx={{ color: '#087A3D', '&.Mui-checked': { color: '#087A3D' } }} />} label={<Typography variant="body2">Skip Duplicate Records</Typography>} />
                  <FormControlLabel value="UPDATE" control={<Radio size="small" sx={{ color: '#087A3D', '&.Mui-checked': { color: '#087A3D' } }} />} label={<Typography variant="body2">Update Existing Records</Typography>} />
                  <FormControlLabel value="CREATE" control={<Radio size="small" sx={{ color: '#087A3D', '&.Mui-checked': { color: '#087A3D' } }} />} label={<Typography variant="body2">Create as New Record</Typography>} />
                </RadioGroup>
              </FormControl>
            </Paper>
          </Box>
        )}

        {/* STEP 3: FINAL CONFIRMATION */}
        {activeStep === 3 && selectedFile && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle2 size={56} style={{ color: '#087A3D', margin: '0 auto 16px' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              Ready to Import {rawRows.length} {entityName} Records
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mb: 4, maxWidth: 500, mx: 'auto' }}>
              You are about to insert <strong>{rawRows.length}</strong> validated records into Employee Master using your confirmed column mapping.
            </Typography>

            <Grid container spacing={2} sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mb: 4 }}>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>SOURCE FILE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>{selectedFile.name}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>MAPPED FIELDS</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#087A3D', mt: 0.5 }}>
                    {Object.values(fieldMapping).filter((k) => k !== '__IGNORE__').length} Fields Mapped
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>
          Cancel
        </Button>

        <Stack direction="row" spacing={1.5}>
          {activeStep > 0 && activeStep < 3 && (
            <Button
              onClick={() => setActiveStep((prev) => prev - 1)}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#334155' }}
            >
              Back
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              onClick={handleNextFromMapping}
              variant="contained"
              endIcon={<ArrowRight size={18} />}
              sx={{ bgcolor: '#087A3D', textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { bgcolor: '#066231' } }}
            >
              Preview & Validate
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              onClick={() => setActiveStep(3)}
              variant="contained"
              endIcon={<ArrowRight size={18} />}
              sx={{ bgcolor: '#087A3D', textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { bgcolor: '#066231' } }}
            >
              Proceed to Confirmation
            </Button>
          )}

          {activeStep === 3 && (
            <Button
              onClick={handleExecuteImport}
              disabled={isImporting}
              variant="contained"
              startIcon={<CheckCircle2 size={18} />}
              sx={{ bgcolor: '#087A3D', textTransform: 'none', fontWeight: 700, px: 4, py: 1, '&:hover': { bgcolor: '#066231' } }}
            >
              Import {rawRows.length} Records
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
