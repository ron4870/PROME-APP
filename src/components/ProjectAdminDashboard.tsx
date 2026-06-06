import React, { useState } from 'react';
import { Shield, Plus, Save, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProjectAdminDashboardProps {
  project: any;
  onAssignUser: (userId: string, role: string) => void;
  onUpdatePermissions: (updates: { userId: string; module: string; accessLevel: string }[]) => void;
}

export const ProjectAdminDashboard: React.FC<ProjectAdminDashboardProps> = ({ project, onAssignUser, onUpdatePermissions }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('Project Staff');
  
  // Local state for permissions matrix
  const [permissions, setPermissions] = useState<any[]>(project?.userPermissions || []);
  const [hasChanges, setHasChanges] = useState(false);

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

  // System Users Mock
  const systemUsers = [
    { id: '1', name: 'Alice Engineer', email: 'alice@prome.com' },
    { id: '2', name: 'Bob Technician', email: 'bob@prome.com' },
    { id: '3', name: 'Charlie Admin', email: 'charlie@prome.com' },
    { id: '4', name: 'Diana Manager', email: 'diana@prome.com' }
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
            <option value="">-- Select System User --</option>
            {systemUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
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
            {project?.members?.map((m: any) => (
              <tr key={m.id || m.userId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{m.user?.name || m.name}</td>
                <td style={{ padding: '0.75rem 0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '999px' }}>
                    {m.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0' }}>
                  <button style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Remove</button>
                </td>
              </tr>
            ))}
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
              {(project?.members || []).map((m: any) => (
                <th key={m.userId} style={{ padding: '1rem', textAlign: 'center', minWidth: '110px', fontWeight: 600 }}>
                  {m.user?.name || m.name} <br/>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8' }}>{m.role}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <tr key={mod} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#334155' }}>{mod}</td>
                {(project?.members || []).map((m: any) => {
                  const val = getPermission(m.userId || m.user?.id, mod);
                  let bgColor = '#ffffff';
                  if (val === 'Edit') bgColor = '#dcfce7';
                  if (val === 'Read') bgColor = '#e0f2fe';
                  if (val === 'None') bgColor = '#fee2e2';

                  return (
                    <td key={m.userId} style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <select 
                        value={val}
                        onChange={(e) => handlePermissionChange(m.userId || m.user?.id, mod, e.target.value)}
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
