import { X, CheckCircle, XCircle, Shield, Award, MapPin } from 'lucide-react';
import { useGetUserEffectivePermissionsQuery } from '../../api/rbacApi';

export default function EffectiveAccessModal({
  userId,
  userName,
  onClose,
}: {
  userId: number;
  userName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetUserEffectivePermissionsQuery(userId);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 25, 15, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 850,
          maxHeight: '90vh',
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E4EBE1',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #023020 0%, #087A3D 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={22} color="#A3E635" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Effective Access Inspector</h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.85 }}>{userName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              opacity: 0.8,
              padding: 6,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A8B80' }}>Calculating permissions...</div>
          ) : !data ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A8B80' }}>No permission details found.</div>
          ) : (
            <div>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: '#F4F7F4', borderRadius: 12, border: '1px solid #E4EBE1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#04552B', textTransform: 'uppercase' }}>
                    <Award size={16} /> Assigned Roles
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {data.roles.length > 0 ? (
                      data.roles.map((r) => (
                        <span key={r} style={{ padding: '3px 10px', background: '#EAF6E8', color: '#087A3D', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {r}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: '#9BA99F' }}>No roles assigned</span>
                    )}
                  </div>
                </div>

                <div style={{ padding: 16, background: '#F4F7F4', borderRadius: 12, border: '1px solid #E4EBE1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#04552B', textTransform: 'uppercase' }}>
                    <MapPin size={16} /> Departments
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {data.departments.length > 0 ? (
                      data.departments.map((d) => (
                        <span key={d} style={{ padding: '3px 10px', background: '#EAF6E8', color: '#04552B', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {d}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: '#9BA99F' }}>No department assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Effective Permission Matrix List */}
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#023020', marginBottom: 12 }}>
                Calculated Permissions ({data.permissions.filter((p) => p.granted).length} Granted)
              </h4>

              <div style={{ borderRadius: 10, border: '1px solid #E4EBE1', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAF8', borderBottom: '1px solid #E4EBE1', color: '#44584C' }}>
                      <th style={{ padding: '10px 14px' }}>Permission Code</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Permission Origin / Source</th>
                      <th style={{ padding: '10px 14px' }}>Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.permissions.map((p) => (
                      <tr key={p.permission_code} style={{ borderBottom: '1px solid #F0F4F0' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#023020' }}>
                          {p.permission_code}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {p.granted ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#087A3D', fontWeight: 700, fontSize: 12 }}>
                              <CheckCircle size={14} /> Granted
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#DC2626', fontWeight: 700, fontSize: 12 }}>
                              <XCircle size={14} /> Denied
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#44584C' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: p.source_type === 'SUPER_ADMIN' ? '#FEF3C7' : p.source_type === 'ROLE' ? '#E0F2FE' : '#F3F4F6',
                              color: p.source_type === 'SUPER_ADMIN' ? '#92400E' : p.source_type === 'ROLE' ? '#0369A1' : '#374151',
                            }}
                          >
                            {p.source_name}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8B80' }}>{p.scope_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
