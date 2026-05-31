import React, { useState, useEffect } from 'react';
import { Shield, FileText, CheckCircle, Upload, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface IsoDocument {
  id: number;
  documentNumber: string;
  title: string;
  category: string;
  revision: string;
  status: string;
  fileUrl: string | null;
  effectiveDate: string | null;
  author: { name: string } | null;
  acknowledgments: any[];
  updatedAt: string;
}

const IsoDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<IsoDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('SOP');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/iso-documents', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch ISO documents', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const response = await fetch(`/api/iso-documents/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        // Refresh docs
        fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to acknowledge', error);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return alert("Please select a file.");

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('documentNumber', docNumber);
    formData.append('title', docTitle);
    formData.append('category', docCategory);
    
    try {
      const response = await fetch('/api/iso-documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setDocNumber('');
        setDocTitle('');
        fetchDocuments();
      } else {
        const err = await response.json();
        alert(err.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error", error);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/iso-documents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchDocuments();
    } catch (error) {
      console.error("Status update error", error);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.75rem', color: '#1f2937' }}>
            <Shield size={28} color="var(--primary)" />
            ISO Document Control (IMS)
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Central repository for controlled policies, procedures, and manuals.</p>
        </div>
        
        {(user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin') && (
          <button 
            className="btn btn-primary"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Upload size={18} />
            New Document Draft
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Search by title or document number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
            />
          </div>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filter
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading documents...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600 }}>Document No.</th>
                  <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600 }}>Rev & Status</th>
                  <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600 }}>Last Updated</th>
                  <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => {
                    const hasAcknowledged = doc.acknowledgments.length > 0;
                    return (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem', fontWeight: 500, color: '#111827' }}>{doc.documentNumber}</td>
                        <td style={{ padding: '1rem', color: '#374151' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} color="#9ca3af" />
                            {doc.title}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: '#4b5563' }}>{doc.category}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>v{doc.revision}</span>
                            <span style={{ 
                              padding: '0.125rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.75rem', 
                              fontWeight: 500,
                              backgroundColor: doc.status === 'APPROVED' ? '#dcfce7' : doc.status === 'DRAFT' ? '#f3f4f6' : '#fef08a',
                              color: doc.status === 'APPROVED' ? '#166534' : doc.status === 'DRAFT' ? '#374151' : '#854d0e'
                            }}>
                              {doc.status}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {doc.fileUrl && (
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                                View PDF
                              </a>
                            )}
                            
                            {doc.status === 'APPROVED' && !hasAcknowledged && (
                              <button 
                                onClick={() => handleAcknowledge(doc.id)}
                                className="btn btn-primary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: '#eab308', borderColor: '#eab308' }}
                              >
                                Acknowledge
                              </button>
                            )}
                            
                            {doc.status === 'APPROVED' && hasAcknowledged && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
                                <CheckCircle size={14} /> Read
                              </span>
                            )}

                            {(user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin') && (
                              <select 
                                value={doc.status}
                                onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                                style={{ marginLeft: '0.5rem', padding: '0.25rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                              >
                                <option value="DRAFT">Draft</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="APPROVED">Approve</option>
                                <option value="OBSOLETE">Obsolete</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Draft New ISO Document</h2>
            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document Number (e.g. PROME-SOP-001)</label>
                <input 
                  type="text" 
                  value={docNumber} onChange={e => setDocNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document Title</label>
                <input 
                  type="text" 
                  value={docTitle} onChange={e => setDocTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Category</label>
                <select 
                  value={docCategory} onChange={e => setDocCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="Policy">Policy</option>
                  <option value="SOP">SOP</option>
                  <option value="Manual">Manual</option>
                  <option value="Form">Form</option>
                  <option value="Work Instruction">Work Instruction</option>
                </select>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Upload PDF/Doc</label>
                <input 
                  type="file" 
                  onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px dashed #d1d5db', borderRadius: '4px' }}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Drafting...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default IsoDocuments;
