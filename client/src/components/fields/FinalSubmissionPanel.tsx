import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Mail,
  Send,
  ShieldAlert,
} from 'lucide-react';

import {
  useFinalSubmissionQuery,
  useSendToFinancierMutation,
} from '@/api/applicationsApi';
import DocumentPreviewDialog, { type PreviewFileMeta } from '@/components/ui/DocumentPreviewDialog';
import { useToast } from '@/components/ui/ToastHost';

interface Props {
  applicationId: number;
}

export default function FinalSubmissionPanel({ applicationId }: Props) {
  const { showToast } = useToast();
  const { data: summary, isLoading, refetch } = useFinalSubmissionQuery(applicationId, {
    skip: !applicationId,
  });
  const [sendToFinancier, { isLoading: isSending }] = useSendToFinancierMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFileMeta | null>(null);

  if (isLoading || !summary) {
    return <Typography sx={{ p: 4, textAlign: 'center', color: '#7A8B80' }}>Loading final submission summary…</Typography>;
  }

  const { overallStatus, canSend, blockers, counts, documents, lastSend, financier, leadReferenceNumber } = summary;

  // Compute status badge color & icon
  let statusColor: 'error' | 'warning' | 'success' | 'info' | 'default' = 'default';
  if (overallStatus === 'Documents Missing' || overallStatus === 'Quality Failed') statusColor = 'error';
  else if (overallStatus === 'Pending Verification') statusColor = 'warning';
  else if (overallStatus === 'Ready to Send') statusColor = 'success';
  else if (overallStatus === 'Sent to Financier') statusColor = 'info';
  else if (overallStatus === 'Link Expired') statusColor = 'default';

  const handleSendConfirm = async () => {
    try {
      const res = await sendToFinancier({ appId: applicationId, confirm: true }).unwrap();
      showToast(res.message || 'Documents sent to financier successfully!', 'success');
      setConfirmOpen(false);
      refetch();
    } catch (err: any) {
      const errMsg = err?.data?.detail?.message || err?.data?.detail || 'Failed to send documents to financier';
      showToast(typeof errMsg === 'string' ? errMsg : 'Failed to send documents', 'error');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header Info Panel */}
      <Paper sx={{ p: 2.5, border: '1px solid #E4EBE1', borderRadius: '12px', background: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <div>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#023020' }}>
                Final Submission & Financier Document Transfer
              </Typography>
              <Chip
                label={overallStatus}
                color={statusColor}
                sx={{ fontWeight: 800, fontSize: 11.5, px: 0.5 }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#7A8B80', mt: 0.5 }}>
              Lead Reference: <b style={{ color: '#087A3D' }}>{leadReferenceNumber}</b>
            </Typography>
          </div>

          {/* Financier Card */}
          <Paper sx={{ p: 1.5, border: '1px solid #C9E0C6', borderRadius: '8px', background: '#F8FAF8', minWidth: 260 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Building2 size={16} color="#087A3D" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#16231B' }}>
                {financier.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#44584C', fontSize: 12 }}>
              <Mail size={14} color="#7A8B80" />
              <span>{financier.email || 'No email configured'}</span>
            </Box>
          </Paper>
        </Box>

        {/* Last Send Metadata Banner */}
        {lastSend && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              border: '1px solid #B4D7B1',
              borderRadius: '8px',
              background: '#F2FAF0',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircle2 size={18} color="#087A3D" />
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#023020' }}>
                  Last Sent to {lastSend.sentToName} ({lastSend.sentToEmail})
                </span>
                <div style={{ fontSize: 11.5, color: '#44584C', marginTop: 1 }}>
                  Sent by <b>{lastSend.sentBy || 'System'}</b> on {lastSend.sentOn} • Expiration: <b>{lastSend.expiresAt}</b>
                </div>
              </div>
            </Box>
            <Chip
              label={`Accessed ${lastSend.accessCount} times`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 10.5, borderColor: '#087A3D', color: '#087A3D' }}
            />
          </Box>
        )}
      </Paper>

      {/* Summary KPI Count Badges */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5 }}>
        <Paper sx={{ p: 1.5, border: '1px solid #E4EBE1', borderRadius: '8px' }}>
          <Typography variant="caption" sx={{ color: '#7A8B80', fontWeight: 600 }}>Total Documents</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#16231B' }}>{counts.total}</Typography>
        </Paper>
        <Paper sx={{ p: 1.5, border: '1px solid #E4EBE1', borderRadius: '8px' }}>
          <Typography variant="caption" sx={{ color: '#087A3D', fontWeight: 600 }}>Mandatory</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#04552B' }}>{counts.mandatory}</Typography>
        </Paper>
        <Paper sx={{ p: 1.5, border: '1px solid #E4EBE1', borderRadius: '8px', background: counts.pendingUpload > 0 ? '#FFF5F5' : '#FFFFFF' }}>
          <Typography variant="caption" sx={{ color: counts.pendingUpload > 0 ? '#D32F2F' : '#7A8B80', fontWeight: 600 }}>Uploaded</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: counts.pendingUpload > 0 ? '#D32F2F' : '#16231B' }}>
            {counts.uploaded} / {counts.total}
          </Typography>
        </Paper>
        <Paper sx={{ p: 1.5, border: '1px solid #E4EBE1', borderRadius: '8px', background: counts.qualityFailed > 0 ? '#FFF5F5' : '#FFFFFF' }}>
          <Typography variant="caption" sx={{ color: counts.qualityFailed > 0 ? '#D32F2F' : '#087A3D', fontWeight: 600 }}>Quality Approved</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: counts.qualityFailed > 0 ? '#D32F2F' : '#04552B' }}>
            {counts.qualityApproved} / {counts.uploaded}
          </Typography>
        </Paper>
        <Paper sx={{ p: 1.5, border: '1px solid #E4EBE1', borderRadius: '8px', background: counts.pendingVerification > 0 ? '#FFFDF5' : '#F4F9F2' }}>
          <Typography variant="caption" sx={{ color: counts.pendingVerification > 0 ? '#B45309' : '#087A3D', fontWeight: 600 }}>Verified</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: counts.pendingVerification > 0 ? '#92400E' : '#04552B' }}>
            {counts.verified} / {counts.uploaded}
          </Typography>
        </Paper>
      </Box>

      {/* Blocking Issues Panel */}
      {!canSend && blockers.length > 0 && (
        <Alert
          severity="error"
          icon={<ShieldAlert size={20} />}
          sx={{ border: '1px solid #FCA5A5', borderRadius: '10px', '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Cannot send documents to financier yet
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
            {blockers.map((b, idx) => (
              <li key={idx}><b>{b}</b></li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Documents Summary Table */}
      <TableContainer component={Paper} className="scroll-touch" sx={{ border: '1px solid #E4EBE1', borderRadius: '12px', overflowX: 'auto' }}>
        <Table size="small">
          <TableHead sx={{ background: '#F8FAF8' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Document Name</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Mandatory</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Upload Status</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>File Name</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Quality Status</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Verified By</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Verified On</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#44584C' }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => {
              const isMissingMandatory = doc.mandatory && doc.uploadStatus !== 'UPLOADED';
              const isPoorQuality = doc.mandatory && doc.qualityStatus === 'POOR';
              const isUnverifiedMandatory = doc.mandatory && doc.uploadStatus === 'UPLOADED' && doc.verifiedBy === '-';

              let rowBg = '#FFFFFF';
              if (isMissingMandatory || isPoorQuality) rowBg = '#FFF5F5';
              else if (isUnverifiedMandatory) rowBg = '#FFFDF5';

              return (
                <TableRow key={doc.id} sx={{ background: rowBg, '&:hover': { background: '#FAFDF9' } }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#16231B' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileText size={16} color="#087A3D" />
                      {doc.name}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#44584C' }}>{doc.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={doc.mandatory ? 'Yes' : 'No'}
                      size="small"
                      color={doc.mandatory ? 'primary' : 'default'}
                      sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={doc.uploadStatus}
                      color={doc.uploadStatus === 'UPLOADED' ? 'success' : 'error'}
                      size="small"
                      sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#44584C', wordBreak: 'break-all', maxWith: 200 }}>{doc.fileName}</TableCell>
                  <TableCell>
                    {doc.qualityStatus === 'GOOD' && <Chip label={`Good (${doc.qualityScore}/100)`} color="success" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />}
                    {doc.qualityStatus === 'POOR' && <Chip label={`Poor (${doc.qualityScore}/100)`} color="error" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />}
                    {doc.qualityStatus === 'NOT_CHECKED' && <Chip label="Not Checked" color="warning" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />}
                    {doc.qualityStatus === '-' && <span style={{ color: '#7A8B80', fontSize: 12 }}>-</span>}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#44584C' }}>{doc.verifiedBy}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#7A8B80' }}>{doc.verifiedOn}</TableCell>
                  <TableCell align="right">
                    {doc.fileMetadata ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={13} />}
                        onClick={() =>
                          setPreviewFile({
                            file_name: doc.fileMetadata?.file_name || doc.fileName || 'Document',
                            file_path: doc.fileMetadata?.file_path || '',
                            file_size: doc.fileMetadata?.file_size,
                            mime_type: doc.fileMetadata?.mime_type,
                            field_label: doc.name,
                          })
                        }
                        sx={{ textTransform: 'none', fontSize: 11.5, fontWeight: 700, py: 0.2 }}
                      >
                        Preview
                      </Button>
                    ) : (
                      <span style={{ color: '#7A8B80', fontSize: 12 }}>-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Sticky Primary Action Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
        <Tooltip title={!canSend && blockers.length > 0 ? blockers[0] : ''} arrow>
          <span>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!canSend || isSending}
              startIcon={<Send size={18} />}
              onClick={() => setConfirmOpen(true)}
              sx={{
                fontWeight: 800,
                fontSize: 14,
                px: 3.5,
                py: 1.2,
                borderRadius: '10px',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(8,122,61,0.25)',
              }}
            >
              {lastSend ? 'Resend Documents to Financier' : 'Send Documents to Financier'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020', pb: 1 }}>
          Send documents to financier?
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Typography variant="body2" sx={{ color: '#44584C', mb: 2 }}>
            You are about to send a secure no-login link to:
          </Typography>
          <Paper sx={{ p: 2, background: '#F8FAF8', border: '1px solid #E4EBE1', borderRadius: '8px', mb: 2 }}>
            <div style={{ fontSize: 13, margin: '4px 0' }}><b>Financier:</b> {financier.name}</div>
            <div style={{ fontSize: 13, margin: '4px 0' }}><b>Email:</b> {financier.email}</div>
            <div style={{ fontSize: 13, margin: '4px 0' }}><b>Lead Reference:</b> {leadReferenceNumber}</div>
          </Paper>
          <Typography variant="caption" sx={{ color: '#7A8B80', display: 'block', mb: 1.5 }}>
            The financier will be able to view only the uploaded documents for this lead. They will not be able to access any other lead information or application tabs.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#087A3D', fontSize: 12, fontWeight: 700 }}>
            <Clock size={15} />
            <span>Link expiry: 14 days (secure token authorization)</span>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSendConfirm}
            variant="contained"
            color="primary"
            disabled={isSending}
            startIcon={<Send size={16} />}
            sx={{ fontWeight: 700 }}
          >
            {isSending ? 'Sending Link...' : 'Confirm & Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Preview Popup */}
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
