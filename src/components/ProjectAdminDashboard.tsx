import React, { useState, useEffect } from 'react';
import { Shield, Plus, Save, UserPlus, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

interface ProjectAdminDashboardProps {
  project: any;
  onAssignUser: (userId: string, role: string) => void;
  onRemoveUser?: (userId: string) => void;
  onUpdatePermissions: (updates: { userId: string; module: string; accessLevel: string }[]) => void;
}

export const ProjectAdminDashboard: React.FC<ProjectAdminDashboardProps> = ({ project, onAssignUser, onRemoveUser, onUpdatePermissions }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('Project Staff');
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Local state for permissions matrix
  const [permissions, setPermissions] = useState<any[]>(project?.userPermissions || []);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPermissions(project?.userPermissions || []);
  }, [project]);

  useEffect(() => {
    fetchSystemUsers();
  }, []);

  const fetchSystemUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch system users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const availableRoles = [
    'Project Manager', 'Lead Engineer', 'Site Engineer', 
    'Project Staff', 'Project Secretary', 'Project Top Managment', 
    'Contractor', 'Employer', 'Viewer'
  ];

  const modules = [
    'Dashboard', 'Tasks', 'Schedule', 'Documents', 'Procurement', 
    'Daily Reports', 'Variations', 'Subcontractors', 'Punch List', 
    'Correspondence', 'Equipment Logs', 'HSE', 'Quality', 'Risk Register', 
    'Team', 'Financials'
  ];

  const handleAssignUser = () => {
    if (selectedUser && selectedRole) {
      onAssignUser(selectedUser, selectedRole);
      setSelectedUser('');
    }
  };

  const handlePermissionChange = (userId: string, mod: string, accessLevel: string) => {
    const existingIndex = permissions.findIndex(p => p.userId.toString() === userId.toString() && p.module === mod);
    let newPerms = [...permissions];
    if (existingIndex >= 0) {
      newPerms[existingIndex] = { ...newPerms[existingIndex], accessLevel };
    } else {
      newPerms.push({ userId, module: mod, accessLevel });
    }
    setPermissions(newPerms);
    setHasChanges(true);
  };

  const savePermissions = () => {
    onUpdatePermissions(permissions);
    setHasChanges(false);
  };

  const getPermission = (userId: string, mod: string) => {
    return permissions.find(p => p.userId.toString() === userId.toString() && p.module === mod)?.accessLevel || 'None';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Assign Users Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', color: '#1e293b' }}>
          <UserPlus size={20} color="#0284c7" /> Assign Project Members
        </h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <select className="form-input" style={{ flex: 1 }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="">{loadingUsers ? 'Loading Users...' : '-- Select System User --'}</option>
            {systemUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name || u.email} ({u.email}){u.division ? ` - ${u.division}` : ''}
              </option>
            ))}
          </select>
          
          <select className="form-input" style={{ flex: 1 }} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          
          <button className="btn btn-primary" onClick={handleAssignUser} disabled={!selectedUser}>
            <Plus size={16} style={{ marginRight: '0.5rem' }}/> Assign
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '0.75rem 0' }}>User</th>
              <th style={{ padding: '0.75rem 0' }}>Assigned Role</th>
              <th style={{ padding: '0.75rem 0', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {project?.members?.map((m: any) => {
              const uId = (m.userId || m.user?.id || m.id).toString();
              const uName = m.user?.name || m.name || systemUsers.find(u => u.id.toString() === uId)?.name || 'Unknown User';
              const uEmail = m.user?.email || systemUsers.find(u => u.id.toString() === uId)?.email;

              return (
                <tr key={m.id || m.userId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>
                    <div style={{ color: '#0f172a' }}>{uName}</div>
                    {uEmail && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{uEmail}</div>}
                  </td>
                  <td style={{ padding: '0.75rem 0' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '999px' }}>
                      {m.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0' }}>
                    {onRemoveUser && (
                      <button 
                        onClick={() => onRemoveUser(uId)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!project?.members || project.members.length === 0) && (
              <tr>
                <td colSpan={3} style={{ padding: '1rem 0', textAlign: 'center', color: '#94a3b8' }}>No members assigned to this project yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Permissions Matrix Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', color: '#1e293b' }}>
            <Shield size={20} color="#10b981" /> User Permissions Matrix
          </h3>
          <button 
            className={`btn ${hasChanges ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={savePermissions}
            disabled={!hasChanges}
          >
            {hasChanges ? <Save size={16} style={{ marginRight: '0.5rem' }}/> : <CheckCircle size={16} style={{ marginRight: '0.5rem' }}/>}
            {hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '8px' }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: '0.875rem' }}>Changes to this matrix immediately affect module access for all project members. System Administrators automatically bypass these rules.</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '1rem', textAlign: 'left', minWidth: '150px' }}>Module</th>
              {(project?.members || []).map((m: any) => {
                const uId = (m.userId || m.user?.id || m.id).toString();
                const uName = m.user?.name || m.name || systemUsers.find(u => u.id.toString() === uId)?.name || 'Member';
                return (
                  <th key={uId} style={{ padding: '1rem', textAlign: 'center', minWidth: '110px', fontWeight: 600 }}>
                    {uName} <br/>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8' }}>{m.role}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <tr key={mod} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#334155' }}>{mod}</td>
                {(project?.members || []).map((m: any) => {
                  const targetUserId = (m.userId || m.user?.id || m.id).toString();
                  const val = getPermission(targetUserId, mod);
                  let bgColor = '#ffffff';
                  if (val === 'Edit') bgColor = '#dcfce7';
                  if (val === 'Read') bgColor = '#e0f2fe';
                  if (val === 'None') bgColor = '#fee2e2';

                  return (
                    <td key={targetUserId} style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <select 
                        value={val}
                        onChange={(e) => handlePermissionChange(targetUserId, mod, e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.35rem', 
                          borderRadius: '6px', 
                          border: '1px solid #cbd5e1',
                          backgroundColor: bgColor,
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="None">None</option>
                        <option value="Read">Read</option>
                        <option value="Edit">Edit</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
