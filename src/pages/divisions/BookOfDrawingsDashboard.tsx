import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, Building2, Users, Calendar, ArrowRight, X, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Project {
  id: number;
  name: string;
  client: string;
  isTemplate: boolean;
  membersCount: number;
  createdAt: string;
}

export default function BookOfDrawingsDashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const isAdminOrMD = user?.role?.name === 'Administrator' || user?.role?.name === 'Managing Director';
  const canCreateProjects = isAdminOrMD || user?.role?.name === 'Head of Division';
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    description: ''
  });
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/book-of-drawings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects.', err);
      setError('Live database connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const res = await fetch('/api/book-of-drawings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...newProject,
          members: assignedUsers
        })
      });
      if (!res.ok) throw new Error('Failed to create project');
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      console.error('Failed to create project', err);
      alert('Failed to create project. The database might be unreachable.');
      setIsModalOpen(false);
    }
  };
  
  const filteredProjects = projects.filter(p => 
    !p.isTemplate && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.client.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const templateProject = projects.find(p => p.isTemplate);

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem', maxWidth: '100%' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen color="#0f766e" size={28} />
            Book of Drawings
          </h1>
          <p style={{ color: '#64748b' }}>Manage and compile standardized Book of Drawings projects.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {templateProject && isAdminOrMD && (
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate(`/book-of-drawings/${templateProject.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Edit size={18} />
              Edit Template Project
            </button>
          )}
          {canCreateProjects && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} style={{ marginRight: '8px' }} />
              Create Project
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fff7ed', color: '#c2410c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fdba74' }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="search-bar" style={{ maxWidth: '400px', flex: 1 }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search projects by name or client..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading projects...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                borderTop: `4px solid #0ea5e9`
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              onClick={() => navigate(`/book-of-drawings/${project.id}`)}
            >
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', lineHeight: 1.3, flex: 1, paddingRight: '1rem' }}>{project.name}</h3>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Building2 size={16} /> Client: <span style={{ fontWeight: 500 }}>{project.client}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Calendar size={16} /> Created: {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                  <Users size={16} /> {project.membersCount} members
                </div>
                <div style={{ color: '#0f766e', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
                  Enter Workspace <ArrowRight size={16} style={{ marginLeft: '4px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <BookOpen size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#334155', margin: '0 0 0.5rem 0' }}>No projects found</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Try adjusting your search criteria or create a new project.</p>
        </div>
      )}

      {/* Admin Create Project Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Create New Book of Drawings</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>This will create a new project by copying all pages and layouts from the Template Project.</p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Project Name</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%' }} 
                placeholder="e.g., Kampala Flyover Lot 2" 
                value={newProject.name}
                onChange={e => setNewProject({...newProject, name: e.target.value})}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Client</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%' }} 
                placeholder="e.g., UNRA" 
                value={newProject.client}
                onChange={e => setNewProject({...newProject, client: e.target.value})}
              />
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '2rem 0 1.5rem 0', paddingTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Assign Users & Roles</h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <select className="form-input" style={{ flex: 2 }} id="assignUser">
                  <option value="">-- Select User --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <select className="form-input" style={{ flex: 1 }} id="assignRole">
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    const userId = (document.getElementById('assignUser') as HTMLSelectElement).value;
                    const role = (document.getElementById('assignRole') as HTMLSelectElement).value;
                    if(userId && role) {
                      const userObj = users.find(u => u.id.toString() === userId);
                      setAssignedUsers([...assignedUsers, { userId, role, name: userObj?.name || 'Unknown' }]);
                    }
                  }}
                >
                  Add
                </button>
              </div>

              {assignedUsers.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {assignedUsers.map((u, idx) => (
                    <div key={idx} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, padding: '0.2rem 0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px' }}>{u.role}</span>
                        <button 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          onClick={() => setAssignedUsers(assignedUsers.filter((_, i) => i !== idx))}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateProject}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
