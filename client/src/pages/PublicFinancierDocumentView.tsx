import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Lock,
  ShieldCheck,
} from 'lucide-react';

import { usePublicFinancierDocumentViewQuery } from '@/api/applicationsApi';
import DocumentPreviewDialog, { type PreviewFileMeta } from '@/components/ui/DocumentPreviewDialog';

export default function PublicFinancierDocumentView() {
  const { token = '' } = useParams<{ token: string }>();

  const { data, isLoading, isError } = usePublicFinancierDocumentViewQuery(token, {
    skip: !token,
  });

  const [previewFile, setPreviewFile] = useState<PreviewFileMeta | null>(null);

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9F5' }}>
        <CircularProgress color="success" size={32} />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9F5', p: 3 }}>
        <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 480, border: '1px solid #E4EBE1', borderRadius: '16px', boxShadow: '0 8px 24px rgba(2,48,32,0.06)' }}>
          <AlertTriangle size={48} color="#D32F2F" style={{ margin: '0 auto 16px' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#16231B', mb: 1 }}>
            Link unavailable
          </Typography>
          <Typography variant="body2" sx={{ color: '#7A8B80', lineHeight: 1.6 }}>
            This document link is invalid, expired, or has been revoked. Please contact the sender for a new link.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const { leadReferenceNumber, financierName, expiresAt, documents } = data;

  return (
    <Box sx={{ minHeight: '100vh', background: '#F7F9F5', py: 4, px: 2 }}>
      <Container maxWidth="lg">
        {/* Header Branding Panel (No App Shell / No Chrome) */}
        <Paper sx={{ p: 3, border: '1px solid #E4EBE1', borderRadius: '14px', mb: 3, background: '#FFFFFF', boxShadow: '0 4px 16px rgba(2,48,32,0.04)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid #E4EBE1', pb: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: '#087A3D',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18,
                }}
              >
                K
              </Box>
              <div>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#023020', lineHeight: 1.2 }}>
                  CRMFinance / KIM
                </Typography>
                <Typography variant="caption" sx={{ color: '#7A8B80' }}>
                  Secure Document Portal
                </Typography>
              </div>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#7A8B80', display: 'block' }}>Lead Reference</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#087A3D', fontFamily: 'monospace' }}>
                {leadReferenceNumber}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <div>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#16231B' }}>
                Lead Documents for Review
              </Typography>
              <Typography variant="body2" sx={{ color: '#44584C', mt: 0.3 }}>
                Shared with <b>{financierName}</b>. These documents have been shared with you for review. No login is required.
              </Typography>
            </div>

            <Chip
              icon={<Lock size={13} />}
              label={`Expires: ${expiresAt}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 11.5, borderColor: '#087A3D', color: '#087A3D' }}
            />
          </Box>
        </Paper>

        {/* Read-Only Document Table */}
        <TableContainer component={Paper} className="scroll-touch" sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflowX: 'auto', mb: 3 }}>
          <Table>
            <TableHead sx={{ background: '#F8FAF8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Document Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Type / Category</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>File Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Upload Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Quality Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Verified By</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Verified On</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12.5, color: '#44584C' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => {
                const qScore = doc.qualityScore ?? 85;
                let scoreColor: 'success' | 'warning' | 'error' = 'success';
                if (qScore < 50) scoreColor = 'error';
                else if (qScore < 80) scoreColor = 'warning';

                return (
                  <TableRow key={doc.id} sx={{ '&:hover': { background: '#FAFDF9' } }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#16231B' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileText size={17} color="#087A3D" />
                        {doc.name}
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontSize: 12, color: '#44584C' }}>{doc.type}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#44584C' }}>{doc.fileName}</TableCell>

                    <TableCell>
                      <Chip label="Uploaded" color="success" size="small" sx={{ fontWeight: 700, fontSize: 10, height: 20 }} />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={`${doc.qualityStatus} (${qScore}/100)`}
                        color={scoreColor}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
                      />
                    </TableCell>

                    <TableCell sx={{ fontSize: 12, color: '#44584C' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ShieldCheck size={14} color="#087A3D" />
                        <span>{doc.verifiedBy}</span>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontSize: 12, color: '#7A8B80' }}>{doc.verifiedOn}</TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<Eye size={14} />}
                          onClick={() =>
                            setPreviewFile({
                              file_name: doc.fileName,
                              file_path: doc.previewUrl,
                              field_label: doc.name,
                            })
                          }
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12 }}
                        >
                          Preview
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Download size={14} />}
                          href={doc.downloadUrl}
                          download={doc.fileName}
                          sx={{ textTransform: 'none', fontSize: 12 }}
                        >
                          Download
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer Security Notice */}
        <Typography variant="body2" sx={{ textAlign: 'center', color: '#7A8B80', fontSize: 12 }}>
          🔒 This is a secure read-only document link. It expires on <b>{expiresAt}</b>.
        </Typography>

        {/* Document Preview Popup */}
        {previewFile && (
          <DocumentPreviewDialog
            open={Boolean(previewFile)}
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </Container>
    </Box>
  );
}
