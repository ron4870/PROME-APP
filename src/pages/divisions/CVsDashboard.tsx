import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Search, User, Users, Calendar, ArrowRight, X, Edit, 
  Sparkles, ExternalLink, FileText, Eye, Filter, Folder, 
  CheckCircle2, RefreshCw, Bot, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CvProject {
  id: number;
  name: string;
  client: string; // Candidate Name
  description?: string | null;
  isTemplate: boolean;
  membersCount: number;
  createdAt: string;
  category?: {
    id: number;
    name: string;
  } | null;
}

interface CatalogueItem {
  id: string;
  fileName: string;
  candidateName: string;
  category: string;
  fileType: string;
  fileSize?: string;
  date?: string;
  driveUrl: string;
  downloadUrl?: string;
}

interface CandidateSummary {
  name: string;
  count: number;
  categories: string[];
  files: any[];
}

const GOOGLE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/11XG-K2r3Y_xyQkmPbbSj5an7vIBYYbpX?usp=sharing";

export default function CVsDashboard() {
  const navigate = useNavigate();
  const { user, token, hasPermission } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'profiles' | 'catalogue'>('profiles');

  // Profiles State
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<CvProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Catalogue State
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState('All');
  const [catalogueTypeFilter, setCatalogueTypeFilter] = useState('All');
  const [cataloguePage, setCataloguePage] = useState(1);
  const [catalogueTotal, setCatalogueTotal] = useState(0);
  const [catalogueTotalPages, setCatalogueTotalPages] = useState(1);
  const [catalogueCategories, setCatalogueCategories] = useState<string[]>([]);
  const [candidatesList, setCandidatesList] = useState<CandidateSummary[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ai' | 'manual'>('ai');
  
  // Manual project form
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    description: '',
    categoryId: ''
  });
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // AI Generation Form
  const [aiCandidateName, setAiCandidateName] = useState('');
  const [aiCategoryName, setAiCategoryName] = useState('');
  const [aiCategoryId, setAiCategoryId] = useState('');
  const [aiProfileTitle, setAiProfileTitle] = useState('');
  const [aiJobTitle, setAiJobTitle] = useState('');
  const [aiTargetJob, setAiTargetJob] = useState('');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiFormatType, setAiFormatType] = useState('UNRA Standard Format');
  const [formatFile, setFormatFile] = useState<File | null>(null);
  const [candidateCvDetails, setCandidateCvDetails] = useState<any[]>([]);
  
  // AI Generation Progress & Results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState('');
  const [generationSuccessModal, setGenerationSuccessModal] = useState<any | null>(null);

  useEffect(() => {
    if (!hasPermission('cvs')) return;
    fetchProjects();
    fetchUsers();
    fetchCategories();
    fetchCatalogue();
    fetchCandidates();
  }, [hasPermission]);

  useEffect(() => {
    if (activeTab === 'catalogue') {
      fetchCatalogue();
    }
  }, [activeTab, cataloguePage, catalogueCategoryFilter, catalogueTypeFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/cvs/categories/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch CV categories', err);
    }
  };

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
      const res = await fetch('/api/cvs', {
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

  const fetchCatalogue = async () => {
    try {
      setCatalogueLoading(true);
      const params = new URLSearchParams();
      if (catalogueSearch) params.append('search', catalogueSearch);
      if (catalogueCategoryFilter !== 'All') params.append('category', catalogueCategoryFilter);
      if (catalogueTypeFilter !== 'All') params.append('fileType', catalogueTypeFilter);
      params.append('page', cataloguePage.toString());
      params.append('limit', '25');

      const res = await fetch(`/api/cvs/catalogue?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogueItems(data.items || []);
        setCatalogueTotal(data.total || 0);
        setCatalogueTotalPages(data.totalPages || 1);
        if (data.categories && data.categories.length > 0) {
          setCatalogueCategories(data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to fetch CV catalogue', err);
    } finally {
      setCatalogueLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/cvs/candidates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidatesList(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    }
  };

  const handleCandidateSelect = async (candidateName: string) => {
    setAiCandidateName(candidateName);
    if (!candidateName) {
      setCandidateCvDetails([]);
      return;
    }
    const found = candidatesList.find(c => c.name.toLowerCase() === candidateName.toLowerCase());
    if (found) {
      setCandidateCvDetails(found.files || []);
      if (found.categories && found.categories.length > 0 && !aiCategoryName) {
        setAiCategoryName(found.categories[0]);
        const matchCat = categories.find(c => c.name.toLowerCase() === found.categories[0].toLowerCase());
        if (matchCat) setAiCategoryId(matchCat.id.toString());
      }
      if (!aiProfileTitle) {
        setAiProfileTitle(`${found.name} - Tailored Bidding CV`);
      }
    } else {
      try {
        const res = await fetch(`/api/cvs/candidate-cvs/${encodeURIComponent(candidateName)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const files = await res.json();
          setCandidateCvDetails(files);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openAiModalForCandidate = (candName: string, category: string) => {
    setModalMode('ai');
    setIsModalOpen(true);
    handleCandidateSelect(candName);
    setAiCategoryName(category);
    setAiProfileTitle(`${candName} - Tailored Bidding CV`);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/cvs/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories([...categories, newCat]);
        setNewCategoryName('');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to add category');
      }
    } catch (err) {
      console.error('Error adding category', err);
    }
  };

  const handleCreateProject = async () => {
    try {
      const res = await fetch('/api/cvs', {
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
      if (!res.ok) throw new Error('Failed to create CV project');
      setIsModalOpen(false);
      setNewProject({ name: '', client: '', description: '', categoryId: '' });
      setAssignedUsers([]);
      fetchProjects();
    } catch (err) {
      console.error('Failed to create CV project', err);
      alert('Failed to create CV project. The database might be unreachable.');
      setIsModalOpen(false);
    }
  };

  const handleGenerateCustomCv = async () => {
    if (!aiCandidateName.trim()) {
      alert('Please select or enter a Candidate Name');
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratingStep('1/4: Analyzing candidate profile and existing repository CVs...');

      const formData = new FormData();
      formData.append('candidateName', aiCandidateName);
      formData.append('categoryName', aiCategoryName || 'General Engineering');
      if (aiCategoryId) formData.append('categoryId', aiCategoryId);
      formData.append('profileTitle', aiProfileTitle || `${aiCandidateName} - Custom CV`);
      formData.append('jobTitle', aiJobTitle || 'Consultant / Engineer');
      formData.append('targetJob', aiTargetJob || 'General engineering assignment requirements');
      formData.append('customInstructions', aiCustomInstructions);
      formData.append('formatType', aiFormatType);
      if (formatFile) {
        formData.append('formatFile', formatFile);
      }

      setTimeout(() => {
        setGeneratingStep('2/4: Aligning candidate qualifications with target bidding criteria...');
      }, 3000);

      setTimeout(() => {
        setGeneratingStep('3/4: Structuring sections according to requested procurement format with Gemini AI...');
      }, 7000);

      const res = await fetch('/api/cvs/generate-custom', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to generate custom CV');
      }

      const data = await res.json();
      setGeneratingStep('4/4: Finalizing CV workspace and book sections...');
      
      setIsModalOpen(false);
      setGenerationSuccessModal(data);
      fetchProjects();
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      alert(`AI Generation Error: ${err.message || 'Could not complete generation.'}`);
    } finally {
      setIsGenerating(false);
      setGeneratingStep('');
    }
  };

  if (!hasPermission('cvs')) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>You do not have permission to access the CVs module. Please contact your administrator.</p>
      </div>
    );
  }

  const isAdmin = user?.roles?.some(r => r.name === 'Administrator');
  const isAdminOrMD = user?.roles?.some(r => ['Administrator', 'Managing Director'].includes(r.name));
  const canCreateCVs = isAdminOrMD || user?.roles?.some(r => r.name === 'Head of Division');

  const filteredProjects = projects.filter(p => {
    if (p.isTemplate) return false;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'All' || 
                            p.category?.name === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const templateProject = projects.find(p => p.isTemplate);

  return (
    <div className="layout-container" style={{ padding: '2rem 1.5rem', maxWidth: '100%', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ backgroundColor: '#0f766e', color: 'white', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} />
            </div>
            <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
              Company CVs & Profiles
            </h1>
          </div>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
            Access the master Google Drive repository, catalogue candidate credentials, and use Gemini AI to generate custom formatted bidding CVs.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a 
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: '#ffffff', 
              color: '#0f766e', 
              border: '1px solid #cbd5e1',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Folder size={18} color="#0f766e" />
            Open Drive Repository
            <ExternalLink size={14} color="#64748b" />
          </a>

          {templateProject && isAdminOrMD && (
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate(`/cvs/${templateProject.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: 600 }}
            >
              <Edit size={16} />
              Edit Master Template
            </button>
          )}

          {canCreateCVs && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setModalMode('ai');
                setIsModalOpen(true);
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                backgroundColor: '#0f766e', 
                borderRadius: '8px',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)'
              }}
            >
              <Sparkles size={18} color="#fbbf24" />
              Create CV Profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('profiles')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 0.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'profiles' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'profiles' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          <BookOpen size={18} />
          CV Profiles ({filteredProjects.length})
        </button>

        <button
          onClick={() => setActiveTab('catalogue')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 0.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'catalogue' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'catalogue' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          <Folder size={18} />
          CVs Master Catalogue ({catalogueTotal > 0 ? catalogueTotal : '700+'} files)
          <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
            Google Drive
          </span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fff7ed', color: '#c2410c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fdba74' }}>
          {error}
        </div>
      )}

      {/* TAB 1: CV PROFILES */}
      {activeTab === 'profiles' && (
        <div>
          {/* Search & Category Filter */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="search-bar" style={{ minWidth: '320px', flex: 1 }}>
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search CV profiles by candidate name, tender, or title..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16} color="#64748b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Category:</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', minWidth: '160px' }}
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="New category..." 
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="form-input"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: '120px', height: '32px' }}
                    />
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', height: '32px', display: 'flex', alignItems: 'center' }}
                      onClick={handleAddCategory}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profiles Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: '#0f766e' }} />
              <div>Loading CV profiles...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderTop: `4px solid #0f766e`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                  onClick={() => navigate(`/cvs/${project.id}`)}
                >
                  <div style={{ padding: '1.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.3 }}>
                        {project.name}
                      </h3>
                    </div>
                    
                    {project.category && (
                      <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                        {project.category.name}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <User size={16} color="#0f766e" /> 
                      <span>Candidate: <strong>{project.client}</strong></span>
                    </div>

                    {project.description && (
                      <p style={{ 
                        color: '#64748b', 
                        fontSize: '0.825rem', 
                        margin: '0.5rem 0 1rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {project.description.replace(/^Format:.*?\n\n/s, '')}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                      <Calendar size={14} /> Created: {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ padding: '0.9rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
                      <Users size={15} /> {project.membersCount} collaborators
                    </div>
                    <div style={{ color: '#0f766e', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                      Open Workspace <ArrowRight size={15} style={{ marginLeft: '4px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredProjects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <BookOpen size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#334155', margin: '0 0 0.5rem 0' }}>No CV profiles found</h3>
              <p style={{ color: '#64748b', margin: '0 0 1.5rem 0' }}>
                Browse the CVs Master Catalogue to create custom bidding CVs with AI.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setModalMode('ai');
                  setIsModalOpen(true);
                }}
                style={{ backgroundColor: '#0f766e' }}
              >
                <Sparkles size={16} style={{ marginRight: '6px' }} />
                Create New Profile with AI
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CVs MASTER CATALOGUE (GOOGLE DRIVE) */}
      {activeTab === 'catalogue' && (
        <div>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>Total Indexed Documents</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f766e' }}>{catalogueTotal || 702}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Synchronized with Google Drive</div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>Available Candidates</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' }}>{candidatesList.length || '500+'}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Distinct professionals & experts</div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>Engineering Disciplines</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#7c3aed' }}>{catalogueCategories.length || 35}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Highways, Structures, Pavements & more</div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>AI Custom CV Synthesizer</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={20} color="#d97706" /> Powered by Gemini
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>UNRA, World Bank, PPDA formats</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="search-bar" style={{ minWidth: '320px', flex: 2 }}>
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search catalogue by candidate name, filename, or keyword..." 
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchCatalogue(); }}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Filter size={15} color="#64748b" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Discipline:</span>
                  <select
                    value={catalogueCategoryFilter}
                    onChange={(e) => {
                      setCatalogueCategoryFilter(e.target.value);
                      setCataloguePage(1);
                    }}
                    className="form-input"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', minWidth: '180px' }}
                  >
                    <option value="All">All Disciplines ({catalogueCategories.length})</option>
                    {catalogueCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Type:</span>
                  <select
                    value={catalogueTypeFilter}
                    onChange={(e) => {
                      setCatalogueTypeFilter(e.target.value);
                      setCataloguePage(1);
                    }}
                    className="form-input"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    <option value="All">All Types</option>
                    <option value="PDF">PDF</option>
                    <option value="DOCX">Word (DOCX)</option>
                    <option value="DOC">Word (DOC)</option>
                  </select>
                </div>

                <button 
                  onClick={fetchCatalogue}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Search
                </button>
              </div>
            </div>
          </div>

          {/* Catalogue Table */}
          {catalogueLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: '#0f766e' }} />
              <div>Loading repository catalogue from Google Drive...</div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Candidate</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Document File Name</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Discipline / Folder</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Type</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Size</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogueItems.map((item) => (
                      <tr 
                        key={item.id} 
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                              {item.candidateName ? item.candidateName.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <span>{item.candidateName}</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: '#334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={16} color={item.fileType === 'PDF' ? '#ef4444' : '#2563eb'} />
                            <span style={{ wordBreak: 'break-word', maxWidth: '300px' }}>{item.fileName}</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem', 
                            backgroundColor: '#f1f5f9', 
                            color: '#475569', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600 
                          }}>
                            {item.category}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            backgroundColor: item.fileType === 'PDF' ? '#fee2e2' : '#dbeafe',
                            color: item.fileType === 'PDF' ? '#b91c1c' : '#1d4ed8'
                          }}>
                            {item.fileType}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                          {item.fileSize || '—'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <a
                              href={item.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on Google Drive"
                              style={{ 
                                padding: '0.4rem 0.6rem', 
                                backgroundColor: '#f1f5f9', 
                                color: '#475569', 
                                borderRadius: '6px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}
                            >
                              <Eye size={14} /> View
                            </a>

                            <button
                              onClick={() => openAiModalForCandidate(item.candidateName, item.category)}
                              title="Create Custom Bidding CV with AI"
                              style={{ 
                                padding: '0.4rem 0.75rem', 
                                backgroundColor: '#0f766e', 
                                color: 'white', 
                                borderRadius: '6px', 
                                border: 'none', 
                                cursor: 'pointer', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)'
                              }}
                            >
                              <Sparkles size={14} color="#fbbf24" /> Create with AI
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing page <strong>{cataloguePage}</strong> of <strong>{catalogueTotalPages}</strong> ({catalogueTotal} total documents)
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={cataloguePage <= 1}
                    onClick={() => setCataloguePage(p => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <button
                    disabled={cataloguePage >= catalogueTotalPages}
                    onClick={() => setCataloguePage(p => Math.min(catalogueTotalPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE CV MODAL WITH AI GENERATOR */}
      {isModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => { if (!isGenerating) setIsModalOpen(false); }} 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '14px', width: '92%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
          >
            {/* Modal Header & Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={22} color="#0f766e" /> Create CV Profile
                </h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                  Generate a tailored CV for a specific bid using Gemini AI or create manually.
                </p>
              </div>

              {!isGenerating && (
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Mode Selector */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setModalMode('ai')}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: modalMode === 'ai' ? '#ffffff' : 'transparent',
                  color: modalMode === 'ai' ? '#0f766e' : '#64748b',
                  boxShadow: modalMode === 'ai' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Sparkles size={16} color={modalMode === 'ai' ? '#0f766e' : '#64748b'} />
                AI Custom CV Generator (from Catalogue)
              </button>

              <button
                type="button"
                onClick={() => setModalMode('manual')}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: modalMode === 'manual' ? '#ffffff' : 'transparent',
                  color: modalMode === 'manual' ? '#0f766e' : '#64748b',
                  boxShadow: modalMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <BookOpen size={16} />
                Standard / Manual Template
              </button>
            </div>

            {/* AI GENERATOR FORM */}
            {modalMode === 'ai' && (
              <div>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bot size={22} color="#16a34a" />
                  <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                    <strong>Intelligent Bidding Tailoring:</strong> The AI pulls the candidate's existing catalogued CV versions from Google Drive, maps their project achievements against your tender specifications, and outputs the exact required procurement format.
                  </div>
                </div>

                {/* Candidate Selection Dropdown */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    1. Select Candidate Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                    value={aiCandidateName}
                    onChange={(e) => handleCandidateSelect(e.target.value)}
                    disabled={isGenerating}
                  >
                    <option value="">-- Choose Candidate from Catalogue ({candidatesList.length} Available) --</option>
                    {candidatesList.map((cand) => (
                      <option key={cand.name} value={cand.name}>
                        {cand.name} ({cand.count} {cand.count === 1 ? 'CV' : 'CVs'} in catalogue)
                      </option>
                    ))}
                  </select>

                  {/* Candidate Catalogue Summary Card */}
                  {candidateCvDetails.length > 0 && (
                    <div style={{ marginTop: '0.6rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={14} color="#0f766e" /> {candidateCvDetails.length} source CVs detected for {aiCandidateName}:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {candidateCvDetails.map((f, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.5rem', color: '#475569' }}>
                            {f.fileName} {f.fileSize ? `(${f.fileSize})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Category & Role Title */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                      2. CV Category / Discipline <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text"
                      list="categorySuggestions"
                      className="form-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. Highway Engineers"
                      value={aiCategoryName}
                      onChange={(e) => setAiCategoryName(e.target.value)}
                      disabled={isGenerating}
                    />
                    <datalist id="categorySuggestions">
                      {catalogueCategories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                      3. Target Proposed Position / Role
                    </label>
                    <input 
                      type="text"
                      className="form-input"
                      style={{ width: '100%' }}
                      placeholder="e.g., Senior Resident Engineer"
                      value={aiJobTitle}
                      onChange={(e) => setAiJobTitle(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                </div>

                {/* Profile Title */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    Profile / Project Name in Portal
                  </label>
                  <input 
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="e.g., Dan Ludigo - Masaka Road Bid"
                    value={aiProfileTitle}
                    onChange={(e) => setAiProfileTitle(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* CV Format Selection & Attachment */}
                <div style={{ marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                    4. Required CV Format / Template
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Standard Procurement Formats:</span>
                      <select
                        className="form-input"
                        style={{ width: '100%' }}
                        value={aiFormatType}
                        onChange={(e) => setAiFormatType(e.target.value)}
                        disabled={isGenerating}
                      >
                        <option value="UNRA Standard Format">UNRA Standard Format (Uganda Roads)</option>
                        <option value="World Bank / FIDIC Expert Format">World Bank / FIDIC Expert Format</option>
                        <option value="PPDA (Uganda) Standard CV Format">PPDA (Uganda) Standard Form</option>
                        <option value="AfDB / African Development Bank Format">AfDB / African Development Bank</option>
                        <option value="KCCA Municipal Infrastructure Format">KCCA Municipal Format</option>
                        <option value="Executive 2-Page Summary Format">Executive 2-Page Summary</option>
                        <option value="Attached Custom Format">Attached Custom Template (Below)</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Attach Custom Format (.docx / .pdf / .txt):</span>
                      <input 
                        type="file"
                        accept=".docx,.pdf,.doc,.txt"
                        className="form-input"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFormatFile(e.target.files[0]);
                            setAiFormatType('Attached Custom Format');
                          }
                        }}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                  
                  {formatFile && (
                    <div style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Attached Format Template: {formatFile.name}
                    </div>
                  )}
                </div>

                {/* Tender Requirements & Instructions */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    5. Tender Scope & Job Requirements (Paste from RFP / EOI)
                  </label>
                  <textarea 
                    className="form-input"
                    rows={3}
                    style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                    placeholder="e.g. Scope: Construction supervision of 45km bitumen road. Mandatory: BSc in Civil Engineering, 15+ years experience, registered with Engineers Registration Board (ERB), 2 major highway projects completed in East Africa."
                    value={aiTargetJob}
                    onChange={(e) => setAiTargetJob(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    6. Custom User Instructions for AI
                  </label>
                  <textarea 
                    className="form-input"
                    rows={2}
                    style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                    placeholder="e.g. Highlight asphalt pavement design experience, emphasize FIDIC Yellow/Red book knowledge, and present 3 top highway drainage achievements."
                    value={aiCustomInstructions}
                    onChange={(e) => setAiCustomInstructions(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* Generating Loading State */}
                {isGenerating && (
                  <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    <RefreshCw size={24} className="spin" color="#0f766e" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 600, color: '#0f766e', fontSize: '0.95rem' }}>
                      Synthesizing Custom CV with Gemini AI...
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {generatingStep}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleGenerateCustomCv}
                    disabled={isGenerating || !aiCandidateName}
                    style={{ 
                      backgroundColor: '#0f766e', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '0.65rem 1.25rem',
                      fontWeight: 600
                    }}
                  >
                    <Sparkles size={18} color="#fbbf24" />
                    {isGenerating ? 'Generating Tailored CV...' : 'Generate Custom CV with AI'}
                  </button>
                </div>
              </div>
            )}

            {/* MANUAL PROFILE FORM */}
            {modalMode === 'manual' && (
              <div>
                <p style={{ color: '#64748b', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                  This will create a new CV project copying all standard sections from the Master CV Template.
                </p>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>Profile/Role Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    placeholder="e.g., Senior Civil Engineer CV" 
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                  />
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>Candidate Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    placeholder="e.g., John Doe" 
                    value={newProject.client}
                    onChange={e => setNewProject({...newProject, client: e.target.value})}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>CV Category</label>
                  <select 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    value={newProject.categoryId}
                    onChange={e => setNewProject({...newProject, categoryId: e.target.value})}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', margin: '1.5rem 0 1rem 0', paddingTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#334155' }}>Assign Editors & Viewers</h3>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                      type="button"
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
                        <div key={idx} style={{ padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.15rem 0.4rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px' }}>{u.role}</span>
                            <button 
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              onClick={() => setAssignedUsers(assignedUsers.filter((_, i) => i !== idx))}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreateProject}>Create Profile</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GENERATION SUCCESS MODAL */}
      {generationSuccessModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
        >
          <div 
            className="modal-content" 
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '14px', width: '92%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: '#ccfbf1', color: '#0f766e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <CheckCircle2 size={36} color="#0f766e" />
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Custom CV Successfully Generated!</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
                Gemini synthesized all candidate experience and structured the CV matching the requested format.
              </p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <div><span style={{ color: '#64748b' }}>Candidate:</span> <strong>{generationSuccessModal.project.client}</strong></div>
                <div><span style={{ color: '#64748b' }}>Profile Title:</span> <strong>{generationSuccessModal.project.name}</strong></div>
                <div><span style={{ color: '#64748b' }}>Format Applied:</span> <strong>{generationSuccessModal.customCv.formatUsed}</strong></div>
                <div><span style={{ color: '#64748b' }}>Book Sections Created:</span> <strong>{generationSuccessModal.customCv.sections.length} Sections</strong></div>
              </div>

              {generationSuccessModal.customCv.executiveSummary && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Executive Summary / Suitability Statement:
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.5, backgroundColor: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {generationSuccessModal.customCv.executiveSummary}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setGenerationSuccessModal(null)}
              >
                Close & Return to Dashboard
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const projId = generationSuccessModal.project.id;
                  setGenerationSuccessModal(null);
                  navigate(`/cvs/${projId}`);
                }}
                style={{ backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Open in CVs Workspace <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
