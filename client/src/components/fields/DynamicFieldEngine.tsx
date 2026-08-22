import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Save, Upload, FileText, Download, Eye } from 'lucide-react';

import { useTabFieldsQuery } from '@/api/mastersApi';
import { useCustomFieldValuesQuery, useSaveCustomFieldValuesMutation } from '@/api/applicationsApi';
import { useToast } from '@/components/ui/ToastHost';
import { useAppSelector } from '@/app/hooks';
import DocumentPreviewDialog, { type PreviewFileMeta } from '@/components/ui/DocumentPreviewDialog';
import type { CrmTabFieldConfig } from '@/types';

interface Props {
  tabId: number;
  tabCode?: string;
  applicationId: number;
  customerName?: string;
  currentStageKey: string;
}

export default function DynamicFieldEngine({
  tabId,
  tabCode: _tabCode,
  applicationId,
  customerName: _customerName,
  currentStageKey,
}: Props) {
  const { showToast } = useToast();
  const user = useAppSelector((state) => state.auth.user);

  const { data: fields = [], isLoading: loadingFields } = useTabFieldsQuery(tabId, { skip: !tabId });
  const { data: storedValues = [], isLoading: loadingValues } = useCustomFieldValuesQuery(applicationId, { skip: !applicationId });
  const [saveValues, { isLoading: isSaving }] = useSaveCustomFieldValuesMutation();

  const [formState, setFormState] = useState<Record<number, string>>({});
  const [fileMetadataState, setFileMetadataState] = useState<Record<number, any>>({});
  const [previewFile, setPreviewFile] = useState<PreviewFileMeta | null>(null);

  useEffect(() => {
    if (storedValues && storedValues.length > 0) {
      const vals: Record<number, string> = {};
      const files: Record<number, any> = {};
      storedValues.forEach((item) => {
        if (item.value !== null && item.value !== undefined) {
          vals[item.field_id] = item.value;
        }
        if (item.file_metadata) {
          files[item.field_id] = item.file_metadata;
        }
      });
      setFormState(vals);
      setFileMetadataState(files);
    }
  }, [storedValues]);

  const handleTextChange = (fieldId: number, val: string) => {
    setFormState((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleFileUploadSimulated = (field: CrmTabFieldConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field.file_config?.max_size_mb && file.size > field.file_config.max_size_mb * 1024 * 1024) {
      showToast(`File size exceeds maximum limit of ${field.file_config.max_size_mb}MB`, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      const meta = {
        file_name: file.name,
        file_path: dataUrl,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
      };
      setFileMetadataState((prev) => ({ ...prev, [field.id]: meta }));
      setFormState((prev) => ({ ...prev, [field.id]: file.name }));
      showToast(`Uploaded ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (fieldId: number) => {
    setFileMetadataState((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });
    setFormState((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });
  };

  const handleSave = async () => {
    // Validate stage rules and required fields
    for (const f of fields) {
      const stageRule = f.stage_rules?.[currentStageKey] || {};
      const isReq = stageRule.required !== undefined ? stageRule.required : f.is_required;
      const isVis = stageRule.visible !== undefined ? stageRule.visible : f.is_visible;

      if (isVis && isReq && (!formState[f.id] || formState[f.id].trim() === '')) {
        showToast(`Field '${f.label}' is required for stage '${currentStageKey}'`, 'error');
        return;
      }
    }

    const payload = fields.map((f) => ({
      field_id: f.id,
      value: formState[f.id] ?? null,
      file_metadata: fileMetadataState[f.id] ?? null,
    }));

    try {
      await saveValues({ appId: applicationId, body: payload }).unwrap();
      showToast('Custom field values saved successfully', 'success');
    } catch (err: any) {
      showToast('Failed to save field values', 'error');
    }
  };

  if (loadingFields || loadingValues) {
    return <Typography sx={{ p: 3, textAlign: 'center', color: '#7A8B80' }}>Loading dynamic fields...</Typography>;
  }

  // Filter fields based on role & stage visibility
  const userRole = user?.role || 'ADMIN';
  const visibleFields = fields.filter((f) => {
    if (f.is_archived) return false;
    const perm = f.field_permissions?.[userRole];
    if (perm && perm.view === false) return false;

    const stageRule = f.stage_rules?.[currentStageKey];
    if (stageRule && stageRule.visible === false) return false;

    return f.is_visible;
  });

  if (visibleFields.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', background: '#F8FAF8', border: '1px dashed #C9E0C6', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#16231B' }}>
          No custom fields configured for this tab stage
        </Typography>
        <Typography variant="body2" sx={{ color: '#7A8B80', mt: 0.5 }}>
          Admin can configure custom fields and stage rules in <b>Configuration &gt; Module Tabs &gt; Configure Fields</b>.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {visibleFields.map((f) => {
          const stageRule = f.stage_rules?.[currentStageKey] || {};
          const isReq = stageRule.required !== undefined ? stageRule.required : f.is_required;
          const isReadonly = stageRule.readonly !== undefined ? stageRule.readonly : f.is_readonly;
          const val = formState[f.id] || f.default_value || '';
          const fileMeta = fileMetadataState[f.id];

          return (
            <Paper key={f.id} sx={{ p: 2, border: '1px solid #E4EBE1', borderRadius: '10px', background: '#FFFFFF' }}>
              <FormLabel sx={{ fontWeight: 700, fontSize: 13, color: '#16231B', display: 'block', mb: 1 }}>
                {f.label} {isReq && <span style={{ color: 'red' }}>*</span>}
              </FormLabel>

              {f.field_type === 'text' && (
                <TextField
                  size="small"
                  fullWidth
                  value={val}
                  placeholder={f.placeholder || `Enter ${f.label}`}
                  disabled={isReadonly}
                  onChange={(e) => handleTextChange(f.id, e.target.value)}
                />
              )}

              {f.field_type === 'numeric' && (
                <TextField
                  size="small"
                  type="number"
                  fullWidth
                  value={val}
                  placeholder={f.placeholder || '0'}
                  disabled={isReadonly}
                  onChange={(e) => handleTextChange(f.id, e.target.value)}
                />
              )}

              {f.field_type === 'date' && (
                <TextField
                  size="small"
                  type="date"
                  fullWidth
                  value={val}
                  disabled={isReadonly}
                  onChange={(e) => handleTextChange(f.id, e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              )}

              {f.field_type === 'boolean' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={val === 'Yes' ? 'contained' : 'outlined'}
                    color="primary"
                    size="small"
                    disabled={isReadonly}
                    onClick={() => handleTextChange(f.id, 'Yes')}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={val === 'No' ? 'contained' : 'outlined'}
                    color="inherit"
                    size="small"
                    disabled={isReadonly}
                    onClick={() => handleTextChange(f.id, 'No')}
                  >
                    No
                  </Button>
                </Box>
              )}

              {f.field_type === 'toggle' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={val === 'true' || val === 'ON'}
                      disabled={isReadonly}
                      onChange={(e) => handleTextChange(f.id, e.target.checked ? 'ON' : 'OFF')}
                    />
                  }
                  label={val === 'true' || val === 'ON' ? 'ON' : 'OFF'}
                />
              )}

              {f.field_type === 'dropdown' && (
                <Select
                  size="small"
                  fullWidth
                  value={val}
                  disabled={isReadonly}
                  onChange={(e) => handleTextChange(f.id, String(e.target.value))}
                >
                  <MenuItem value="">Select option</MenuItem>
                  {f.options?.map((o, idx) => (
                    <MenuItem key={idx} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              )}

              {f.field_type === 'file' && (
                <Box>
                  {fileMeta ? (
                    <Paper sx={{ p: 1.5, border: '1px solid #C9E0C6', background: '#F8FAF8', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileText size={18} color="#087A3D" />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#16231B' }}>{fileMeta.file_name}</div>
                            <div style={{ fontSize: 10.5, color: '#7A8B80' }}>
                              {(fileMeta.file_size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Eye size={14} />}
                            onClick={() =>
                              setPreviewFile({
                                file_name: fileMeta.file_name,
                                file_path: fileMeta.file_path,
                                file_size: fileMeta.file_size,
                                mime_type: fileMeta.mime_type,
                                field_label: f.label,
                              })
                            }
                            sx={{ textTransform: 'none', fontSize: 11.5, fontWeight: 700 }}
                          >
                            Preview
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<Download size={14} />}
                            href={fileMeta.file_path}
                            target="_blank"
                            download={fileMeta.file_name}
                            sx={{ textTransform: 'none', fontSize: 11.5 }}
                          >
                            Download
                          </Button>
                          <Button size="small" color="error" onClick={() => handleRemoveFile(f.id)} sx={{ textTransform: 'none', fontSize: 11.5 }}>
                            Delete
                          </Button>
                        </Box>
                      </Box>
                      {fileMeta.mime_type?.startsWith('image/') && (
                        <Box
                          sx={{ mt: 1.5, textAlign: 'center', cursor: 'pointer' }}
                          onClick={() =>
                            setPreviewFile({
                              file_name: fileMeta.file_name,
                              file_path: fileMeta.file_path,
                              file_size: fileMeta.file_size,
                              mime_type: fileMeta.mime_type,
                              field_label: f.label,
                            })
                          }
                        >
                          <img
                            src={fileMeta.file_path}
                            alt="Preview"
                            style={{ maxHeight: 120, borderRadius: 6, border: '1px solid #E4EBE1', transition: 'transform 0.2s' }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', color: '#087A3D', fontWeight: 600, mt: 0.5 }}>
                            Click image to open full popup preview
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  ) : (
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload size={16} />}
                      disabled={isReadonly}
                      sx={{ textTransform: 'none', fontSize: 13 }}
                    >
                      Upload {f.label}
                      <input
                        type="file"
                        hidden
                        onChange={(e) => handleFileUploadSimulated(f, e)}
                        accept={f.file_config?.allowed_extensions?.join(',')}
                      />
                    </Button>
                  )}
                </Box>
              )}

              {f.help_text && (
                <Typography variant="caption" sx={{ color: '#7A8B80', display: 'block', mt: 0.5 }}>
                  {f.help_text}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button
          variant="contained"
          startIcon={<Save size={16} />}
          onClick={handleSave}
          disabled={isSaving}
        >
          Save Custom Fields
        </Button>
      </Box>

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
