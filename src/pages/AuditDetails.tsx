import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  AlertTriangle, 
  User, 
  Calendar, 
  FileText, 
  Plus, 
  Printer, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Paperclip, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AuditFinding {
  id: number;
  findingNumber: string;
  clauseRef?: string | null;
  description: string;
  type: string;
  severity: string;
  status: string;
  capaId?: number | null;
  createdAt: string;
}

interface EvidenceAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
}

interface InterviewQuestion {
  id: number;
  clauseNumber: string;
  clauseTitle: string;
  questionText: string;
  guidance: string | null;
  response: string | null;
  attachments: EvidenceAttachment[];
}

interface AuditInterview {
  id: number;
  token: string;
  intervieweeName: string;
  intervieweeEmail: string;
  projects: string | null;
  isoSections: string;
  status: string;
  submittedAt: string | null;
  questions: InterviewQuestion[];
}

interface Audit {
  id: number;
  auditNumber: string;
  title: string;
  type: string;
  standard: string | null;
  scope: string;
  status: string;
  summary: string | null;
  complianceScore: number | null;
  reportPdfUrl: string | null;
  libraryItemId: number | null;
  plannedDate: string;
  executionDate: string | null;
  auditorId: number | null;
  auditor: { name: string; email?: string } | null;
  auditees: { id: number; name: string; email?: string }[];
  findings: AuditFinding[];
  interviews: AuditInterview[];
}

const AuditDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expandedInterviewId, setExpandedInterviewId] = useState<number | null>(null);
  
  // Editable Fields
  const [status, setStatus] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  
  // New Finding State
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [newFinding, setNewFinding] = useState({ description: '', classification: 'Major Non-Conformance', clauseRef: 'Clause 8.1' });

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

  const handleCompileReport = async () => {
    if (!audit) return;
    if (!window.confirm('Run AI Compliance Evaluation and generate the official ISO 9001 Audit Report PDF? This will evaluate interview responses, update findings, and save the report to both /audits and the Corporate Library (/library).')) {
      return;
    }

    try {
      setCompiling(true);
      const res = await fetch(`/api/audits/${audit.id}/compile-report`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to compile report');
      }

      await fetchAudit();
      alert('Official ISO Audit Report successfully compiled and published to both Audits and Library!');
    } catch (err: any) {
      alert('Error compiling report: ' + err.message);
    } finally {
      setCompiling(false);
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
        setNewFinding({ description: '', classification: 'Major Non-Conformance', clauseRef: 'Clause 8.1' });
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

  const copyInterviewLink = (token: string) => {
    const url = `${window.location.origin}/audit-interview/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Audit Details...</div>;
  if (!audit) return null;

  const totalInterviews = audit.interviews?.length || 0;
  const submittedInterviews = audit.interviews?.filter(i => i.status === 'SUBMITTED' || i.status === 'EVALUATED').length || 0;

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
            <span style={{ backgroundColor: '#fee2e2', color: '#cc0000', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
              {audit.standard || 'ISO 9001:2015'}
            </span>
          </div>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '1.1rem' }}>{audit.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {audit.reportPdfUrl && (
            <a 
              href={audit.reportPdfUrl} 
              target="_blank" 
              rel="noreferrer" 
              download
              className="btn" 
              style={{ backgroundColor: '#cc0000', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600 }}
            >
              <Download size={16} /> Download Official PDF
            </a>
          )}
          <button className="btn btn-outline no-print" onClick={() => window.print()}>
            <Printer size={18} style={{ marginRight: '8px' }} />
            Print View
          </button>
          <button className="btn btn-primary no-print" onClick={handleSave} disabled={saving}>
            <Save size={18} style={{ marginRight: '8px' }} />
            {saving ? 'Saving...' : 'Save Audit Form'}
          </button>
        </div>
      </div>

      {/* Official Audit Report Card (if generated) */}
      {audit.reportPdfUrl && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '2px solid #bbf7d0',
          padding: '24px',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={32} color="#16a34a" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Official ISO 9001 Audit Report Generated
                </h3>
                {audit.complianceScore && (
                  <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                    {audit.complianceScore}% Compliance Rating
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px', maxWidth: '650px' }}>
                {audit.summary || 'Compliant multi-page audit report generated and cataloged in both the Audits system and Corporate Library.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/library')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={15} /> View in Library
            </button>
            <a
              href={audit.reportPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ backgroundColor: '#cc0000', color: '#ffffff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '0.6rem 1.2rem', borderRadius: '8px' }}
            >
              <Download size={15} /> Open PDF
            </a>
          </div>
        </div>
      )}

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

          {/* Section 2: AI Interviews & Evidence Register */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#cc0000" />
                <span>Auditee Interviews & Evidentiary Documents ({submittedInterviews}/{totalInterviews} Submitted)</span>
              </div>
              <button
                onClick={handleCompileReport}
                disabled={compiling}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#cc0000',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: compiling ? 'not-allowed' : 'pointer'
                }}
              >
                <Sparkles size={14} />
                {compiling ? 'AI Compiling Report...' : 'Compile ISO Audit Report'}
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {(!audit.interviews || audit.interviews.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No interviews configured for this audit yet. You can launch an interview campaign from the AI Assistant or Audits Dashboard.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {audit.interviews.map(inv => {
                    const isExpanded = expandedInterviewId === inv.id;
                    const answeredCount = inv.questions.filter(q => q.response && q.response.trim().length > 0).length;
                    const totalAtts = inv.questions.reduce((acc, q) => acc + q.attachments.length, 0);

                    return (
                      <div key={inv.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{
                          padding: '14px 18px',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{inv.intervieweeName}</span>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>({inv.intervieweeEmail})</span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: inv.status === 'SUBMITTED' ? '#dcfce7' : '#f1f5f9',
                                color: inv.status === 'SUBMITTED' ? '#166534' : '#475569'
                              }}>
                                {inv.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                              <strong>Projects:</strong> {inv.projects || 'General'} | <strong>Clauses:</strong> <span style={{ color: '#cc0000', fontWeight: 600 }}>{inv.isoSections}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => copyInterviewLink(inv.token)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff', color: '#0f172a', fontSize: '12px', fontWeight: 500, cursor: 'pointer'
                              }}
                              title="Copy secure link for interviewee"
                            >
                              {copiedToken === inv.token ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                              {copiedToken === inv.token ? 'Copied Link!' : 'Copy Link'}
                            </button>

                            <button
                              onClick={() => setExpandedInterviewId(isExpanded ? null : inv.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff', color: '#475569', fontSize: '12px', cursor: 'pointer'
                              }}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {answeredCount}/{inv.questions.length} Answers ({totalAtts} Evidence)
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div style={{ padding: '16px 18px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              {inv.questions.map(q => (
                                <div key={q.id} style={{ padding: '12px', backgroundColor: '#fcfcfc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#cc0000', padding: '2px 6px', borderRadius: '4px' }}>
                                      {q.clauseNumber}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{q.clauseTitle}</span>
                                  </div>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>{q.questionText}</p>
                                  
                                  <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px', fontSize: '13px', color: q.response ? '#0f172a' : '#94a3b8', fontStyle: q.response ? 'normal' : 'italic' }}>
                                    {q.response || 'No response recorded yet.'}
                                  </div>

                                  {q.attachments.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                      {q.attachments.map(att => (
                                        <a
                                          key={att.id}
                                          href={att.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            padding: '4px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9',
                                            color: '#cc0000', fontSize: '11.5px', textDecoration: 'none', fontWeight: 500
                                          }}
                                        >
                                          <Paperclip size={12} /> {att.fileName}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Findings */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#475569" /> Audit Findings ({audit.findings.length})
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setIsFindingModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Add Finding
              </button>
            </div>
            <div style={{ padding: '0' }}>
              {audit.findings.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No findings recorded yet. Click "Compile ISO Audit Report" to auto-evaluate or add manual findings above.</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {audit.findings.map(finding => {
                    const isNC = finding.type?.includes('NC') || finding.type?.includes('Non-Conformance');
                    return (
                      <li key={finding.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`status-badge ${isNC ? 'draft' : 'in-review'}`}>{finding.type}</span>
                            {finding.clauseRef && (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#cc0000', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                                {finding.clauseRef}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{new Date(finding.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ margin: '0 0 1rem 0', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{finding.description}</p>
                        
                        <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            Severity: <strong>{finding.severity}</strong> | Status: <strong>{finding.status}</strong>
                          </div>
                          {isNC && !finding.capaId && (
                            <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleRaiseCapa(finding.id)}>
                              Raise CAPA
                            </button>
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
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{audit.auditor?.name || 'Lead Auditor'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <User size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditee Personnel</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>
                    {audit.interviews?.length > 0 
                      ? audit.interviews.map(i => i.intervieweeName).join(', ') 
                      : (audit.auditees?.length > 0 ? audit.auditees.map(a => a.name).join(', ') : 'TBA')}
                  </div>
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>ISO Clause Reference</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  value={newFinding.clauseRef} 
                  onChange={e => setNewFinding({ ...newFinding, clauseRef: e.target.value })} 
                  placeholder="e.g. Clause 8.3 Design & Development" 
                />
              </div>

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
