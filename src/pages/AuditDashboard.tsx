import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';

interface Audit {
  id: number;
  auditNumber: string;
  title: string;
  type: string;
  status: string;
  plannedDate: string;
  auditor: { name: string } | null;
  auditee: { name: string } | null;
  _count: { findings: number };
}

interface UserData {
  id: number;
  name: string;
}

const AuditDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list'|'schedule'>('list');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // New Audit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAudit, setNewAudit] = useState({
    title: '',
    type: 'Internal',
    scope: '',
    plannedDate: '',
    auditorId: '',
    auditeeId: ''
  });

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
        setIsModalOpen(false);
        setNewAudit({ title: '', type: 'Internal', scope: '', plannedDate: '', auditorId: '', auditeeId: '' });
        fetchAudits();
      }
    } catch (error) {
      console.error('Failed to schedule audit', error);
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Internal Audits Management</h1>
          <p style={{ color: '#64748b' }}>Schedule and track ISO internal audits and inspections.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Schedule Audit
        </button>
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
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : (
            <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Audit No.</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Planned Date</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Auditor</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Auditee (Dept)</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Findings</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No audits scheduled yet.</td>
                  </tr>
                ) : (
                  filteredAudits.map(audit => (
                    <tr 
                      key={audit.id} 
                      style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                      onClick={() => navigate(`/audits/${audit.id}`)}
                      className="hover-bg"
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{audit.auditNumber}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{audit.title}</td>
                      <td style={{ padding: '1rem 1.5rem' }}><span className={getStatusBadgeClass(audit.status)}>{audit.status}</span></td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(audit.plannedDate).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{audit.auditor?.name || 'TBA'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{audit.auditee?.name || 'TBA'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: 600 }}>
                        {audit._count.findings}
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
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>{currentYear} Internal Audit Programme</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setCurrentYear(y => y - 1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>&larr;</button>
              <button onClick={() => setCurrentYear(new Date().getFullYear())} className="btn btn-secondary">Current Year</button>
              <button onClick={() => setCurrentYear(y => y + 1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>&rarr;</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const monthName = new Date(currentYear, i, 1).toLocaleString('default', { month: 'long' });
              const monthAudits = audits.filter(a => {
                const d = new Date(a.plannedDate);
                return d.getFullYear() === currentYear && d.getMonth() === i;
              });
              
              return (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#334155', fontSize: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>{monthName}</h3>
                  {monthAudits.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, fontStyle: 'italic' }}>No audits planned.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {monthAudits.map(a => (
                        <div key={a.id} onClick={() => navigate(`/audits/${a.id}`)} style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', borderLeft: `4px solid ${a.status === 'Completed' ? '#22c55e' : a.status === 'In Progress' ? '#f59e0b' : '#3b82f6'}`, cursor: 'pointer' }} className="hover-bg">
                          <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{a.auditNumber}</p>
                          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#475569', lineHeight: 1.3 }}>{a.title}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(a.plannedDate).toLocaleDateString()}</span>
                            <span className={getStatusBadgeClass(a.status)} style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>{a.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Audit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText color="#0f172a" /> Schedule New Audit
            </h2>
            <form onSubmit={handleCreateAudit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Audit Title</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newAudit.title} onChange={e => setNewAudit({...newAudit, title: e.target.value})} placeholder="e.g., Q3 HR Department Internal Audit" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={newAudit.type} onChange={e => setNewAudit({...newAudit, type: e.target.value})}>
                    <option>Internal</option>
                    <option>External / Certification</option>
                    <option>Management Review</option>
                    <option>Supplier Audit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Planned Date</label>
                  <input required type="date" className="form-input" style={{ width: '100%' }} value={newAudit.plannedDate} onChange={e => setNewAudit({...newAudit, plannedDate: e.target.value})} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Lead Auditor</label>
                  <select className="form-input" style={{ width: '100%' }} value={newAudit.auditorId} onChange={e => setNewAudit({...newAudit, auditorId: e.target.value})}>
                    <option value="">-- TBA --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Auditee (Dept Rep)</label>
                  <select className="form-input" style={{ width: '100%' }} value={newAudit.auditeeId} onChange={e => setNewAudit({...newAudit, auditeeId: e.target.value})}>
                    <option value="">-- TBA --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
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
