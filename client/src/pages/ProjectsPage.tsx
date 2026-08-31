import { Paper } from '@mui/material';

import EmptyState from '@/components/ui/EmptyState';

export default function ProjectsPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>Projects</div>
        <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
          Track and manage projects across the finance pipeline.
        </div>
      </div>

      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <EmptyState
          title="No projects yet"
          hint="Projects you create will appear here."
        />
      </Paper>
    </div>
  );
}
