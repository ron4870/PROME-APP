import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, User, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

export const HseDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [findings, setFindings] = useState('');
  const [raiseCapa, setRaiseCapa] = useState(false);
  const [status, setStatus] = useState('Under Investigation');

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hse/incidents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncident(data);
        setStatus(data.status);
        setFindings(data.investigationFindings || '');
      }
    } catch (error) {
      console.error('Failed to fetch incident details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`/api/hse/incidents/${id}/investigate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          investigationFindings: findings,
          status,
          raiseCapa,
          investigatorId: user?.id
        })
      });

      if (res.ok) {
        fetchIncident();
        alert('Investigation findings logged successfully.');
      }
    } catch (error) {
      console.error('Failed to log investigation', error);
    }
  };

  if (loading) return <div style={{ padding: '3rem' }}>Loading incident details...</div>;
  if (!incident) return <div style={{ padding: '3rem' }}>Incident not found.</div>;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical': return { bg: '#fef2f2', col: '#ef4444' };
      case 'High': return { bg: '#fffbeb', col: '#f59e0b' };
      case 'Medium': return { bg: '#fefce8', col: '#eab308' };
      case 'Low': return { bg: '#f0fdf4', col: '#22c55e' };
      default: return { bg: '#f1f5f9', col: '#64748b' };
    }
  };

  const badge = getSeverityBadge(incident.severity);

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <button 
        onClick={() => navigate('/hse')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 500 }}
      >
        <ArrowLeft size={18} /> Back to HSE Register
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>{incident.incidentNumber}</h1>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: badge.bg, color: badge.col }}>
                    {incident.severity} Severity
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569' }}>
                    {incident.type}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#334155', fontWeight: 500 }}>{incident.title}</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> Date & Time</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{new Date(incident.incidentDate).toLocaleString()}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> Location</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{incident.location}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> Reported By</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{incident.reportedBy?.name || 'Anonymous'}</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.75rem' }}>Description of Incident</h3>
              <p style={{ color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{incident.description}</p>
            </div>

            {incident.immediateActionTaken && (
              <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#166534', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} /> Immediate Action Taken
                </h3>
                <p style={{ color: '#15803d', margin: 0, whiteSpace: 'pre-wrap' }}>{incident.immediateActionTaken}</p>
              </div>
            )}
          </div>

          {/* Investigation Findings */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={24} color="#3b82f6" />
              Safety Investigation
            </h2>
            
            <form onSubmit={handleInvestigate}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Status</label>
                <select className="form-input" style={{ width: '100%', maxWidth: '300px' }} value={status} onChange={e => setStatus(e.target.value)}>
                  <option>Reported</option>
                  <option>Under Investigation</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Root Cause & Findings</label>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%', minHeight: '150px' }} 
                  value={findings} 
                  onChange={e => setFindings(e.target.value)}
                  placeholder="Document the root cause analysis and investigation findings..."
                />
              </div>

              {!incident.linkedCapa && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fef08a', borderRadius: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="raiseCapa" 
                    checked={raiseCapa}
                    onChange={e => setRaiseCapa(e.target.checked)}
                    style={{ width: '1.2rem', height: '1.2rem' }}
                  />
                  <label htmlFor="raiseCapa" style={{ fontWeight: 500, color: '#92400e', cursor: 'pointer' }}>
                    Raise a CAPA (Corrective Action) to address systemic root causes.
                  </label>
                </div>
              )}

              <button type="submit" className="btn btn-primary">Save Investigation</button>
            </form>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {incident.linkedCapa && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #ef4444' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#ef4444" />
                Linked CAPA
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>This incident resulted in a Corrective Action requirement.</p>
              
              <Link to={`/capa/${incident.linkedCapa.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: '#3b82f6' }}>{incident.linkedCapa.reportNumber}</p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>Status: {incident.linkedCapa.status}</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
