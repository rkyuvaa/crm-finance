import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileText,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';

import {
  useVerificationDocumentsQuery,
  useToggleVerifyDocumentMutation,
} from '@/api/applicationsApi';
import DocumentPreviewDialog, { type PreviewFileMeta } from '@/components/ui/DocumentPreviewDialog';
import { useToast } from '@/components/ui/ToastHost';
import { formatDate } from '@/utils/format';
import type { VerificationDocument } from '@/types';

interface Props {
  applicationId: number;
}

export default function DocumentVerificationPanel({ applicationId }: Props) {
  const { showToast } = useToast();
  const { data: documents = [], isLoading, refetch } = useVerificationDocumentsQuery(applicationId, {
    skip: !applicationId,
  });
  const [toggleVerify, { isLoading: isToggling }] = useToggleVerifyDocumentMutation();

  const [previewFile, setPreviewFile] = useState<PreviewFileMeta | null>(null);

  const handleToggle = async (doc: VerificationDocument, targetVerified: boolean) => {
    try {
      await toggleVerify({
        appId: applicationId,
        valId: doc.id,
        isVerified: targetVerified,
      }).unwrap();

      showToast(
        targetVerified
          ? `Document '${doc.field_label}' marked as VERIFIED`
          : `Document '${doc.field_label}' set to PENDING VERIFICATION`,
        targetVerified ? 'success' : 'info'
      );
      refetch();
    } catch (err: any) {
      showToast('Failed to update verification status', 'error');
    }
  };

  if (isLoading) {
    return <Typography sx={{ p: 4, textAlign: 'center', color: '#7A8B80' }}>Loading verification documents...</Typography>;
  }

  const totalCount = documents.length;
  const verifiedCount = documents.filter((d) => d.is_verified).length;
  const pendingCount = totalCount - verifiedCount;
  const avgScore = totalCount > 0
    ? Math.round(documents.reduce((acc, d) => acc + (d.quality_score || 0), 0) / totalCount)
    : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Business Rule Banner */}
      <Paper
        sx={{
          p: 2,
          background: '#F4F9F2',
          border: '1px solid #C9E0C6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}
      >
        <Info size={20} color="#087A3D" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#023020' }}>
            Document Synchronization & Verification System
          </div>
          <div style={{ fontSize: 12, color: '#44584C', marginTop: 2 }}>
            Every document uploaded under <b>Documents Upload</b> appears here automatically with an AI OCR Quality Score (0–100/100).
            <b> Note:</b> High OCR scores do not auto-verify documents. Users must manually review and turn the <b>Verified Toggle ON</b>.
          </div>
        </div>
      </Paper>

      {/* Summary KPI Counters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
        <Paper sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '10px' }}>
          <Typography variant="caption" sx={{ color: '#7A8B80', fontWeight: 600 }}>Total Synchronized Documents</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#16231B', mt: 0.5 }}>{totalCount}</Typography>
        </Paper>
        <Paper sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '10px', background: '#F4F9F2' }}>
          <Typography variant="caption" sx={{ color: '#087A3D', fontWeight: 600 }}>Verified (OFF → ON)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#04552B', mt: 0.5 }}>{verifiedCount} / {totalCount}</Typography>
        </Paper>
        <Paper sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '10px', background: '#FFFDF5' }}>
          <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600 }}>Pending Verification</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#92400E', mt: 0.5 }}>{pendingCount}</Typography>
        </Paper>
        <Paper sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '10px' }}>
          <Typography variant="caption" sx={{ color: '#7A8B80', fontWeight: 600 }}>Avg OCR Quality Score</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#16231B' }}>{avgScore}/100</Typography>
            <Sparkles size={16} color="#087A3D" />
          </Box>
        </Paper>
      </Box>

      {/* Verification Document List */}
      {documents.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', background: '#F8FAF8', border: '1px dashed #C9E0C6', borderRadius: 3 }}>
          <ShieldCheck size={40} color="#087A3D" style={{ margin: '0 auto 12px' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#16231B' }}>No Documents Uploaded Yet</Typography>
          <Typography variant="body2" sx={{ color: '#7A8B80', mt: 0.5 }}>
            Upload Aadhaar, PAN Card, or Bank Statements in the <b>Documents Upload</b> tab. They will automatically synchronize here for quality scoring and manual verification.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ border: '1px solid #E4EBE1', borderRadius: '12px' }}>
          <Table>
            <TableHead sx={{ background: '#F8FAF8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Document Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Quality Score</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Verified (Manual)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => {
                const score = doc.quality_score ?? 85;
                const ext = doc.file_name.split('.').pop()?.toUpperCase() || 'DOC';
                const isLowQuality = score < 70;

                let scoreColor: 'success' | 'warning' | 'error' = 'success';
                if (score < 50) scoreColor = 'error';
                else if (score < 80) scoreColor = 'warning';

                return (
                  <TableRow key={doc.id} sx={{ '&:hover': { background: '#FAFDF9' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <FileText size={18} color="#087A3D" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#16231B' }}>{doc.field_label}</div>
                          <div style={{ fontSize: 11, color: '#7A8B80' }}>
                            {doc.file_name} {doc.file_size ? `• ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                          </div>
                        </div>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip label={ext} size="small" sx={{ fontWeight: 700, fontSize: 10, height: 20 }} />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ minWidth: 140 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: scoreColor === 'error' ? '#D32F2F' : scoreColor === 'warning' ? '#B45309' : '#04552B' }}>
                            {score} / 100
                          </span>
                          <Chip
                            label={score >= 80 ? 'Excellent' : score >= 50 ? 'Moderate' : 'Low'}
                            color={scoreColor}
                            size="small"
                            sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={score}
                          color={scoreColor}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        {isLowQuality && (
                          <Chip
                            icon={<AlertTriangle size={12} />}
                            label="Low Quality — Manual Review Required"
                            color="error"
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1, height: 20, fontSize: 9.5, fontWeight: 700 }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      {doc.is_verified ? (
                        <Box>
                          <Chip
                            icon={<CheckCircle2 size={13} />}
                            label="Verified"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 11 }}
                          />
                          {doc.verified_by_name && (
                            <div style={{ fontSize: 10, color: '#7A8B80', marginTop: 3 }}>
                              By {doc.verified_by_name} {doc.verified_at ? `on ${formatDate(doc.verified_at)}` : ''}
                            </div>
                          )}
                        </Box>
                      ) : (
                        <Chip
                          label="Pending Verification"
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Tooltip title="Turn toggle ON to manually verify this document after inspection">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Switch
                            checked={doc.is_verified}
                            disabled={isToggling}
                            onChange={(e) => handleToggle(doc, e.target.checked)}
                            color="success"
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: doc.is_verified ? '#04552B' : '#7A8B80' }}>
                            [{doc.is_verified ? 'ON' : 'OFF'}]
                          </span>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<Eye size={14} />}
                        onClick={() =>
                          setPreviewFile({
                            file_name: doc.file_name,
                            file_path: doc.file_path,
                            file_size: doc.file_size,
                            mime_type: doc.mime_type,
                            field_label: doc.field_label,
                          })
                        }
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12 }}
                      >
                        Preview
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {previewFile && (
        <DocumentPreviewDialog
          open={Boolean(previewFile)}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </Box>
  );
}
