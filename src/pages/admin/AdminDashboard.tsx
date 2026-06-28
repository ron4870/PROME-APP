import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
interface Role {
  id: number;
  name: string;
  permissions: Record<string, boolean>;
}

interface User {
  id: number;
  name: string;
  email: string;
  division?: string;
  roles: Role[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'user_config' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');
  
  const { user: currentUser } = useAuth();

  // Create User State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserDivision, setNewUserDivision] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMsg, setUserMsg] = useState({ text: '', type: '' });

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_URL}/users`),
        fetch(`${API_URL}/roles`)
      ]);
      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRoles = async (userId: number, roleIds: number[]) => {
    try {
      await fetch(`${API_URL}/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds })
      });
      fetchData();
    } catch (error) {
      console.error('Error updating user roles:', error);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the user ${userName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete user.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Network error while deleting user.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserRole) return;
    
    setCreatingUser(true);
    setUserMsg({ text: 'Creating user & sending email...', type: 'info' });
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          roleIds: [Number(newUserRole)],
          division: newUserDivision
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setUserMsg({ text: `Successfully created ${newUserName} and sent login email!`, type: 'success' });
        setNewUserName('');
        setNewUserEmail('');
        setNewUserRole('');
        setNewUserDivision('');
        fetchData();
      } else {
        setUserMsg({ text: data.error || 'Failed to create user', type: 'error' });
      }
    } catch (error) {
      setUserMsg({ text: 'Network error creating user', type: 'error' });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, permissions: {} })
      });
      setNewRoleName('');
      fetchData();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleTogglePermission = async (roleId: number, permKey: string, currentValue: boolean) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const updatedPermissions = { ...role.permissions, [permKey]: !currentValue };
    
    // Optimistic update locally
    setRoles(roles.map(r => r.id === roleId ? { ...r, permissions: updatedPermissions } : r));

    try {
      await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updatedPermissions })
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      fetchData(); // Revert on failure
    }
  };

  const availablePermissions = [
    { key: 'admin_panel', label: 'Admin Control Panel' },
    { key: 'pmbdd', label: 'Project Management (PMBDD)' },
    { key: 'cpsd', label: 'Construction QA/QC (CPSD)' },
    { key: 'ped', label: 'Engineering Design (PED)' },
    { key: 'pdmd', label: 'Project Delivery (PDMD)' },
    { key: 'hrad', label: 'Human Resources (HRAD)' },
    { key: 'fd', label: 'Finance & Accounts (FD)' },
    { key: 'cvs', label: 'CVs Module Access' },
    { key: 'wiki_view', label: 'Wiki Module - View Pages' },
    { key: 'wiki_draft', label: 'Wiki Module - Draft Pages' },
    { key: 'wiki_review', label: 'Wiki Module - Review Pages' },
    { key: 'wiki_approve', label: 'Wiki Module - Approve Pages' }
  ];

  return (
    <div className="responsive-container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Shield size={32} color="#0f172a" />
        <h1 style={{ fontSize: '2rem', color: '#0f172a', margin: 0 }}>System Administration</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '1rem 2rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'users' ? '#dc2626' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} /> User Assignments
        </button>
        <button
          onClick={() => setActiveTab('user_config')}
          style={{
            padding: '1rem 2rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'user_config' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'user_config' ? '#dc2626' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Shield size={18} /> User Configuration
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '1rem 2rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'roles' ? '#dc2626' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Shield size={18} /> Role Configuration
        </button>
      </div>

      {loading ? (
        <p>Loading administration data...</p>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={20} color="#dc2626" /> Register New Staff Member
                </h2>
                <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' }}>Full Name</label>
                    <input type="text" required className="form-input" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' }}>Email Address</label>
                    <input type="email" required className="form-input" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="jane.doe@promeconsult.com" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' }}>Initial Role</label>
                    <select required className="form-input" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                      <option value="" disabled>Select Role...</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' }}>Division (Optional)</label>
                    <select className="form-input" value={newUserDivision} onChange={e => setNewUserDivision(e.target.value)}>
                      <option value="">None</option>
                      <option value="PMBDD">PMBDD</option>
                      <option value="CPSD">CPSD</option>
                      <option value="PED">PED</option>
                      <option value="PDMD">PDMD</option>
                      <option value="HRAD">HRAD</option>
                      <option value="FD">FD</option>
                    </select>
                  </div>
                  <div>
                    <button type="submit" disabled={creatingUser} className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                      {creatingUser ? 'Creating...' : 'Create & Notify User'}
                    </button>
                  </div>
                </form>
                {userMsg.text && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', backgroundColor: userMsg.type === 'error' ? '#fee2e2' : userMsg.type === 'success' ? '#dcfce3' : '#e0f2fe', color: userMsg.type === 'error' ? '#991b1b' : userMsg.type === 'success' ? '#166534' : '#075985', fontSize: '0.875rem' }}>
                    {userMsg.text}
                  </div>
                )}
              </div>

              <div className="card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a' }}>Staff Directory & Roles</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Name / Email</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Division</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Assigned Role</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '1rem 0.5rem' }}>No users found.</td></tr>
                  ) : users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{user.name || 'Unknown User'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>{user.division || '-'}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {user.roles && user.roles.length > 0 ? user.roles.map(r => (
                            <span key={r.id} style={{ background: '#334155', color: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{r.name}</span>
                          )) : <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>None</span>}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={currentUser?.id === user.id}
                          title={currentUser?.id === user.id ? "You cannot delete your own account" : "Delete User"}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: currentUser?.id === user.id ? '#cbd5e1' : '#ef4444',
                            cursor: currentUser?.id === user.id ? 'not-allowed' : 'pointer',
                            padding: '0.5rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                          }}
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeTab === 'user_config' && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a' }}>Assign Multiple Roles to Users</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>User</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Roles Configuration</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '1rem 0.5rem' }}>No users found.</td></tr>
                  ) : users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 0.5rem', verticalAlign: 'top', width: '250px' }}>
                        <div style={{ fontWeight: 600 }}>{user.name || 'Unknown User'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {roles.map(role => {
                            const hasRole = user.roles?.some(r => r.id === role.id);
                            return (
                              <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer', background: hasRole ? '#eff6ff' : '#f8fafc', border: hasRole ? '1px solid #bfdbfe' : '1px solid #e2e8f0', padding: '0.4rem 0.6rem', borderRadius: '4px', userSelect: 'none' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasRole}
                                  onChange={(e) => {
                                    let newRoleIds = user.roles ? user.roles.map(r => r.id) : [];
                                    if (e.target.checked) {
                                      if (!newRoleIds.includes(role.id)) newRoleIds.push(role.id);
                                    } else {
                                      newRoleIds = newRoleIds.filter(id => id !== role.id);
                                    }
                                    handleUpdateUserRoles(user.id, newRoleIds);
                                  }}
                                  style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                                />
                                {role.name}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="New Role Name (e.g., HR Assistant)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1rem'
                  }}
                />
                <button
                  onClick={handleCreateRole}
                  style={{
                    background: '#0f172a',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Plus size={18} /> Create Role
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {roles.map(role => (
                  <div key={role.id} className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {role.name}
                      {role.name === 'Administrator' && (
                        <span title="Super Admin Role" style={{ display: 'flex' }}>
                          <AlertCircle size={18} color="#dc2626" />
                        </span>
                      )}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {availablePermissions.map(perm => {
                        const isGranted = !!role.permissions?.[perm.key];
                        const disabled = role.name === 'Administrator'; // Prevent locking out admin
                        return (
                          <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
                            <input
                              type="checkbox"
                              checked={disabled ? true : isGranted}
                              disabled={disabled}
                              onChange={() => handleTogglePermission(role.id, perm.key, isGranted)}
                              style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
                            />
                            <span>{perm.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
