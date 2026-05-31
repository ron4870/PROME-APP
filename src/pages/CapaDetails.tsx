import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, User, Calendar, FileText, CheckCircle, Printer } from 'lucide-react';

interface CapaReport {
  id: number;
  reportNumber: string;
  title: string;
  type: string;
  description: string;
  source: string;
  severity: string;
  status: string;
  createdAt: string;
  rootCause: string | null;
  correction: string | null;
  correctiveAction: string | null;
  targetCompletionDate: string | null;
  closedDate: string | null;
  reportedById: number;
  assignedToId: number | null;
  reportedBy: { name: string, email: string };
  assignedTo: { name: string, email: string } | null;
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

const CapaDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [capa, setCapa] = useState<CapaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Editable Fields
  const [status, setStatus] = useState('');
  const [assignedToId, setAssignedToId] = useState<number | ''>('');
  const [rootCause, setRootCause] = useState('');
  const [correction, setCorrection] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  
  useEffect(() => {
    fetchCapa();
    fetchUsers();
  }, [id]);

  const fetchCapa = async () => {
    try {
      const res = await fetch(`/api/capa/${id}`);
      if (!res.ok) {
        navigate('/capa');
        return;
      }
      const data = await res.json();
      setCapa(data);
      setStatus(data.status);
      setAssignedToId(data.assignedToId || '');
      setRootCause(data.rootCause || '');
      setCorrection(data.correction || '');
      setCorrectiveAction(data.correctiveAction || '');
      setTargetCompletionDate(data.targetCompletionDate ? data.targetCompletionDate.substring(0, 10) : '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Typically there'd be a /api/users endpoint, if not available we skip populating dropdown.
      // Let's try to fetch users if the endpoint exists, otherwise fallback.
      const res = await fetch('/api/admin/users'); 
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.warn("Could not fetch users", e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        status,
        assignedToId: assignedToId === '' ? null : assignedToId,
        rootCause,
        correction,
        correctiveAction,
        targetCompletionDate: targetCompletionDate || null
      };

      if (status === 'Closed' && capa?.status !== 'Closed') {
        updateData.closedDate = new Date().toISOString();
      } else if (status !== 'Closed') {
        updateData.closedDate = null;
      }

      const res = await fetch(`/api/capa/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (res.ok) {
        fetchCapa(); // Refresh
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  if (!capa) return null;

  const isClosed = status === 'Closed';

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/capa')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>{capa.reportNumber}</h1>
            <span className={`status-badge ${status === 'Closed' ? 'approved' : status === 'Reported' ? 'draft' : 'in-review'}`}>{status}</span>
          </div>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '1.1rem' }}>{capa.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline no-print" onClick={() => window.print()}>
            <Printer size={18} style={{ marginRight: '8px' }} />
            Export PDF
          </button>
          {!isClosed && (
            <button className="btn btn-primary no-print" onClick={handleSave} disabled={saving}>
              <Save size={18} style={{ marginRight: '8px' }} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Initial Report */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <FileText size={18} color="#475569" /> Initial Incident/Non-Conformance Details
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Type</label>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{capa.type}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Source</label>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{capa.source}</div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Detailed Description</label>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {capa.description}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Investigation & Root Cause */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <AlertTriangle size={18} color="#475569" /> Investigation & Root Cause Analysis
            </div>
            <div style={{ padding: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Root Cause</label>
              <textarea 
                className="form-input" 
                style={{ width: '100%', minHeight: '120px', resize: 'vertical' }} 
                value={rootCause} 
                onChange={e => setRootCause(e.target.value)} 
                disabled={isClosed}
                placeholder="Why did this happen? Perform 5-Whys or similar root cause analysis here..."
              ></textarea>
            </div>
          </div>

          {/* Section 3: Actions */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <CheckCircle size={18} color="#475569" /> Correction & Corrective Actions
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Immediate Correction</label>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} 
                  value={correction} 
                  onChange={e => setCorrection(e.target.value)} 
                  disabled={isClosed}
                  placeholder="What was done immediately to contain the issue?"
                ></textarea>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Corrective Action (Preventive)</label>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} 
                  value={correctiveAction} 
                  onChange={e => setCorrectiveAction(e.target.value)} 
                  disabled={isClosed}
                  placeholder="What long-term action will prevent this from happening again?"
                ></textarea>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', color: '#0f172a' }}>Management</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Status Workflow</label>
              <select className="form-input" style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value)} disabled={isClosed}>
                <option value="Reported">Reported</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Action Pending">Action Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Assign Investigator</label>
              <select className="form-input" style={{ width: '100%' }} value={assignedToId} onChange={e => setAssignedToId(e.target.value === '' ? '' : parseInt(e.target.value))} disabled={isClosed}>
                <option value="">-- Unassigned --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Target Completion</label>
              <input 
                type="date" 
                className="form-input" 
                style={{ width: '100%' }} 
                value={targetCompletionDate} 
                onChange={e => setTargetCompletionDate(e.target.value)} 
                disabled={isClosed}
              />
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <User size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reported By</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{capa.reportedBy?.name || 'Unknown'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Calendar size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Reported</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{new Date(capa.createdAt).toLocaleString()}</div>
                </div>
              </div>
              {capa.closedDate && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem' }}>
                  <CheckCircle size={16} color="#10b981" style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Closed</div>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{new Date(capa.closedDate).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default CapaDetails;
