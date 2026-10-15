import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, CheckCircle, Clock, Sparkles, Trash2, ShieldCheck } from 'lucide-react';

interface Audit {
  id: number;
  auditNumber: string;
  title: string;
  type: string;
  status: string;
  standard?: string | null;
  complianceScore?: number | null;
  reportPdfUrl?: string | null;
  plannedDate: string;
  auditor: { name: string } | null;
  auditees: { name: string }[];
  _count: { findings: number; interviews?: number };
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

interface CampaignInterviewee {
  name: string;
  email: string;
  isoSections: string;
  projects: string;
  userId?: number;
}

const ISO_CLAUSES_LIST = [
  'Clause 4 (Context)',
  'Clause 5 (Leadership)',
  'Clause 6 (Planning)',
  'Clause 7 (Support)',
  'Clause 8 (Operation)',
  'Clause 9 (Performance)',
  'Clause 10 (Improvement)'
];

const AuditDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list'|'schedule'>('list');
  const [currentYear] = useState(new Date().getFullYear());
  
  // Standard New Audit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditeeDropdownOpen, setIsAuditeeDropdownOpen] = useState(false);
  const [newAudit, setNewAudit] = useState({
    title: '',
    type: 'Internal',
    scope: '',
    plannedDate: '',
    auditorId: '',
    auditeeIds: [] as string[]
  });

  // AI ISO Audit Campaign Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('Annual ISO 9001:2015 Quality Management Internal Audit');
  const [campaignStandard, setCampaignStandard] = useState('ISO 9001:2015');
  const [campaignScope, setCampaignScope] = useState('Corporate and project quality management system evaluation across engineering design, site operations, and resource controls.');
  const [campaignPlannedDate, setCampaignPlannedDate] = useState(new Date().toISOString().substring(0, 10));
  const [campaignAuditorId, setCampaignAuditorId] = useState('');
  const [campaignInterviewees, setCampaignInterviewees] = useState<CampaignInterviewee[]>([
    { name: '', email: '', isoSections: 'Clause 5 (Leadership), Clause 6 (Planning)', projects: 'All Active Projects' }
  ]);

  useEffect(() => {
    fetchAudits();
    fetchUsers();
  }, []);

  const fetchAudits = async () => {
    try {
      const res = await fetch('/api/audits');
      const data = await res.json();
      setAudits(data);
    } catch (error) {
      console.error('Failed to fetch audits', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAudit)
      });
      if (res.ok) {
        setNewAudit({ title: '', type: 'Internal', scope: '', plannedDate: '', auditorId: '', auditeeIds: [] });
        setIsModalOpen(false);
        fetchAudits();
      }
    } catch (error) {
      console.error('Failed to schedule audit', error);
    }
  };

  const handleAddIntervieweeRow = () => {
    setCampaignInterviewees(prev => [
      ...prev,
      { name: '', email: '', isoSections: 'Clause 8 (Operation)', projects: '' }
    ]);
  };

  const handleRemoveIntervieweeRow = (index: number) => {
    setCampaignInterviewees(prev => prev.filter((_, i) => i !== index));
  };

  const handleIntervieweeUserSelect = (index: number, userId: string) => {
    const selected = users.find(u => u.id.toString() === userId);
    if (!selected) return;

    setCampaignInterviewees(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        userId: selected.id,
        name: selected.name,
        email: selected.email
      };
      return updated;
    });
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (campaignInterviewees.length === 0 || !campaignInterviewees.some(i => i.name && i.email)) {
      alert('Please specify at least one interviewee with a valid name and email.');
      return;
    }

    try {
      setCampaignLoading(true);
      const res = await fetch('/api/audits/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignTitle,
          standard: campaignStandard,
          scope: campaignScope,
          plannedDate: campaignPlannedDate,
          auditorId: campaignAuditorId || undefined,
          interviewees: campaignInterviewees.filter(i => i.name && i.email)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create audit campaign');
      }

      const result = await res.json();
      setIsCampaignModalOpen(false);
      await fetchAudits();
      navigate(`/audits/${result.audit.id}`);
    } catch (err: any) {
      alert('Error launching campaign: ' + err.message);
    } finally {
      setCampaignLoading(false);
    }
  };

  const filteredAudits = audits.filter(a => 
    a.auditNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'Planned': return 'status-badge draft';
      case 'In Progress': return 'status-badge in-review';
      case 'Completed': return 'status-badge approved';
      case 'Cancelled': return 'status-badge obsolete';
      default: return 'status-badge';
    }
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Internal Audits Management</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Schedule and autonomously conduct ISO internal audits with evidentiary questionnaires.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={() => navigate('/iso-compliance-matrix')}
            style={{ 
              backgroundColor: '#1e293b', 
              color: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              fontWeight: 600,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={18} />
            ISO Records Matrix
          </button>
          <button 
            className="btn" 
            onClick={() => setIsCampaignModalOpen(true)}
            style={{ 
              backgroundColor: '#cc0000', 
              color: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(204, 0, 0, 0.2)',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={18} />
            Launch AI ISO Audit Campaign
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            Schedule Audit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}><Calendar size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Planned Audits</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {audits.filter(a => a.status === 'Planned').length}
            </h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#f59e0b' }}><Clock size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>In Progress</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {audits.filter(a => a.status === 'In Progress').length}
            </h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '50%', color: '#22c55e' }}><CheckCircle size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Completed</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {audits.filter(a => a.status === 'Completed').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('list')}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'list' ? '#1e293b' : 'transparent', color: activeTab === 'list' ? 'white' : '#64748b', fontWeight: 500, cursor: 'pointer' }}
        >
          Audit List
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'schedule' ? '#1e293b' : 'transparent', color: activeTab === 'schedule' ? 'white' : '#64748b', fontWeight: 500, cursor: 'pointer' }}
        >
          Annual Schedule
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'list' ? (
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by Audit Number or Title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading audits...</div>
          ) : (
            <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Audit No.</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Standard</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Planned Date</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Auditor</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Auditees</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Findings</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No audits scheduled yet.</td>
                  </tr>
                ) : (
                  filteredAudits.map(audit => (
                    <tr 
                      key={audit.id} 
                      style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                      onClick={() => navigate(`/audits/${audit.id}`)}
                      className="hover-bg"
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#cc0000' }}>{audit.auditNumber}</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{audit.title}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                          {audit.standard || 'ISO 9001:2015'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}><span className={getStatusBadgeClass(audit.status)}>{audit.status}</span></td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(audit.plannedDate).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{audit.auditor?.name || 'TBA'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>
                        {audit.auditees?.length > 0 ? audit.auditees.map(a => a.name).join(', ') : 'TBA'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: 600 }}>
                        {audit._count?.findings || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      ) : (
        /* Annual Schedule view */
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          <h3>Annual Audit Schedule for {currentYear}</h3>
          <p>Audits are distributed across quarters to ensure continual QMS conformance.</p>
        </div>
      )}

      {/* AI ISO Audit Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCampaignModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} color="#cc0000" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>Launch Autonomous ISO Audit Campaign</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Specify interviewees, designated projects, and assigned ISO clauses. The AI will create links and questions.</p>
              </div>
            </div>

            <form onSubmit={handleLaunchCampaign}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '13px' }}>Audit Campaign Title</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    value={campaignTitle} 
                    onChange={e => setCampaignTitle(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '13px' }}>Standard</label>
                  <select 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    value={campaignStandard} 
                    onChange={e => setCampaignStandard(e.target.value)}
                  >
                    <option value="ISO 9001:2015">ISO 9001:2015</option>
                    <option value="ISO 9001:2018">ISO 9001:2018</option>
                    <option value="ISO 14001:2015">ISO 14001:2015 (HSE)</option>
                    <option value="ISO 45001:2018">ISO 45001:2018 (Safety)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '13px' }}>Planned Audit Date</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    value={campaignPlannedDate} 
                    onChange={e => setCampaignPlannedDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '13px' }}>Lead Quality Auditor</label>
                  <select 
                    className="form-input" 
                    style={{ width: '100%' }} 
                    value={campaignAuditorId} 
                    onChange={e => setCampaignAuditorId(e.target.value)}
                  >
                    <option value="">-- AI Auditor / Select Auditor --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '13px' }}>Audit Scope & Objectives</label>
                <textarea 
                  rows={2} 
                  className="form-input" 
                  style={{ width: '100%', resize: 'vertical' }} 
                  value={campaignScope} 
                  onChange={e => setCampaignScope(e.target.value)} 
                />
              </div>

              {/* Interviewees Section */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                    Personnel to Interview ({campaignInterviewees.length})
                  </span>
                  <button 
                    type="button" 
                    onClick={handleAddIntervieweeRow}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#cc0000', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    <Plus size={16} /> Add Another Interviewee
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {campaignInterviewees.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Interviewee #{idx + 1}</span>
                        {campaignInterviewees.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveIntervieweeRow(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Select User or Type Name</label>
                          <select 
                            className="form-input" 
                            style={{ width: '100%', fontSize: '13px' }}
                            value={item.userId || ''}
                            onChange={e => handleIntervieweeUserSelect(idx, e.target.value)}
                          >
                            <option value="">-- Choose User or Custom --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Interviewee Full Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Ronald Kibuuka" 
                            className="form-input" 
                            style={{ width: '100%', fontSize: '13px' }} 
                            value={item.name} 
                            onChange={e => {
                              const val = e.target.value;
                              setCampaignInterviewees(prev => {
                                const copy = [...prev];
                                copy[idx].name = val;
                                return copy;
                              });
                            }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Email Address (for invitation)</label>
                          <input 
                            type="email" 
                            required 
                            placeholder="e.g. ronald@promeconsult.com" 
                            className="form-input" 
                            style={{ width: '100%', fontSize: '13px' }} 
                            value={item.email} 
                            onChange={e => {
                              const val = e.target.value;
                              setCampaignInterviewees(prev => {
                                const copy = [...prev];
                                copy[idx].email = val;
                                return copy;
                              });
                            }} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Designated Projects in Charge Of</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Kampala-Jinja Expressway, Water Works" 
                            className="form-input" 
                            style={{ width: '100%', fontSize: '13px' }} 
                            value={item.projects} 
                            onChange={e => {
                              const val = e.target.value;
                              setCampaignInterviewees(prev => {
                                const copy = [...prev];
                                copy[idx].projects = val;
                                return copy;
                              });
                            }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Assigned ISO Clauses</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Clause 5 (Leadership), Clause 8 (Operation)" 
                            className="form-input" 
                            style={{ width: '100%', fontSize: '13px' }} 
                            value={item.isoSections} 
                            onChange={e => {
                              const val = e.target.value;
                              setCampaignInterviewees(prev => {
                                const copy = [...prev];
                                copy[idx].isoSections = val;
                                return copy;
                              });
                            }} 
                          />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {ISO_CLAUSES_LIST.map(clause => (
                              <button
                                key={clause}
                                type="button"
                                onClick={() => {
                                  setCampaignInterviewees(prev => {
                                    const copy = [...prev];
                                    const curr = copy[idx].isoSections || '';
                                    if (curr.includes(clause)) {
                                      copy[idx].isoSections = curr.replace(clause, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
                                    } else {
                                      copy[idx].isoSections = curr ? `${curr}, ${clause}` : clause;
                                    }
                                    return copy;
                                  });
                                }}
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: (item.isoSections || '').includes(clause) ? '#fee2e2' : '#ffffff',
                                  color: (item.isoSections || '').includes(clause) ? '#cc0000' : '#475569',
                                  fontWeight: (item.isoSections || '').includes(clause) ? 700 : 500,
                                  cursor: 'pointer'
                                }}
                              >
                                {clause}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCampaignModalOpen(false)}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={campaignLoading}
                  style={{ 
                    backgroundColor: '#cc0000', 
                    color: '#ffffff', 
                    border: 'none', 
                    padding: '10px 24px', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    cursor: campaignLoading ? 'not-allowed' : 'pointer' 
                  }}
                >
                  <Sparkles size={16} />
                  {campaignLoading ? 'Creating Campaign...' : 'Launch AI Campaign & Send Links'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard Schedule Audit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus color="#0f172a" /> Schedule Standard Audit
            </h2>
            <form onSubmit={handleCreateAudit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Audit Title</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newAudit.title} onChange={e => setNewAudit({...newAudit, title: e.target.value})} placeholder="e.g. Q3 Internal QMS Audit" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={newAudit.type} onChange={e => setNewAudit({...newAudit, type: e.target.value})}>
                    <option>Internal</option>
                    <option>External</option>
                    <option>Management Review</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Planned Date</label>
                  <input required type="date" className="form-input" style={{ width: '100%' }} value={newAudit.plannedDate} onChange={e => setNewAudit({...newAudit, plannedDate: e.target.value})} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Auditor</label>
                <select className="form-input" style={{ width: '100%' }} value={newAudit.auditorId} onChange={e => setNewAudit({...newAudit, auditorId: e.target.value})}>
                  <option value="">-- Select Auditor --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Auditee(s)</label>
                <div style={{ position: 'relative' }}>
                  <div 
                    className="form-input" 
                    style={{ width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '42px' }} 
                    onClick={() => setIsAuditeeDropdownOpen(!isAuditeeDropdownOpen)}
                  >
                    <span style={{ color: newAudit.auditeeIds.length ? 'inherit' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {newAudit.auditeeIds.length > 0 
                        ? newAudit.auditeeIds.map(id => users.find(u => u.id.toString() === id)?.name).join(', ')
                        : '-- Select Auditees --'}
                    </span>
                    <span style={{ fontSize: '0.8rem' }}>▼</span>
                  </div>
                  {isAuditeeDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      {users.map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                          <input 
                            type="checkbox" 
                            checked={newAudit.auditeeIds.includes(u.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAudit({...newAudit, auditeeIds: [...newAudit.auditeeIds, u.id.toString()]});
                              } else {
                                setNewAudit({...newAudit, auditeeIds: newAudit.auditeeIds.filter(id => id !== u.id.toString())});
                              }
                            }}
                            style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          {u.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Audit Scope & Objectives</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} value={newAudit.scope} onChange={e => setNewAudit({...newAudit, scope: e.target.value})} placeholder="Describe what processes, departments, or ISO clauses are being audited..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
};

export default AuditDashboard;
