import React, { useState, useEffect } from 'react';
import { Globe, Users, Plus, Building } from 'lucide-react';


interface OrgIssue {
  id: number;
  issueNumber: string;
  title: string;
  type: string;
  factor: string;
  description: string;
  impact: string;
  status: string;
  owner?: { id: number; name: string };
}

interface InterestedParty {
  id: number;
  partyNumber: string;
  name: string;
  type: string;
  needsAndExpectations: string;
  complianceObligation: boolean;
  status: string;
  owner?: { id: number; name: string };
}

const OrganizationContext: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'issues' | 'parties'>('issues');
  
  const [issues, setIssues] = useState<OrgIssue[]>([]);
  const [parties, setParties] = useState<InterestedParty[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);

  // New Issue Form
  const [iTitle, setITitle] = useState('');
  const [iType, setIType] = useState('Internal');
  const [iFactor, setIFactor] = useState('Political');
  const [iDescription, setIDescription] = useState('');
  const [iImpact, setIImpact] = useState('Risk');

  // New Party Form
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState('External');
  const [pNeeds, setPNeeds] = useState('');
  const [pCompliance, setPCompliance] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const resIssues = await fetch('/api/context/issues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resIssues.ok) {
        const data = await resIssues.json();
        setIssues(data);
      }

      const resParties = await fetch('/api/context/parties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resParties.ok) {
        const data = await resParties.json();
        setParties(data);
      }
    } catch (error) {
      console.error('Failed to fetch org context data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const response = await fetch('/api/context/issues', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: iTitle,
          type: iType,
          factor: iFactor,
          description: iDescription,
          impact: iImpact,
          ownerId: user?.id
        })
      });

      if (response.ok) {
        setIsIssueModalOpen(false);
        setITitle('');
        setIDescription('');
        fetchData();
      }
    } catch (error) {
      console.error('Error creating issue', error);
    }
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const response = await fetch('/api/context/parties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: pName,
          type: pType,
          needsAndExpectations: pNeeds,
          complianceObligation: pCompliance,
          ownerId: user?.id
        })
      });

      if (response.ok) {
        setIsPartyModalOpen(false);
        setPName('');
        setPNeeds('');
        setPCompliance(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating party', error);
    }
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe color="#bb0a0a" size={28} />
            Context of the Organization
          </h1>
          <p style={{ color: '#64748b' }}>Manage Internal/External Issues and Interested Parties (ISO Clauses 4.1 & 4.2).</p>
        </div>
        <div>
          {activeTab === 'issues' ? (
            <button className="btn btn-primary" onClick={() => setIsIssueModalOpen(true)}>
              <Plus size={18} style={{ marginRight: '8px' }} /> Log Issue
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setIsPartyModalOpen(true)}>
              <Plus size={18} style={{ marginRight: '8px' }} /> Add Party
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('issues')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'issues' ? '3px solid #bb0a0a' : '3px solid transparent',
            color: activeTab === 'issues' ? '#bb0a0a' : '#64748b',
            fontWeight: activeTab === 'issues' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Building size={18} /> Internal / External Issues
        </button>
        <button 
          onClick={() => setActiveTab('parties')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'parties' ? '3px solid #bb0a0a' : '3px solid transparent',
            color: activeTab === 'parties' ? '#bb0a0a' : '#64748b',
            fontWeight: activeTab === 'parties' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} /> Interested Parties
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading context data...</div>
      ) : (
        <>
          {activeTab === 'issues' && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Title</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Factor</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Impact</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No internal/external issues logged yet.</td>
                    </tr>
                  ) : (
                    issues.map(issue => (
                      <tr key={issue.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="hover-bg">
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{issue.issueNumber}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>{issue.title}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: issue.type === 'Internal' ? '#eff6ff' : '#f0fdf4', color: issue.type === 'Internal' ? '#3b82f6' : '#22c55e' }}>
                            {issue.type}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{issue.factor}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                           <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: issue.impact === 'Risk' ? '#fef2f2' : issue.impact === 'Opportunity' ? '#f0fdf4' : '#fffbeb', color: issue.impact === 'Risk' ? '#ef4444' : issue.impact === 'Opportunity' ? '#22c55e' : '#f59e0b' }}>
                            {issue.impact}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{issue.owner?.name || 'Unassigned'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'parties' && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Needs & Expectations</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Compliance Obligation</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No interested parties logged yet.</td>
                    </tr>
                  ) : (
                    parties.map(party => (
                      <tr key={party.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="hover-bg">
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{party.partyNumber}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{party.name}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: party.type === 'Internal' ? '#eff6ff' : '#f0fdf4', color: party.type === 'Internal' ? '#3b82f6' : '#22c55e' }}>
                            {party.type}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>
                          <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {party.needsAndExpectations}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          {party.complianceObligation ? (
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#fef2f2', color: '#ef4444' }}>Yes (Mandatory)</span>
                          ) : (
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#64748b' }}>No (Voluntary)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal for Issue */}
      {isIssueModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIssueModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Log Internal/External Issue</h2>
            <form onSubmit={handleCreateIssue}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Issue Title</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={iTitle} onChange={e => setITitle(e.target.value)} placeholder="e.g., Rising Material Costs" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={iType} onChange={e => setIType(e.target.value)}>
                    <option>Internal</option>
                    <option>External</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Impact</label>
                  <select className="form-input" style={{ width: '100%' }} value={iImpact} onChange={e => setIImpact(e.target.value)}>
                    <option>Risk</option>
                    <option>Opportunity</option>
                    <option>Both</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>PESTLE Factor</label>
                <select className="form-input" style={{ width: '100%' }} value={iFactor} onChange={e => setIFactor(e.target.value)}>
                  <option>Political</option>
                  <option>Economic</option>
                  <option>Social</option>
                  <option>Technological</option>
                  <option>Legal</option>
                  <option>Environmental</option>
                  <option>Culture / People</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={iDescription} onChange={e => setIDescription(e.target.value)} placeholder="Describe how this affects the IMS..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsIssueModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Interested Party */}
      {isPartyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPartyModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Add Interested Party</h2>
            <form onSubmit={handleCreateParty}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Party Name</label>
                  <input required type="text" className="form-input" style={{ width: '100%' }} value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g., Local Government / EPA" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={pType} onChange={e => setPType(e.target.value)}>
                    <option>Internal</option>
                    <option>External</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Needs & Expectations</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={pNeeds} onChange={e => setPNeeds(e.target.value)} placeholder="What do they expect from our organization?" />
              </div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="compliance" checked={pCompliance} onChange={e => setPCompliance(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
                <label htmlFor="compliance" style={{ fontWeight: 500 }}>Is this a Compliance Obligation? (Legally/Contractually required)</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPartyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Party</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg:hover { background-color: #f8fafc; cursor: default; }
      `}</style>
    </div>
  );
};

export default OrganizationContext;
