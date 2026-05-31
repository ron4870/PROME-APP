import { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function NotificationsPage() {
  const [inbox, setInbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/workflows/inbox', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInbox(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch inbox');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (stepId: number, action: 'Approved' | 'Rejected') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/api/workflows/step/${stepId}/action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ action, comments: 'Actioned from Unified Inbox' })
      });
      fetchInbox();
    } catch (err) {
      alert('Failed to process action');
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading notifications...</p></div>;
  }

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">
          <ShieldAlert className="page-icon" style={{ color: '#004B87' }} />
          Action Inbox & Notifications
        </h1>
        <p className="page-subtitle">Your unified dashboard for all system, ISO IMS, and Project tasks requiring your attention.</p>
      </header>

      {inbox.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h3>You're all caught up!</h3>
          <p style={{ color: '#64748b' }}>There are no pending actions requiring your attention right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {inbox.map((step) => {
            const isOverdue = new Date(step.slaDeadline) < new Date();
            const workflow = step.workflow;
            const title = workflow?.title || 'Unknown Workflow';
            
            return (
              <div 
                key={step.id} 
                style={{ 
                  backgroundColor: 'white', 
                  border: `1px solid ${isOverdue ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1'
                    }}>
                      {step.actionType.toUpperCase()}
                    </span>
                    {isOverdue && (
                      <span style={{ 
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: '#fef2f2', color: '#ef4444'
                      }}>
                        <AlertTriangle size={12} /> OVERDUE
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>{title}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                    Initiated by {workflow?.initiator?.name || 'System'}
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: isOverdue ? '#ef4444' : '#64748b', fontSize: '0.875rem' }}>
                    <Clock size={14} />
                    <span>SLA Deadline: {new Date(step.slaDeadline).toLocaleString()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleAction(step.id, 'Approved')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(step.id, 'Rejected')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
