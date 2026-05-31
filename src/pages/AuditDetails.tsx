import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, AlertTriangle, User, Calendar, FileText, CheckCircle, Plus, Printer } from 'lucide-react';

interface AuditFinding {
  id: number;
  description: string;
  classification: string;
  capaReport: { id: number, reportNumber: string, status: string } | null;
  createdAt: string;
}

interface Audit {
  id: number;
  auditNumber: string;
  title: string;
  type: string;
  scope: string;
  status: string;
  plannedDate: string;
  executionDate: string | null;
  auditorId: number | null;
  auditeeId: number | null;
  auditor: { name: string } | null;
  auditee: { name: string } | null;
  findings: AuditFinding[];
}
const AuditDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable Fields
  const [status, setStatus] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  
  // New Finding State
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [newFinding, setNewFinding] = useState({ description: '', classification: 'Major Non-Conformance' });

  useEffect(() => {
    fetchAudit();
  }, [id]);

  const fetchAudit = async () => {
    try {
      const res = await fetch(`/api/audits/${id}`);
      if (!res.ok) {
        navigate('/audits');
        return;
      }
      const data = await res.json();
      setAudit(data);
      setStatus(data.status);
      setExecutionDate(data.executionDate ? data.executionDate.substring(0, 10) : '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          executionDate: executionDate || null
        })
      });
      
      if (res.ok) fetchAudit();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/audits/${id}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFinding)
      });
      if (res.ok) {
        setIsFindingModalOpen(false);
        setNewFinding({ description: '', classification: 'Major Non-Conformance' });
        fetchAudit();
      }
    } catch (error) {
      console.error('Failed to add finding', error);
    }
  };

  const handleRaiseCapa = async (findingId: number) => {
    if (!window.confirm('Are you sure you want to escalate this finding into a CAPA report?')) return;
    try {
      const res = await fetch(`/api/audits/findings/${findingId}/capa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedById: user?.id })
      });
      if (res.ok) {
        alert('CAPA Report successfully generated!');
        fetchAudit();
      }
    } catch (error) {
      console.error('Failed to raise CAPA', error);
      alert('Failed to raise CAPA.');
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  if (!audit) return null;

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/audits')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>{audit.auditNumber}</h1>
            <span className={`status-badge ${status === 'Completed' ? 'approved' : status === 'Planned' ? 'draft' : status === 'Cancelled' ? 'obsolete' : 'in-review'}`}>{status}</span>
          </div>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '1.1rem' }}>{audit.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline no-print" onClick={() => window.print()}>
            <Printer size={18} style={{ marginRight: '8px' }} />
            Export PDF
          </button>
          <button className="btn btn-primary no-print" onClick={handleSave} disabled={saving}>
            <Save size={18} style={{ marginRight: '8px' }} />
            {saving ? 'Saving...' : 'Save Audit Form'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Scope */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <FileText size={18} color="#475569" /> Audit Scope & Objectives
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                {audit.scope}
              </div>
            </div>
          </div>

          {/* Section 2: Findings */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#475569" /> Audit Findings
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setIsFindingModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Add Finding
              </button>
            </div>
            <div style={{ padding: '0' }}>
              {audit.findings.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No findings recorded yet.</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {audit.findings.map(finding => {
                    const isNC = finding.classification.includes('Non-Conformance');
                    return (
                      <li key={finding.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <span className={`status-badge ${isNC ? 'draft' : 'in-review'}`}>{finding.classification}</span>
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{new Date(finding.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ margin: '0 0 1rem 0', color: '#334155', whiteSpace: 'pre-wrap' }}>{finding.description}</p>
                        
                        <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {finding.capaReport ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={16} color="#10b981" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>Linked CAPA: {finding.capaReport.reportNumber}</span>
                                <span className={`status-badge ${finding.capaReport.status === 'Closed' ? 'approved' : 'warning'}`} style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>{finding.capaReport.status}</span>
                              </div>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => navigate(`/capa/${finding.capaReport?.id}`)}>View CAPA</button>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                {isNC ? 'Non-conformances require a Corrective Action Plan.' : 'No CAPA required for this finding.'}
                              </div>
                              {isNC && (
                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleRaiseCapa(finding.id)}>
                                  Raise CAPA
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', color: '#0f172a' }}>Execution</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Audit Status</label>
              <select className="form-input" style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Execution Date</label>
              <input 
                type="date" 
                className="form-input" 
                style={{ width: '100%' }} 
                value={executionDate} 
                onChange={e => setExecutionDate(e.target.value)} 
              />
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <Calendar size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned Date</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{new Date(audit.plannedDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <User size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lead Auditor</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{audit.auditor?.name || 'TBA'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <User size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditee (Dept)</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{audit.auditee?.name || 'TBA'}</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Add Finding Modal */}
      {isFindingModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFindingModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus color="#0f172a" /> Add Audit Finding
            </h2>
            <form onSubmit={handleAddFinding}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Classification</label>
                <select className="form-input" style={{ width: '100%' }} value={newFinding.classification} onChange={e => setNewFinding({...newFinding, classification: e.target.value})}>
                  <option>Major Non-Conformance</option>
                  <option>Minor Non-Conformance</option>
                  <option>Opportunity for Improvement</option>
                  <option>Observation</option>
                </select>
                <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem' }}>Non-conformances can be automatically escalated to CAPA after saving.</small>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Finding Description</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '120px', resize: 'vertical' }} value={newFinding.description} onChange={e => setNewFinding({...newFinding, description: e.target.value})} placeholder="Describe exactly what was found and which ISO clause it violates..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFindingModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Finding</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditDetails;
