import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

interface DocumentRecord {
  id: number;
  documentNumber: string;
  title: string;
  type: string;
  category: string;
  division: string;
  retentionPeriod: string;
  revision: string;
  status: string;
  issueDate: string | null;
  nextReviewDate: string | null;
}

const DocumentDashboard: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal state
  const [newDoc, setNewDoc] = useState({ 
    title: '', 
    documentNumber: '',
    category: 'Quality System Manuals', 
    division: '',
    retentionPeriod: '3 years'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setDocuments(await response.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const formData = new FormData();
      formData.append('title', newDoc.title);
      formData.append('documentNumber', newDoc.documentNumber);
      formData.append('category', newDoc.category);
      formData.append('division', newDoc.division);
      formData.append('retentionPeriod', newDoc.retentionPeriod);
      formData.append('type', newDoc.category === 'Quality System Procedures' ? 'SOP' : 
                               newDoc.category === 'Work Instructions' ? 'Work Instruction' : 'Manual');
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        const createdDoc = await response.json();
        setIsModalOpen(false);
        setNewDoc({ title: '', documentNumber: '', category: 'Quality System Manuals', division: '', retentionPeriod: '3 years' });
        setSelectedFile(null);
        navigate(`/documents/${createdDoc.id}`);
      } else {
        const errText = await response.text();
        console.error("Server returned error:", errText);
        alert(`Failed to register document: ${errText}`);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert(`Network or fetch error: ${error}`);
    }
  };

  const getReviewStatus = (date: string | null, status: string) => {
    if (status !== 'Approved') return { label: '-', color: '#9ca3af', bg: 'transparent', urgent: false };
    if (!date) return { label: 'Not Set', color: '#9ca3af', bg: '#f3f4f6', urgent: false };
    
    const today = new Date();
    const reviewDate = new Date(date);
    
    today.setHours(0,0,0,0);
    reviewDate.setHours(0,0,0,0);
    
    const diffTime = reviewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: '#991b1b', bg: '#fee2e2', urgent: true };
    if (diffDays <= 30) return { label: `Due in ${diffDays}d`, color: '#b45309', bg: '#fef3c7', urgent: true };
    return { label: `Valid (${diffDays}d left)`, color: '#166534', bg: '#dcfce3', urgent: false };
  };

  const filteredDocs = documents.filter(d => 
    (d.title && d.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (d.documentNumber && d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.category && d.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group by Category
  const groupedDocs: Record<string, DocumentRecord[]> = {
    'Quality System Manuals': [],
    'Quality System Procedures': [],
    'Quality System Record': [],
    'Job Description': [],
    'Work Instruction': [],
    'Work Instructions': [],
    'Other': []
  };

  filteredDocs.forEach(doc => {
    const cat = doc.category || 'Other';
    if (!groupedDocs[cat]) {
      groupedDocs[cat] = [];
    }
    groupedDocs[cat].push(doc);
  });

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Documented Information</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>ISO Clause: 7.5 Documented Information</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f766e', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
        >
          <Plus size={18} /> Register Document
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <FileText size={16} color="#0f766e" /> Total Registry
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {documents.length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#22c55e" /> Active / Approved
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {documents.filter(d => d.status === 'Approved').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Clock size={16} color="#eab308" /> Pending / Drafts
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {documents.filter(d => d.status === 'Draft' || d.status === 'Under Review').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <AlertTriangle size={16} color="#ef4444" /> Reviews Due (≤ 30d)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {documents.filter(d => getReviewStatus(d.nextReviewDate, d.status).urgent).length}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search documents by ID, title, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
          />
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading document registry...</div>
        ) : (
          <div>
            {Object.entries(groupedDocs).map(([category, categoryDocs]) => {
              if (categoryDocs.length === 0) return null;
              return (
                <div key={category} style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e5e7eb' }}>
                    {category}
                  </h2>
                  <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>DOCUMENT</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>I.D. Number</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Revision</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Date of</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Division</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Retention</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '0.875rem' }}>
                        {categoryDocs.map((d) => (
                          <tr 
                            key={d.id} 
                            style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', opacity: d.status === 'Obsolete' ? 0.6 : 1 }}
                            onClick={() => navigate(`/documents/${d.id}`)}
                            onMouseEnter={(evt) => evt.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(evt) => evt.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: '#111827' }}>
                              {d.title}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#4b5563', whiteSpace: 'nowrap' }}>
                              {d.documentNumber}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                              {d.revision.startsWith('Ver') ? d.revision : `Ver-${d.revision}`}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                              {formatDate(d.issueDate)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                              {d.division || '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                              {d.retentionPeriod || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {filteredDocs.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No documents found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Register New Document</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Document Title <span style={{color: '#ef4444'}}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={newDoc.title}
                  onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. Quality Manual"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>I.D. Number <span style={{color: '#ef4444'}}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={newDoc.documentNumber}
                  onChange={e => setNewDoc({...newDoc, documentNumber: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. PROME-QSM-AD-01"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Category <span style={{color: '#ef4444'}}>*</span></label>
                <select 
                  className="form-input"
                  value={newDoc.category}
                  onChange={e => setNewDoc({...newDoc, category: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="Quality System Manuals">Quality System Manuals</option>
                  <option value="Quality System Procedures">Quality System Procedures</option>
                  <option value="Quality System Record">Quality System Record</option>
                  <option value="Job Description">Job Description</option>
                  <option value="Work Instruction">Work Instruction</option>
                  <option value="Work Instructions">Work Instructions</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Division</label>
                <input 
                  type="text"
                  className="form-input"
                  value={newDoc.division}
                  onChange={e => setNewDoc({...newDoc, division: e.target.value})}
                  list="new-division-list"
                  placeholder="e.g. AFD or Custom"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <datalist id="new-division-list">
                  <option value="AFD" />
                  <option value="PMBDD" />
                  <option value="PED" />
                  <option value="CP&SD" />
                  <option value="PDMD" />
                  <option value="PMBDO" />
                  <option value="CMD" />
                  <option value="BEED" />
                  <option value="CPSD" />
                  <option value="ALL" />
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Attach Document (Optional)</label>
                <input 
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#f9fafb' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>File will be uploaded to the official Google Drive automatically.</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Retention Period</label>
                <input 
                  type="text" 
                  value={newDoc.retentionPeriod}
                  onChange={e => setNewDoc({...newDoc, retentionPeriod: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. 3 years"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#0f766e', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                >
                  Register Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDashboard;
