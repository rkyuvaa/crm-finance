import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  hint?: string;
}

export default function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7A8B80' }}>
      <Inbox size={34} color="#9BA99F" style={{ margin: '0 auto' }} />
      <p style={{ fontSize: 13, marginTop: 8 }}>{title}</p>
      {hint && <small style={{ fontSize: 11.5, color: '#9BA99F' }}>{hint}</small>}
    </div>
  );
}
