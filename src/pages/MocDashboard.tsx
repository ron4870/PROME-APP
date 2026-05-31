import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, GitPullRequest, FileEdit, CheckCircle } from 'lucide-react';

interface ChangeRequest {
  id: number;
  mocNumber: string;
  title: string;
  type: string;
  status: string;
  proposedDate: string;
  requestedBy?: { name: string };
  createdAt: string;
}

export const MocDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [mocs, setMocs] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Process');
  const [newDescription, setNewDescription] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newRisk, setNewRisk] = useState('');

  useEffect(() => {
    fetchMocs();
  }, []);

  const fetchMocs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/moc/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMocs(data);
      }
    } catch (error) {
      console.error('Failed to fetch MOCs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch('/api/moc/requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          description: newDescription,
          reasonForChange: newReason,
          proposedDate: newDate,
          riskAssessment: newRisk,
          requestedById: user?.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewReason('');
        setNewDate('');
        setNewRisk('');
        fetchMocs();
      }
    } catch (error) {
      console.error('Failed to submit MOC', error);
    }
  };

  const filtered = mocs.filter(m => 
    m.mocNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: '#f0fdf4', col: '#22c55e' };
      case 'Implemented': return { bg: '#eff6ff', col: '#3b82f6' };
      case 'Rejected': return { bg: '#fef2f2', col: '#ef4444' };
      case 'Pending Review': return { bg: '#fffbeb', col: '#f59e0b' };
      default: return { bg: '#f1f5f9', col: '#64748b' }; // Draft
    }
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitPullRequest color="#bb0a0a" size={28} />
            Management of Change (MOC)
          </h1>
          <p style={{ color: '#64748b' }}>Control and evaluate changes to processes, equipment, and personnel (ISO 9001/45001).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Propose Change
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '50%', color: '#64748b' }}><GitPullRequest size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Total Requests</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{mocs.length}</h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#f59e0b' }}><FileEdit size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Pending Review</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {mocs.filter(m => m.status === 'Pending Review' || m.status === 'Draft').length}
            </h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '50%', color: '#22c55e' }}><CheckCircle size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Approved (Not Implemented)</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {mocs.filter(m => m.status === 'Approved').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search MOCs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading MOC requests...</div>
          ) : (
            <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>MOC No.</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Requested By</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Date Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No change requests found.</td>
                  </tr>
                ) : (
                  filtered.map(moc => {
                    const badge = getStatusBadge(moc.status);
                    return (
                      <tr 
                        key={moc.id} 
                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                        onClick={() => navigate(`/moc/${moc.id}`)}
                        className="hover-bg"
                      >
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{moc.mocNumber}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{moc.title}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>{moc.type}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>{moc.requestedBy?.name || 'Unknown'}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: badge.bg, color: badge.col }}>
                            {moc.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(moc.createdAt).toLocaleDateString()}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Propose a Change (MOC)</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title of Change</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Upgrade of Server Infrastructure" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type of Change</label>
                  <select className="form-input" style={{ width: '100%' }} value={newType} onChange={e => setNewType(e.target.value)}>
                    <option>Process</option>
                    <option>Equipment</option>
                    <option>Personnel</option>
                    <option>Document</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Proposed Target Date</label>
                  <input required type="date" className="form-input" style={{ width: '100%' }} value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description (What is changing?)</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px' }} value={newDescription} onChange={e => setNewDescription(e.target.value)}></textarea>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Justification (Why is it changing?)</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px' }} value={newReason} onChange={e => setNewReason(e.target.value)}></textarea>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Risk Assessment</label>
                <textarea className="form-input" style={{ width: '100%', minHeight: '60px' }} value={newRisk} onChange={e => setNewRisk(e.target.value)} placeholder="Identify potential risks or hazards introduced by this change..."></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Proposal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg:hover { background-color: #f8fafc; }
      `}</style>
    </div>
  );
};
