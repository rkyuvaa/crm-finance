import { useState } from 'react';
import { Plus, Folder, FileText } from 'lucide-react';
import { useGetPermissionsRegistryQuery, useCreateCustomActionMutation } from '../../api/rbacApi';

export default function PermissionRegistryPage() {
  const { data: registry, isLoading, refetch } = useGetPermissionsRegistryQuery();
  const [createCustomAction] = useCreateCustomActionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    resource_id: 0,
    action_name: '',
    action_code: '',
    description: '',
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomAction(form).unwrap();
      setIsModalOpen(false);
      setForm({ resource_id: 0, action_name: '', action_code: '', description: '' });
      refetch();
    } catch (err: any) {
      alert(err?.data?.detail || 'Failed to register custom action');
    }
  };

  return (
    <div style={{ padding: '16px 0', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#023020', margin: 0, letterSpacing: -0.3 }}>
            Permission Structure Registry
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B80', margin: '4px 0 0' }}>
            System Module → Resource → Action hierarchy. Register custom actions dynamically.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: '#087A3D',
            color: '#FFFFFF',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13.5,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Register Custom Action
        </button>
      </div>

      {/* Registry Modules Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7A8B80' }}>Loading permission registry...</div>
        ) : (
          registry?.map((mod) => (
            <div key={mod.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E4EBE1', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', background: '#F8FAF8', borderBottom: '1px solid #E4EBE1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Folder size={20} color="#087A3D" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#023020' }}>{mod.name}</h3>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#7A8B80' }}>({mod.code})</span>
              </div>

              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {mod.resources.map((res) => (
                  <div key={res.id} style={{ border: '1px solid #E4EBE1', borderRadius: 10, padding: 14, background: '#FAFCFA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, color: '#04552B', fontSize: 14 }}>
                      <FileText size={16} /> {res.name}
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#7A8B80', fontWeight: 500 }}>({res.code})</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {res.actions.map((act) => (
                        <span key={act.id} style={{ padding: '4px 10px', background: '#EAF6E8', color: '#087A3D', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {act.name} <span style={{ opacity: 0.7, fontSize: 10 }}>({act.code})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 450, background: '#FFF', borderRadius: 14, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#023020' }}>Register Custom Action</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Target Resource *</label>
                <select
                  required
                  onChange={(e) => setForm({ ...form, resource_id: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                >
                  <option value="">Select Resource</option>
                  {registry?.flatMap((m) => m.resources).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Action Name * (e.g. Approve, Convert)</label>
                <input
                  type="text"
                  required
                  value={form.action_name}
                  onChange={(e) => setForm({ ...form, action_name: e.target.value, action_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Action Code *</label>
                <input
                  type="text"
                  required
                  value={form.action_code}
                  onChange={(e) => setForm({ ...form, action_code: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8E2D5', background: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, background: '#087A3D', color: '#FFF', fontWeight: 700, border: 'none' }}>
                  Register Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
