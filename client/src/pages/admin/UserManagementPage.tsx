import { useState } from 'react';
import {
  Search,
  Plus,
  Shield,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetDepartmentsQuery,
} from '../../api/rbacApi';
import type { UserDetail } from '../../types/rbac';
import EffectiveAccessModal from './EffectiveAccessModal';
import { formatDateTime, initialsOf } from '../../utils/format';

export default function UserManagementPage() {
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [inspectUserId, setInspectUserId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTab, setEditTab] = useState<'profile' | 'account' | 'roles' | 'department' | 'permissions' | 'activity'>('profile');

  // API Queries
  const { data: usersData, isLoading, refetch } = useGetUsersQuery({
    page,
    page_size: 15,
    search: search || undefined,
    department_id: deptFilter,
    user_status: statusFilter || undefined,
  });

  const { data: rolesList } = useGetRolesQuery();
  const { data: deptsList } = useGetDepartmentsQuery();

  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  // Create Form State
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    mobile: '',
    employee_id: '',
    designation: '',
    primary_role: 'SALES_EXECUTIVE',
    role_ids: [] as number[],
    department_ids: [] as number[],
    primary_department_id: undefined as number | undefined,
    reporting_manager_id: undefined as number | undefined,
    status: 'ACTIVE' as const,
    force_password_change: false,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<Partial<UserDetail> & { password?: string; role_ids?: number[]; department_ids?: number[] }>({});

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(createForm as any).unwrap();
      setIsCreateOpen(false);
      setCreateForm({
        full_name: '',
        email: '',
        username: '',
        password: '',
        mobile: '',
        employee_id: '',
        designation: '',
        primary_role: 'SALES_EXECUTIVE',
        role_ids: [],
        department_ids: [],
        primary_department_id: undefined,
        reporting_manager_id: undefined,
        status: 'ACTIVE',
        force_password_change: false,
      });
      refetch();
    } catch (err: any) {
      alert(err?.data?.detail || 'Failed to create user');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await updateUser({ id: selectedUser.id, data: editForm }).unwrap();
      setSelectedUser(null);
      refetch();
    } catch (err: any) {
      alert(err?.data?.detail || 'Failed to update user');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to soft-delete user ${name}?`)) {
      try {
        await deleteUser(id).unwrap();
        refetch();
      } catch (err: any) {
        alert(err?.data?.detail || 'Failed to delete user');
      }
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#023020', margin: 0, letterSpacing: -0.3 }}>
            User Management
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B80', margin: '4px 0 0' }}>
            Manage organization users, credentials, role assignments, and department mappings.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
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
            boxShadow: '0 4px 12px rgba(8, 122, 61, 0.25)',
          }}
        >
          <Plus size={18} /> Create New User
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #E4EBE1',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={16} color="#7A8B80" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: '1px solid #D8E2D5',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        <select
          value={deptFilter || ''}
          onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : undefined)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13, color: '#44584C' }}
        >
          <option value="">All Departments</option>
          {deptsList?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13, color: '#44584C' }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="LOCKED">Locked</option>
        </select>
      </div>

      {/* Users Data Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E4EBE1', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F8FAF8', borderBottom: '1px solid #E4EBE1', color: '#44584C', fontWeight: 700 }}>
              <th style={{ padding: '12px 16px' }}>User</th>
              <th style={{ padding: '12px 16px' }}>Employee ID</th>
              <th style={{ padding: '12px 16px' }}>Department</th>
              <th style={{ padding: '12px 16px' }}>Designation</th>
              <th style={{ padding: '12px 16px' }}>Roles</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Last Login</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#7A8B80' }}>
                  Loading users...
                </td>
              </tr>
            ) : !usersData?.items || usersData.items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#7A8B80' }}>
                  No users found matching filter criteria.
                </td>
              </tr>
            ) : (
              usersData.items.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F0F4F0' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: '#087A3D',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {initialsOf(u.full_name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#023020' }}>{u.full_name}</div>
                        <div style={{ fontSize: 11, color: '#7A8B80' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#44584C' }}>{u.employee_id || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#04552B', fontWeight: 600 }}>{u.primary_department_name || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#44584C' }}>{u.designation || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ padding: '2px 8px', background: '#EAF6E8', color: '#087A3D', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                        {u.role}
                      </span>
                      {u.assigned_roles?.map((r) => (
                        <span key={r.id} style={{ padding: '2px 8px', background: '#E0F2FE', color: '#0369A1', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: u.status === 'ACTIVE' ? '#DCFCE7' : u.status === 'LOCKED' ? '#FEF3C7' : '#F3F4F6',
                        color: u.status === 'ACTIVE' ? '#15803D' : u.status === 'LOCKED' ? '#B45309' : '#4B5563',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#7A8B80' }}>
                    {u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        title="Effective Access Inspector"
                        onClick={() => setInspectUserId(u.id)}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #D8E2D5', background: '#FFF', cursor: 'pointer', color: '#087A3D' }}
                      >
                        <Shield size={15} />
                      </button>
                      <button
                        title="Edit User"
                        onClick={() => {
                          setSelectedUser(u);
                          setEditForm({
                            full_name: u.full_name,
                            email: u.email,
                            username: u.username || '',
                            mobile: u.mobile || '',
                            employee_id: u.employee_id || '',
                            designation: u.designation || '',
                            status: u.status,
                            role_ids: u.assigned_roles?.map((r) => r.id) || [],
                            department_ids: u.departments?.map((d) => d.id) || [],
                          });
                        }}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #D8E2D5', background: '#FFF', cursor: 'pointer', color: '#0369A1' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        title="Soft Delete User"
                        onClick={() => handleDelete(u.id, u.full_name)}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Effective Access Inspector Modal */}
      {inspectUserId && (
        <EffectiveAccessModal
          userId={inspectUserId}
          userName={usersData?.items?.find((u) => u.id === inspectUserId)?.full_name || 'User'}
          onClose={() => setInspectUserId(null)}
        />
      )}

      {/* Create User Drawer Modal */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 540, background: '#FFF', height: '100vh', overflowY: 'auto', padding: 24, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 800, color: '#023020' }}>Create New User</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Username *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Password *</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Employee ID</label>
                  <input
                    type="text"
                    value={createForm.employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Mobile Number</label>
                  <input
                    type="text"
                    value={createForm.mobile}
                    onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Department</label>
                <select
                  onChange={(e) => setCreateForm({ ...createForm, department_ids: [Number(e.target.value)], primary_department_id: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                >
                  <option value="">Select Department</option>
                  {deptsList?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8E2D5', background: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, background: '#087A3D', color: '#FFF', fontWeight: 700, border: 'none' }}>
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User 6-Tab Drawer Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 620, background: '#FFF', height: '100vh', overflowY: 'auto', padding: 24, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#023020' }}>Edit User: {selectedUser.full_name}</h2>

            {/* 6 Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E4EBE1', marginBottom: 20 }}>
              {(['profile', 'account', 'roles', 'department', 'permissions', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEditTab(tab)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: editTab === tab ? '2px solid #087A3D' : 'none',
                    fontWeight: editTab === tab ? 700 : 500,
                    color: editTab === tab ? '#087A3D' : '#7A8B80',
                    fontSize: 12.5,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {editTab === 'profile' && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Designation</label>
                    <input
                      type="text"
                      value={editForm.designation || ''}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                    />
                  </div>
                </>
              )}

              {editTab === 'account' && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Account Status</label>
                    <select
                      value={editForm.status || 'ACTIVE'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="LOCKED">Locked</option>
                    </select>
                  </div>
                </>
              )}

              {editTab === 'roles' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C', marginBottom: 8, display: 'block' }}>Assigned Roles</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rolesList?.map((r) => (
                      <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={editForm.role_ids?.includes(r.id)}
                          onChange={(e) => {
                            const current = editForm.role_ids || [];
                            if (e.target.checked) setEditForm({ ...editForm, role_ids: [...current, r.id] });
                            else setEditForm({ ...editForm, role_ids: current.filter((id) => id !== r.id) });
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{r.name}</span> - <span style={{ color: '#7A8B80', fontSize: 12 }}>{r.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {editTab === 'department' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#44584C' }}>Department Assignment</label>
                  <select
                    value={editForm.department_ids?.[0] || ''}
                    onChange={(e) => setEditForm({ ...editForm, department_ids: [Number(e.target.value)] })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D8E2D5', fontSize: 13 }}
                  >
                    <option value="">Select Department</option>
                    {deptsList?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setSelectedUser(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8E2D5', background: '#FFF' }}>
                  Close
                </button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, background: '#087A3D', color: '#FFF', fontWeight: 700, border: 'none' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
