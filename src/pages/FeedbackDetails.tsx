import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, MessageSquare, ExternalLink, User } from 'lucide-react';

interface StaffUser {
  id: number;
  name: string;
}

interface Capa {
  id: number;
  capaNumber: string;
  status: string;
}

interface CustomerFeedback {
  id: number;
  feedbackNumber: string;
  customerName: string;
  projectName: string | null;
  type: string;
  dateReceived: string;
  description: string;
  status: string;
  rating: number | null;
  resolutionNotes: string | null;
  assignedToId: number | null;
  linkedCapaId: number | null;
  assignedTo?: StaffUser | null;
  linkedCapa?: Capa | null;
}

const FeedbackDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<CustomerFeedback | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFeedback();
    fetchUsers();
    fetchCapas();
  }, [id]);

  const fetchFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setFeedback(await response.json());
      } else {
        navigate('/feedback');
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

  const fetchCapas = async () => {
    try {
      const response = await fetch('/api/capa', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setCapas(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!feedback) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(feedback)
      });
      if (response.ok) {
        setFeedback(await response.json());
        alert('Feedback record saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save feedback');
    } finally {
      setIsSaving(false);
    }
  };

  if (!feedback) return <div className="layout-container">Loading...</div>;

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/feedback')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{feedback.feedbackNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: 
                feedback.status === 'Closed' ? '#dcfce3' : 
                feedback.status === 'Resolved' ? '#e0f2fe' : 
                feedback.status === 'Open' ? '#fee2e2' : '#fef3c7',
              color: 
                feedback.status === 'Closed' ? '#166534' : 
                feedback.status === 'Resolved' ? '#0369a1' : 
                feedback.status === 'Open' ? '#991b1b' : '#b45309',
              fontWeight: '600'
            }}>
              {feedback.status}
            </span>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e11d48' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Feedback'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Left Column: Details & Resolution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Details */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="#e11d48" /> Customer Details & Feedback
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Customer / Client Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={feedback.customerName}
                  onChange={e => setFeedback({...feedback, customerName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project / Reference</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={feedback.projectName || ''}
                  onChange={e => setFeedback({...feedback, projectName: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Feedback Description</label>
              <textarea 
                className="form-textarea" 
                rows={5}
                value={feedback.description}
                onChange={e => setFeedback({...feedback, description: e.target.value})}
                placeholder="Details of the complaint, suggestion, or survey responses..."
              />
            </div>
            
          </div>
          
          {/* Resolution & Investigation */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
              Investigation & Resolution
            </h2>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Resolution Notes / Actions Taken</label>
              <textarea 
                className="form-textarea" 
                rows={4}
                value={feedback.resolutionNotes || ''}
                onChange={e => setFeedback({...feedback, resolutionNotes: e.target.value})}
                placeholder="What was done to address this feedback?"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Linked CAPA (If applicable)
                {feedback.linkedCapaId && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ExternalLink size={12} /> View CAPA in Risks module
                  </span>
                )}
              </label>
              <select 
                className="form-select"
                value={feedback.linkedCapaId || ''}
                onChange={e => setFeedback({...feedback, linkedCapaId: e.target.value ? parseInt(e.target.value) : null})}
              >
                <option value="">No CAPA linked</option>
                {capas.map(c => <option key={c.id} value={c.id}>{c.capaNumber} - {c.status}</option>)}
              </select>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                If this feedback represents a systemic non-conformance, link it to a Corrective and Preventive Action (CAPA) record.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Administration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Administration</h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Feedback Type</label>
              <select 
                className="form-select"
                value={feedback.type}
                onChange={e => setFeedback({...feedback, type: e.target.value, rating: e.target.value === 'Survey' ? feedback.rating : null})}
              >
                <option value="Complaint">Complaint</option>
                <option value="Suggestion">Suggestion</option>
                <option value="Compliment">Compliment</option>
                <option value="Survey">Customer Survey</option>
              </select>
            </div>

            {feedback.type === 'Survey' && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Survey Rating (1-5)</label>
                <select 
                  className="form-select"
                  value={feedback.rating || ''}
                  onChange={e => setFeedback({...feedback, rating: e.target.value ? parseInt(e.target.value) : null})}
                >
                  <option value="">Not rated</option>
                  <option value="1">1 - Very Dissatisfied</option>
                  <option value="2">2 - Dissatisfied</option>
                  <option value="3">3 - Neutral</option>
                  <option value="4">4 - Satisfied</option>
                  <option value="5">5 - Very Satisfied</option>
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Date Received</label>
              <input 
                type="date" 
                className="form-input" 
                value={feedback.dateReceived ? feedback.dateReceived.split('T')[0] : ''}
                onChange={e => setFeedback({...feedback, dateReceived: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={feedback.status}
                onChange={e => setFeedback({...feedback, status: e.target.value})}
              >
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Assigned Handler
              </label>
              <select 
                className="form-select"
                value={feedback.assignedToId || ''}
                onChange={e => setFeedback({...feedback, assignedToId: e.target.value ? parseInt(e.target.value) : null})}
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            
            {feedback.type === 'Complaint' && feedback.status === 'Open' && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>This complaint requires an assigned handler and prompt investigation.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetails;
