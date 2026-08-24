import { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
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

function MiniScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#087A3D' : score >= 50 ? '#D97706' : '#DC2626';
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Moderate' : 'Low';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <svg width="40" height="24" viewBox="0 0 40 24" style={{ overflow: 'visible', flexShrink: 0 }}>
        <path
          d="M 4 20 A 16 16 0 0 1 36 20"
          fill="none"
          stroke="#E4EBE1"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 4 20 A 16 16 0 0 1 36 20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="50.2"
          strokeDashoffset={50.2 - (50.2 * Math.min(score, 100)) / 100}
        />
      </svg>
      <Box sx={{ whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color, lineHeight: 1 }}>{score}/100</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#7A8B80', marginTop: 1 }}>{label}</div>
      </Box>
    </Box>
  );
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
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
        <Paper sx={{ p: 1.8, border: '1px solid #E4EBE1', borderRadius: '10px' }}>
          <Typography variant="caption" sx={{ color: '#7A8B80', fontWeight: 600 }}>Total Synchronized Documents</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#16231B', mt: 0.5 }}>{totalCount}</Typography>
        </Paper>
        <Paper sx={{ p: 1.8, border: '1px solid #E4EBE1', borderRadius: '10px', background: '#F4F9F2' }}>
          <Typography variant="caption" sx={{ color: '#087A3D', fontWeight: 600 }}>Verified (OFF → ON)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#04552B', mt: 0.5 }}>{verifiedCount} / {totalCount}</Typography>
        </Paper>
        <Paper sx={{ p: 1.8, border: '1px solid #E4EBE1', borderRadius: '10px', background: '#FFFDF5' }}>
          <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600 }}>Pending Verification</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#92400E', mt: 0.5 }}>{pendingCount}</Typography>
        </Paper>
        <Paper sx={{ p: 1.8, border: '1px solid #E4EBE1', borderRadius: '10px' }}>
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
        <TableContainer component={Paper} className="scroll-touch" sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ background: '#F8FAF8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Document Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Quality Score</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Verified</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => {
                const score = doc.quality_score ?? 85;
                const ext = doc.file_name.split('.').pop()?.toUpperCase() || 'DOC';

                return (
                  <TableRow key={doc.id} sx={{ '&:hover': { background: '#FAFDF9' } }}>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                        <FileText size={18} color="#087A3D" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#16231B' }}>{doc.field_label}</div>
                          <div style={{ fontSize: 10.5, color: '#7A8B80', wordBreak: 'break-all' }}>
                            {doc.file_name} {doc.file_size ? `• ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                          </div>
                        </div>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip label={ext} size="small" sx={{ fontWeight: 700, fontSize: 9.5, height: 18 }} />
                    </TableCell>

                    <TableCell>
                      <MiniScoreGauge score={score} />
                    </TableCell>

                    <TableCell>
                      {doc.is_verified ? (
                        <Box>
                          <Chip
                            icon={<CheckCircle2 size={12} />}
                            label="Verified"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 10.5, height: 20 }}
                          />
                          {doc.verified_by_name && (
                            <div style={{ fontSize: 9.5, color: '#7A8B80', marginTop: 2 }}>
                              By {doc.verified_by_name} {doc.verified_at ? `on ${formatDate(doc.verified_at)}` : ''}
                            </div>
                          )}
                        </Box>
                      ) : (
                        <Chip
                          label="Pending Verification"
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 700, fontSize: 10.5, height: 20 }}
                        />
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="Toggle to verify document after review">
                        <Switch
                          checked={doc.is_verified}
                          disabled={isToggling}
                          onChange={(e) => handleToggle(doc, e.target.checked)}
                          color="success"
                          size="small"
                        />
                      </Tooltip>
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Preview Document">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            setPreviewFile({
                              file_name: doc.file_name,
                              file_path: doc.file_path,
                              file_size: doc.file_size,
                              mime_type: doc.mime_type,
                              field_label: doc.field_label,
                            })
                          }
                          sx={{
                            border: '1px solid #C9E0C6',
                            borderRadius: '8px',
                            p: 0.7,
                            color: '#087A3D',
                            '&:hover': { background: '#EAF6E8', borderColor: '#087A3D' },
                          }}
                        >
                          <Eye size={15} />
                        </IconButton>
                      </Tooltip>
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
