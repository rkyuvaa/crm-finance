import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#FEF2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          border: '1px solid #FCA5A5',
        }}
      >
        <ShieldAlert size={38} color="#DC2626" />
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#023020',
          margin: '0 0 8px',
          letterSpacing: -0.4,
        }}
      >
        Access Restricted
      </h1>

      <p
        style={{
          fontSize: 14,
          color: '#6B7280',
          maxWidth: 420,
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}
      >
        You do not have permission to view this module. Please contact your system administrator if you believe this is an error.
      </p>

      <button
        onClick={() => navigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: '#087A3D',
          color: '#FFFFFF',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13.5,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(8, 122, 61, 0.2)',
        }}
      >
        <ArrowLeft size={16} /> Return to Dashboard
      </button>
    </div>
  );
}
