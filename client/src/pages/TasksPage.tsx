import { Paper } from '@mui/material';

import EmptyState from '@/components/ui/EmptyState';

export default function TasksPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>Task</div>
        <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
          Assign, track and complete tasks for your projects.
        </div>
      </div>

      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <EmptyState
          title="No tasks yet"
          hint="Tasks you create will appear here."
        />
      </Paper>
    </div>
  );
}
