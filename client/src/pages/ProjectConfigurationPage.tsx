import React from 'react';
import { Box, Typography } from '@mui/material';
import ProjectWorkflowSettingsCard from '@/components/settings/ProjectWorkflowSettingsCard';

export default function ProjectConfigurationPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 1200 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#023020', letterSpacing: -0.5 }}>
          Project & Task Configuration
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          Admin management of workflow pipeline statuses, custom fields registry, and task configuration.
        </Typography>
      </Box>

      <ProjectWorkflowSettingsCard />
    </Box>
  );
}
