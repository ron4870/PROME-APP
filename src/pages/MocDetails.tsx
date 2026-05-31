import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, User, CheckSquare, XSquare, AlertTriangle } from 'lucide-react';

export const MocDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [moc, setMoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [approverNotes, setApproverNotes] = useState('');

  useEffect(() => {
    fetchMoc();
  }, [id]);

  const fetchMoc = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/moc/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMoc(data);
        setReviewerNotes(data.reviewerNotes || '');
        setApproverNotes(data.approverNotes || '');
      }
    } catch (error) {
      console.error('Failed to fetch MOC details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`/api/moc/requests/${id}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          reviewerNotes,
          status: newStatus,
          reviewedById: user?.id
        })
      });

      if (res.ok) {
        fetchMoc();
      }
    } catch (error) {
      console.error('Failed to log review', error);
    }
  };

  const handleApprove = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`/api/moc/requests/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          approverNotes,
          status: newStatus,
          approvedById: user?.id
        })
      });

      if (res.ok) {
        fetchMoc();
      }
    } catch (error) {
      console.error('Failed to log approval', error);
    }
  };

  if (loading) return <div style={{ padding: '3rem' }}>Loading MOC details...</div>;
  if (!moc) return <div style={{ padding: '3rem' }}>Change Request not found.</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: '#f0fdf4', col: '#22c55e' };
      case 'Implemented': return { bg: '#eff6ff', col: '#3b82f6' };
      case 'Rejected': return { bg: '#fef2f2', col: '#ef4444' };
      case 'Pending Review': return { bg: '#fffbeb', col: '#f59e0b' };
      default: return { bg: '#f1f5f9', col: '#64748b' };
    }
  };

  const badge = getStatusBadge(moc.status);

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <button 
        onClick={() => navigate('/moc')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 500 }}
      >
        <ArrowLeft size={18} /> Back to Change Management
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>{moc.mocNumber}</h1>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: badge.bg, color: badge.col }}>
                    {moc.status}
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569' }}>
                    {moc.type} Change
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#334155', fontWeight: 500 }}>{moc.title}</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> Proposed Date</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{moc.proposedDate ? new Date(moc.proposedDate).toLocaleDateString() : 'TBD'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> Requested By</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{moc.requestedBy?.name || 'Unknown'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> Date Submitted</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{new Date(moc.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="#475569" /> Description of Change
              </h3>
              <p style={{ color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{moc.description}</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.75rem' }}>Justification</h3>
              <p style={{ color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{moc.reasonForChange}</p>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#92400e', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} /> Risk Assessment
              </h3>
              <p style={{ color: '#92400e', margin: 0, whiteSpace: 'pre-wrap' }}>{moc.riskAssessment || 'No risk assessment provided.'}</p>
            </div>
          </div>

        </div>

        {/* Right Column: Workflows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Step 1: Review */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 1rem 0' }}>Step 1: Technical Review</h3>
            
            {(moc.status === 'Draft' || moc.status === 'Pending Review') ? (
              <div>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%', minHeight: '80px', marginBottom: '1rem' }} 
                  value={reviewerNotes} 
                  onChange={e => setReviewerNotes(e.target.value)}
                  placeholder="Add review notes (impact, feasibility)..."
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleReview('Pending Review')} className="btn btn-primary" style={{ flex: 1 }}>Submit Review</button>
                  <button onClick={() => handleReview('Rejected')} className="btn btn-secondary" style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 500 }}>Reviewed By: {moc.reviewedBy?.name || 'System'}</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{moc.reviewerNotes || 'No notes provided.'}</p>
              </div>
            )}
          </div>

          {/* Step 2: Approval */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', opacity: (moc.status === 'Draft' || moc.status === 'Rejected') ? 0.5 : 1 }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 1rem 0' }}>Step 2: Final Approval</h3>
            
            {(moc.status === 'Pending Review') ? (
              <div>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%', minHeight: '80px', marginBottom: '1rem' }} 
                  value={approverNotes} 
                  onChange={e => setApproverNotes(e.target.value)}
                  placeholder="Add final approval notes..."
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleApprove('Approved')} className="btn btn-primary" style={{ flex: 1, backgroundColor: '#22c55e', borderColor: '#22c55e' }}>Approve MOC</button>
                  <button onClick={() => handleApprove('Rejected')} className="btn btn-secondary" style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
                </div>
              </div>
            ) : (moc.status === 'Approved' || moc.status === 'Implemented') ? (
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 500, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckSquare size={18} /> Approved By: {moc.approvedBy?.name || 'System'}
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#15803d' }}>{moc.approverNotes || 'Approved without additional notes.'}</p>
                
                {moc.status === 'Approved' && (
                  <button 
                    onClick={() => handleApprove('Implemented')} 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1rem', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
                  >
                    Mark as Implemented
                  </button>
                )}
              </div>
            ) : moc.status === 'Rejected' ? (
              <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 500, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XSquare size={18} /> Change Rejected
                </p>
              </div>
            ) : (
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Awaiting Technical Review first.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
