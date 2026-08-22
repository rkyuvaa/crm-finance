import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { Download, FileText, X, Image as ImageIcon, ExternalLink } from 'lucide-react';

export interface PreviewFileMeta {
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  field_label?: string;
}

interface Props {
  open: boolean;
  file: PreviewFileMeta | null;
  onClose: () => void;
}

export default function DocumentPreviewDialog({ open, file, onClose }: Props) {
  if (!file) return null;

  const fileName = file.file_name || 'Document';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = file.mime_type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isPdf = file.mime_type === 'application/pdf' || ext === 'pdf';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <DialogTitle
        sx={{
          fontWeight: 800,
          color: '#023020',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          background: '#F8FAF8',
          borderBottom: '1px solid #E4EBE1',
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isImage ? <ImageIcon size={22} color="#087A3D" /> : <FileText size={22} color="#087A3D" />}
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#023020' }}>
              {file.field_label || fileName}
            </div>
            <div style={{ fontSize: 12, color: '#7A8B80', fontWeight: 500, marginTop: 2 }}>
              {fileName} {file.file_size ? `• ${(file.file_size / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#44584C' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, background: '#F4F7F4', minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isImage ? (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              background: '#FFFFFF',
              border: '1px solid #E4EBE1',
              borderRadius: '12px',
              maxWidth: '100%',
              display: 'flex',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <img
              src={file.file_path}
              alt={fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
          </Paper>
        ) : isPdf ? (
          <Box sx={{ width: '100%', height: '520px', background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E4EBE1' }}>
            <object
              data={file.file_path}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ borderRadius: '12px' }}
            >
              <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <FileText size={40} color="#087A3D" style={{ marginBottom: 12 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#16231B', mb: 1 }}>
                  {fileName}
                </Typography>
                <Typography variant="body2" sx={{ color: '#7A8B80', mb: 2.5, maxWidth: 380 }}>
                  Browser security policies restrict inline PDF preview for temporary local files. You can open or download the file directly below.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ExternalLink size={16} />}
                    href={file.file_path}
                    target="_blank"
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Open PDF in New Tab
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Download size={16} />}
                    href={file.file_path}
                    download={fileName}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Download PDF
                  </Button>
                </Box>
              </Paper>
            </object>
          </Box>
        ) : (
          <Paper sx={{ p: 5, textAlign: 'center', background: '#FFFFFF', border: '1px solid #E4EBE1', borderRadius: '16px', maxWidth: 420 }}>
            <FileText size={48} color="#087A3D" style={{ margin: '0 auto 16px' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#16231B', mb: 1 }}>
              {fileName}
            </Typography>
            <Typography variant="body2" sx={{ color: '#7A8B80', mb: 3 }}>
              Inline preview is not available for this document type (<code>.{ext}</code>). You can download or open the file directly in a new window.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Download size={16} />}
              href={file.file_path}
              target="_blank"
              download={fileName}
              sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
            >
              Download Document
            </Button>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, background: '#FFFFFF', borderTop: '1px solid #E4EBE1', justifyContent: 'space-between' }}>
        <Chip label={`Format: .${ext.toUpperCase()}`} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExternalLink size={14} />}
            href={file.file_path}
            target="_blank"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Open in New Tab
          </Button>
          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<Download size={14} />}
            href={file.file_path}
            target="_blank"
            download={fileName}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Download
          </Button>
          <Button variant="text" size="small" onClick={onClose} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
