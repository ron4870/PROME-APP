import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, ExternalLink, ShieldCheck, History, User } from 'lucide-react';

interface StaffUser {
  id: number;
  name: string;
}

interface DocumentRecord {
  id: number;
  documentNumber: string;
  title: string;
  type: string;
  revision: string;
  status: string;
  issueDate: string | null;
  nextReviewDate: string | null;
  ownerId: number | null;
  approvedById: number | null;
  fileUrl: string | null;
  changeHistory: string | null;
  owner?: StaffUser | null;
  approvedBy?: StaffUser | null;
}

const DocumentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    fetchDocument();
    fetchUsers();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setDoc(await response.json());
      } else {
        navigate('/documents');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setUsers(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!doc) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(doc)
      });
      if (response.ok) {
        setDoc(await response.json());
        alert('Document saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  if (!doc) return <div className="layout-container">Loading...</div>;

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/documents')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{doc.documentNumber} : {doc.title}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: 
                doc.status === 'Approved' ? '#dcfce3' : 
                doc.status === 'Obsolete' ? '#fee2e2' : 
                doc.status === 'Draft' ? '#f3f4f6' : '#fef3c7',
              color: 
                doc.status === 'Approved' ? '#166534' : 
                doc.status === 'Obsolete' ? '#991b1b' : 
                doc.status === 'Draft' ? '#4b5563' : '#b45309',
              fontWeight: '600'
            }}>
              {doc.status}
            </span>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f766e' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Metadata'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Metadata Block */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="#0f766e" /> Document Properties
            </h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Document Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={doc.title}
                onChange={e => setDoc({...doc, title: e.target.value})}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select 
                  className="form-select"
                  value={doc.type}
                  onChange={e => setDoc({...doc, type: e.target.value})}
                >
                  <option value="SOP">Standard Operating Procedure (SOP)</option>
                  <option value="Policy">Policy</option>
                  <option value="Manual">Manual</option>
                  <option value="Work Instruction">Work Instruction</option>
                  <option value="Form">Form / Template</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Revision Number/Letter</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={doc.revision}
                  onChange={e => setDoc({...doc, revision: e.target.value})}
                  placeholder="e.g. 1.0 or A"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Google Drive / File URL</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="url" 
                  className="form-input" 
                  style={{ flex: 1 }}
                  value={doc.fileUrl || ''}
                  onChange={e => setDoc({...doc, fileUrl: e.target.value})}
                  placeholder="https://docs.google.com/..."
                />
                {doc.fileUrl && (
                  <a 
                    href={doc.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <ExternalLink size={16} /> Open
                  </a>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Link to the active hosted file for viewing and editing.</p>
            </div>
          </div>

          {/* Change History */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={20} color="#0f766e" /> Version & Change History
            </h2>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes for this Revision (v{doc.revision})</label>
              <textarea 
                className="form-textarea" 
                rows={4}
                value={doc.changeHistory || ''}
                onChange={e => setDoc({...doc, changeHistory: e.target.value})}
                placeholder="What changed in this version? E.g., 'Initial release' or 'Updated section 4 to reflect new ISO requirements.'"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Control & Authorization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#0f766e" /> Control Flags
            </h2>
            
            <div className="form-group">
              <label className="form-label">Lifecycle Status</label>
              <select 
                className="form-select"
                value={doc.status}
                onChange={e => setDoc({...doc, status: e.target.value})}
                style={{ 
                  backgroundColor: doc.status === 'Approved' ? '#f0fdf4' : doc.status === 'Obsolete' ? '#fef2f2' : 'white',
                  fontWeight: '600'
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved (Live)</option>
                <option value="Obsolete">Obsolete (Archived)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Issue / Effective Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={doc.issueDate ? doc.issueDate.split('T')[0] : ''}
                onChange={e => setDoc({...doc, issueDate: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Next Periodic Review Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={doc.nextReviewDate ? doc.nextReviewDate.split('T')[0] : ''}
                onChange={e => setDoc({...doc, nextReviewDate: e.target.value})}
              />
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }}></div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Document Owner
              </label>
              <select 
                className="form-select"
                value={doc.ownerId || ''}
                onChange={e => setDoc({...doc, ownerId: e.target.value ? parseInt(e.target.value) : null})}
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>Responsible for drafting and maintenance.</p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Approved By
              </label>
              <select 
                className="form-select"
                value={doc.approvedById || ''}
                onChange={e => setDoc({...doc, approvedById: e.target.value ? parseInt(e.target.value) : null})}
              >
                <option value="">Not Approved</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>Manager/Director authorizing the release.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetails;
