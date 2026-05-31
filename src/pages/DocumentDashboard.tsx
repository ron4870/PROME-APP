import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface DocumentRecord {
  id: number;
  documentNumber: string;
  title: string;
  type: string;
  revision: string;
  status: string;
  nextReviewDate: string | null;
}

const DocumentDashboard: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setDocuments(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: 'New Standard Operating Procedure',
          type: 'SOP'
        })
      });
      if (response.ok) {
        const newDoc = await response.json();
        navigate(`/documents/${newDoc.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Master Document List
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Control of documented information (ISO 9001 Clause 7.5)</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f766e' }}
          onClick={handleCreateDocument}
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
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search documents by ID, title, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading document registry...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Doc ID</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Rev</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Next Review</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredDocs.map((d) => {
                  const reviewStatus = getReviewStatus(d.nextReviewDate, d.status);
                  return (
                    <tr 
                      key={d.id} 
                      style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', opacity: d.status === 'Obsolete' ? 0.6 : 1 }}
                      onClick={() => navigate(`/documents/${d.id}`)}
                      onMouseEnter={(evt) => evt.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(evt) => evt.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
                        {d.documentNumber}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#111827' }}>
                        {d.title}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                        {d.type}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#6b7280', fontWeight: '500' }}>
                        v{d.revision}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: 
                            d.status === 'Approved' ? '#dcfce3' : 
                            d.status === 'Obsolete' ? '#fee2e2' : 
                            d.status === 'Draft' ? '#f3f4f6' : '#fef3c7',
                          color: 
                            d.status === 'Approved' ? '#166534' : 
                            d.status === 'Obsolete' ? '#991b1b' : 
                            d.status === 'Draft' ? '#4b5563' : '#b45309'
                        }}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: reviewStatus.bg,
                          color: reviewStatus.color
                        }}>
                          {reviewStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No documents found in registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentDashboard;
