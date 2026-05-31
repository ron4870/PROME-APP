import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Printer } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface ActionItem {
  id?: number;
  description: string;
  assignedToId: number | null;
  assignedTo?: User;
  dueDate: string | null;
  status: string;
}

interface ManagementReview {
  id: number;
  meetingNumber: string;
  scheduledDate: string | null;
  conductedDate: string | null;
  status: string;
  chairpersonId: number;
  attendees: User[];
  auditResultsSummary: string;
  capaSummary: string;
  riskSummary: string;
  generalNotes: string;
  decisions: string;
  actionItems: ActionItem[];
}

const ManagementReviewDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ManagementReview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newAction, setNewAction] = useState<ActionItem>({ description: '', assignedToId: null, dueDate: '', status: 'Open' });

  useEffect(() => {
    fetchReview();
    fetchUsers();
  }, [id]);

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/management-reviews/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setReview(await response.json());
      else navigate('/management-reviews');
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
    if (!review) return;
    setIsSaving(true);
    try {
      const attendeeIds = review.attendees.map(a => a.id);
      const response = await fetch(`/api/management-reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...review, attendeeIds })
      });
      if (response.ok) {
        setReview(await response.json());
        alert('Review saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save review');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.description) return;
    try {
      const response = await fetch(`/api/management-reviews/${id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newAction)
      });
      if (response.ok) {
        const addedAction = await response.json();
        setReview(prev => prev ? { ...prev, actionItems: [...prev.actionItems, addedAction] } : null);
        setNewAction({ description: '', assignedToId: null, dueDate: '', status: 'Open' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (!confirm('Delete this action item?')) return;
    try {
      const response = await fetch(`/api/management-reviews/${id}/actions/${actionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setReview(prev => prev ? { 
          ...prev, 
          actionItems: prev.actionItems.filter(a => a.id !== actionId) 
        } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateActionStatus = async (actionId: number, status: string) => {
    try {
      const actionToUpdate = review?.actionItems.find(a => a.id === actionId);
      if (!actionToUpdate) return;
      
      const response = await fetch(`/api/management-reviews/${id}/actions/${actionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...actionToUpdate, status })
      });
      
      if (response.ok) {
        const updated = await response.json();
        setReview(prev => prev ? {
          ...prev,
          actionItems: prev.actionItems.map(a => a.id === actionId ? updated : a)
        } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!review) return <div className="layout-container">Loading...</div>;

  return (
    <div className="layout-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/management-reviews')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{review.meetingNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontWeight: '600'
            }}>
              Management Review
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline no-print" onClick={() => window.print()}>
            <Printer size={18} style={{ marginRight: '8px' }} />
            Export PDF
          </button>
          <button 
            className="btn btn-primary no-print" 
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Review Inputs (ISO 9001: 9.3.2)</h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Audit Results Summary</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={review.auditResultsSummary || ''}
                onChange={e => setReview({...review, auditResultsSummary: e.target.value})}
                placeholder="Summary of internal and external audit findings..."
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Non-Conformities & CAPA</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={review.capaSummary || ''}
                onChange={e => setReview({...review, capaSummary: e.target.value})}
                placeholder="Status of corrective and preventive actions..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Risks & Opportunities</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={review.riskSummary || ''}
                onChange={e => setReview({...review, riskSummary: e.target.value})}
                placeholder="Effectiveness of actions taken to address risks and opportunities..."
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">General Notes & Other Inputs</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={review.generalNotes || ''}
                onChange={e => setReview({...review, generalNotes: e.target.value})}
                placeholder="Customer feedback, quality objectives, changes in external/internal issues..."
              />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Review Outputs (ISO 9001: 9.3.3)</h2>
            
            <div className="form-group">
              <label className="form-label">Decisions & Resource Needs</label>
              <textarea 
                className="form-textarea" 
                rows={4}
                value={review.decisions || ''}
                onChange={e => setReview({...review, decisions: e.target.value})}
                placeholder="Opportunities for improvement, any need for changes to the QMS, and resource needs..."
              />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Action Items</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="New action item..." 
                value={newAction.description}
                onChange={e => setNewAction({...newAction, description: e.target.value})}
                style={{ flex: 1 }}
              />
              <select 
                className="form-select" 
                value={newAction.assignedToId || ''}
                onChange={e => setNewAction({...newAction, assignedToId: parseInt(e.target.value) || null})}
                style={{ width: '150px' }}
              >
                <option value="">Assignee...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input 
                type="date" 
                className="form-input" 
                value={newAction.dueDate || ''}
                onChange={e => setNewAction({...newAction, dueDate: e.target.value})}
                style={{ width: '150px' }}
              />
              <button className="btn btn-primary" onClick={handleAddAction} disabled={!newAction.description}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Description</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Assigned To</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Due Date</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {review.actionItems.map(action => (
                    <tr key={action.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{action.description}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{action.assignedTo?.name || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                        {action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <select 
                          className="form-select" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          value={action.status}
                          onChange={(e) => handleUpdateActionStatus(action.id!, e.target.value)}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button onClick={() => handleDeleteAction(action.id!)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {review.actionItems.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                        No action items created.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Meeting Details</h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={review.status}
                onChange={e => setReview({...review, status: e.target.value})}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Conducted">Conducted</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Scheduled Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={review.scheduledDate ? review.scheduledDate.split('T')[0] : ''}
                onChange={e => setReview({...review, scheduledDate: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Conducted Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={review.conductedDate ? review.conductedDate.split('T')[0] : ''}
                onChange={e => setReview({...review, conductedDate: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Attendees</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {review.attendees.map(attendee => (
                  <span key={attendee.id} style={{ 
                    padding: '2px 8px', 
                    backgroundColor: '#f3f4f6', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {attendee.name}
                    <button 
                      onClick={() => setReview({...review, attendees: review.attendees.filter(a => a.id !== attendee.id)})}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}
                    >×</button>
                  </span>
                ))}
              </div>
              <select 
                className="form-select"
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  if (userId && !review.attendees.find(a => a.id === userId)) {
                    const user = users.find(u => u.id === userId);
                    if (user) {
                      setReview({...review, attendees: [...review.attendees, user]});
                    }
                  }
                  e.target.value = '';
                }}
              >
                <option value="">Add attendee...</option>
                {users.filter(u => !review.attendees.find(a => a.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementReviewDetails;
