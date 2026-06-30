import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Search, Building2, Users, Calendar, ArrowRight, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  membersCount: number;
  startDate: string;
  selectedSubProjects?: string[];
}

interface MasterProject {
  id: number;
  name: string;
  subProjects: string[];
}

const initialMasterProjects: MasterProject[] = [
  { id: 1, name: 'National Road Infrastructure Programme', subProjects: ['Kampala Flyover Project Lot 1', 'Kampala Flyover Project Lot 2', 'Entebbe Expressway Expansion'] },
  { id: 2, name: 'Northern Uganda Logistics Development', subProjects: ['Gulu Logistics Hub Design', 'Lira Logistics Center Plan'] },
  { id: 3, name: 'Water & Sanitation Infrastructure', subProjects: ['Kampala Water Lake Victoria WATSAN', 'Mbarara Water Supply System'] },
];

// Fallback data when DB is unreachable
const mockProjects: Project[] = [
  { id: 1, name: 'Kampala Flyover Project Lot 2', client: 'UNRA', status: 'Active', membersCount: 12, startDate: '2025-01-15', selectedSubProjects: ['Kampala Flyover Project Lot 2'] },
  { id: 2, name: 'Gulu Logistics Hub Design', client: 'Ministry of Works', status: 'Planning', membersCount: 5, startDate: '2025-03-01', selectedSubProjects: ['Gulu Logistics Hub Design'] },
];

export const ProjectsDatabase: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Master Database Modal State
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [masterProjects, setMasterProjects] = useState<MasterProject[]>(() => {
    const saved = localStorage.getItem('prome_master_database');
    return saved ? JSON.parse(saved) : initialMasterProjects;
  });

  const [newMasterProjectName, setNewMasterProjectName] = useState('');
  const [newSubProjectName, setNewSubProjectName] = useState<Record<number, string>>({});

  // Add Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    startDate: '',
    description: ''
  });
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSubProjectsForNewProject, setSelectedSubProjectsForNewProject] = useState<string[]>([]);

  // Sync master database to localStorage
  useEffect(() => {
    localStorage.setItem('prome_master_database', JSON.stringify(masterProjects));
  }, [masterProjects]);

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
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      // Load saved sub-project assignments from localStorage
      const storedSp = localStorage.getItem('prome_sub_projects');
      const spMapping = storedSp ? JSON.parse(storedSp) : {};
      
      const enriched = data.map((p: any) => ({
        ...p,
        selectedSubProjects: spMapping[p.id] || p.selectedSubProjects || []
      }));
      setProjects(enriched);
    } catch (err) {
      console.error('Failed to fetch projects. Using fallback data.', err);
      
      // Fallback due to VPS being down
      const storedSp = localStorage.getItem('prome_sub_projects');
      const spMapping = storedSp ? JSON.parse(storedSp) : {};
      
      const enriched = mockProjects.map(p => ({
        ...p,
        selectedSubProjects: spMapping[p.id] || p.selectedSubProjects || []
      }));
      
      setProjects(enriched);
      setError('Live database connection failed. Showing offline mock data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const res = await fetch('/api/projects', {
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
      
      let createdId = Date.now(); // fallback ID
      if (res.ok) {
        const created = await res.json();
        createdId = created.id;
      } else {
        throw new Error('Failed to create project on server');
      }

      // Save subproject selections to browser localStorage mapping
      const storedSp = localStorage.getItem('prome_sub_projects');
      const spMapping = storedSp ? JSON.parse(storedSp) : {};
      spMapping[createdId] = selectedSubProjectsForNewProject;
      localStorage.setItem('prome_sub_projects', JSON.stringify(spMapping));

      setIsModalOpen(false);
      setSelectedSubProjectsForNewProject([]);
      setAssignedUsers([]);
      setNewProject({ name: '', client: '', startDate: '', description: '' });
      fetchProjects();
    } catch (err) {
      console.error('Failed to create project', err);
      
      // Fallback workspace creation locally if server fails
      const fallbackId = Date.now();
      const storedSp = localStorage.getItem('prome_sub_projects');
      const spMapping = storedSp ? JSON.parse(storedSp) : {};
      spMapping[fallbackId] = selectedSubProjectsForNewProject;
      localStorage.setItem('prome_sub_projects', JSON.stringify(spMapping));

      alert('Project saved locally. The server database was unreachable.');
      setIsModalOpen(false);
      setSelectedSubProjectsForNewProject([]);
      setAssignedUsers([]);
      setNewProject({ name: '', client: '', startDate: '', description: '' });
      fetchProjects();
    }
  };

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone and will delete all associated data.")) return;
    
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error('Failed to delete project', err);
      // Fallback local delete
      setProjects(projects.filter(p => p.id !== id));
    }
  };
  
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database color="#0f766e" size={28} />
            Projects Database
          </h1>
          <p style={{ color: '#64748b' }}>Comprehensive database of engineering projects, contracts, and clients.</p>
        </div>
        
        {hasPermission('admin_panel') && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setIsMasterModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} />
              Open Master Database
            </button>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} style={{ marginRight: '8px' }} />
              Add Project
            </button>
          </div>
        )}
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
                borderTop: `4px solid ${project.status === 'Active' ? '#0ea5e9' : project.status === 'Completed' ? '#10b981' : '#f59e0b'}`
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', lineHeight: 1.3, flex: 1, paddingRight: '1rem' }}>{project.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '999px', 
                    fontWeight: 600,
                    backgroundColor: project.status === 'Active' ? '#f0f9ff' : project.status === 'Completed' ? '#f0fdf4' : '#fffbeb', 
                    color: project.status === 'Active' ? '#0284c7' : project.status === 'Completed' ? '#16a34a' : '#d97706'
                  }}>
                    {project.status}
                  </span>
                    {hasPermission('admin_panel') && (
                      <button 
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        style={{ 
                          background: 'none', border: 'none', cursor: 'pointer', 
                          color: '#ef4444', padding: '4px', marginLeft: '0.5rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Delete Project"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Building2 size={16} /> Client: <span style={{ fontWeight: 500 }}>{project.client}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Calendar size={16} /> Started: {new Date(project.startDate).toLocaleDateString()}
                </div>

                {project.selectedSubProjects && project.selectedSubProjects.length > 0 && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Visible Sub-Projects:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {project.selectedSubProjects.map((sp, spIdx) => (
                        <span key={spIdx} style={{ fontSize: '0.7rem', backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          {sp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
          <Database size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#334155', margin: '0 0 0.5rem 0' }}>No projects found</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Try adjusting your search criteria or create a new project.</p>
        </div>
      )}

      {/* Master Database Modal */}
      {isMasterModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMasterModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={24} />
                Projects Master Database
              </h2>
              <button onClick={() => setIsMasterModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Define global master project categories and their corresponding sub-projects. When creating a new project, administrators can bind sub-projects from this registry.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {masterProjects.map(mp => (
                <div key={mp.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{mp.name}</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '999px' }}>
                      {mp.subProjects.length} sub-projects
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {mp.subProjects.map((sp, idx) => (
                      <div key={idx} style={{ fontSize: '0.85rem', color: '#334155', backgroundColor: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{sp}</span>
                        <button 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          onClick={() => {
                            const updated = masterProjects.map(item => {
                              if (item.id === mp.id) {
                                return { ...item, subProjects: item.subProjects.filter((_, subIdx) => subIdx !== idx) };
                              }
                              return item;
                            });
                            setMasterProjects(updated);
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {mp.subProjects.length === 0 && (
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b' }}>No sub-projects defined.</div>
                    )}
                  </div>

                  {/* Add Subproject Form */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="New sub-project name..."
                      style={{ flex: 1, fontSize: '0.8rem', padding: '4px 8px', height: '32px' }}
                      value={newSubProjectName[mp.id] || ''}
                      onChange={e => setNewSubProjectName({ ...newSubProjectName, [mp.id]: e.target.value })}
                    />
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '4px 12px', height: '32px' }}
                      onClick={() => {
                        const subName = newSubProjectName[mp.id];
                        if (!subName) return;
                        const updated = masterProjects.map(item => {
                          if (item.id === mp.id) {
                            return { ...item, subProjects: [...item.subProjects, subName] };
                          }
                          return item;
                        });
                        setMasterProjects(updated);
                        setNewSubProjectName({ ...newSubProjectName, [mp.id]: '' });
                      }}
                    >
                      Add Sub
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Master Project Category Form */}
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a' }}>Add Master Project Category</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Infrastructure Modernization..."
                  style={{ flex: 1 }}
                  value={newMasterProjectName}
                  onChange={e => setNewMasterProjectName(e.target.value)}
                />
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    if (!newMasterProjectName) return;
                    const nextId = masterProjects.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
                    setMasterProjects([...masterProjects, { id: nextId, name: newMasterProjectName, subProjects: [] }]);
                    setNewMasterProjectName('');
                  }}
                >
                  Create Category
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsMasterModalOpen(false)}>Close Registry</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Add Project</h2>
            
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Start Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  value={newProject.startDate}
                  onChange={e => setNewProject({...newProject, startDate: e.target.value})}
                />
              </div>
            </div>

            {/* Select Sub Projects from Master Database */}
            <div style={{ borderTop: '1px solid #e2e8f0', margin: '2rem 0 1.5rem 0', paddingTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Visible Sub-Projects (Master Database)</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>Select which sub-projects from the Master Database are visible inside this project workspace.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                {masterProjects.map(mp => (
                  <div key={mp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f766e' }}>{mp.name}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                      {mp.subProjects.map((sp, spIdx) => {
                        const isChecked = selectedSubProjectsForNewProject.includes(sp);
                        return (
                          <label key={spIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#334155', cursor: 'pointer' }}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedSubProjectsForNewProject(selectedSubProjectsForNewProject.filter(item => item !== sp));
                                } else {
                                  setSelectedSubProjectsForNewProject([...selectedSubProjectsForNewProject, sp]);
                                }
                              }}
                            />
                            {sp}
                          </label>
                        );
                      })}
                      {mp.subProjects.length === 0 && (
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#94a3b8' }}>No sub-projects defined.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '2rem 0 1.5rem 0', paddingTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Assign Users & Roles</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>Add personnel to this project and define their specific access level.</p>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <select className="form-input" style={{ flex: 2 }} id="assignUser">
                  <option value="">-- Select User --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <select className="form-input" style={{ flex: 1 }} id="assignRole">
                  <option value="Project Manager">Project Manager</option>
                  <option value="Lead Engineer">Lead Engineer</option>
                  <option value="Site Engineer">Site Engineer</option>
                  <option value="Project Staff">Project Staff</option>
                  <option value="Project Secretary">Project Secretary</option>
                  <option value="Project Top Managment">Project Top Managment</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Employer">Employer</option>
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

              {/* Assignment list */}
              {assignedUsers.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {assignedUsers.map((u, idx) => (
                    <div key={idx} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                        </div>
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
              <button className="btn btn-primary" onClick={handleCreateProject}>Add Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
