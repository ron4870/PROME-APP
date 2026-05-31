import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MessageSquare, AlertTriangle, CheckCircle2, Star } from 'lucide-react';

interface CustomerFeedback {
  id: number;
  feedbackNumber: string;
  customerName: string;
  projectName: string | null;
  type: string;
  dateReceived: string;
  status: string;
  rating: number | null;
  assignedTo?: { id: number; name: string };
  linkedCapa?: { id: number; capaNumber: string; status: string };
}

const FeedbackDashboard: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/feedback', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setFeedbackList(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFeedback = async () => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customerName: 'New Customer',
          type: 'Complaint',
          description: 'Feedback description...'
        })
      });
      if (response.ok) {
        const newFb = await response.json();
        navigate(`/feedback/${newFb.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredFeedback = feedbackList.filter(f => 
    f.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.feedbackNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.projectName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAverageRating = () => {
    const surveys = feedbackList.filter(f => f.type === 'Survey' && f.rating !== null);
    if (surveys.length === 0) return 0;
    const sum = surveys.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return (sum / surveys.length).toFixed(1);
  };

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Customer Satisfaction & Feedback
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Monitor customer perceptions and track resolution of complaints (ISO 9001 Clause 9.1.2)</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e11d48' }}
          onClick={handleCreateFeedback}
        >
          <Plus size={18} /> Log Feedback
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <MessageSquare size={16} color="#e11d48" /> Total Feedback Logged
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {feedbackList.length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Star size={16} color="#eab308" /> Avg Survey Score (out of 5)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {calculateAverageRating()}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <AlertTriangle size={16} color="#ef4444" /> Open Complaints
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {feedbackList.filter(f => f.type === 'Complaint' && f.status !== 'Closed').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#22c55e" /> Closed / Resolved
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {feedbackList.filter(f => f.status === 'Closed' || f.status === 'Resolved').length}
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
              placeholder="Search by customer, project, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading feedback registry...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID / Customer</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date Received</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Rating</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Assigned To</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredFeedback.map((f) => (
                  <tr 
                    key={f.id} 
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onClick={() => navigate(`/feedback/${f.id}`)}
                    onMouseEnter={(evt) => evt.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(evt) => evt.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '600', color: '#111827' }}>{f.feedbackNumber}</div>
                      <div style={{ fontWeight: '500', color: '#374151', marginTop: '2px' }}>{f.customerName}</div>
                      {f.projectName && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{f.projectName}</div>}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: f.type === 'Complaint' ? '#fee2e2' : f.type === 'Survey' ? '#e0f2fe' : f.type === 'Compliment' ? '#dcfce3' : '#f3f4f6',
                        color: f.type === 'Complaint' ? '#991b1b' : f.type === 'Survey' ? '#0369a1' : f.type === 'Compliment' ? '#166534' : '#4b5563',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {f.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151' }}>
                      {new Date(f.dateReceived).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {f.type === 'Survey' && f.rating ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#eab308' }}>
                          <Star size={14} fill="#eab308" /> {f.rating}/5
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      {f.assignedTo?.name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 
                          f.status === 'Closed' ? '#dcfce3' : 
                          f.status === 'Resolved' ? '#e0f2fe' : 
                          f.status === 'Open' ? '#fee2e2' : '#fef3c7',
                        color: 
                          f.status === 'Closed' ? '#166534' : 
                          f.status === 'Resolved' ? '#0369a1' : 
                          f.status === 'Open' ? '#991b1b' : '#b45309'
                      }}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredFeedback.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No feedback records found.
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

export default FeedbackDashboard;
