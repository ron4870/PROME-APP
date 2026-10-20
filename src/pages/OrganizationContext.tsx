import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Users, 
  Plus, 
  Building, 
  FileText, 
  Radio, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  RefreshCw, 
  Database,
  Search
} from 'lucide-react';

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

interface ContextFactorRecord {
  id: string;
  type: 'Internal' | 'External';
  factorCategory: string;
  context: string;
  aspectFromContext: string;
  impactToBusiness: string;
  mitigationAction: string;
  followUpAndReviewBy: string;
  followUpDate: string;
  followUpResults: string;
}

interface InterestedPartyRecord {
  id: string;
  category: 'External' | 'Internal';
  name: string;
  ipToCompany: 'High' | 'Medium' | 'Low';
  companyToIp: 'High' | 'Medium' | 'Low';
  prioritization: 'P1' | 'P2' | 'P3';
  actionToManageIp: string;
  followUpAndReviewBy: string;
  followUpDate: string;
  followUpResults: string;
}

interface CommunicationItem {
  id: string;
  type: 'Internal' | 'External';
  whatToCommunicate: string;
  byWhom: string;
  how: string;
  toWhom: string;
  when: string;
  evidence: string;
}

interface ScopeRecord {
  documentRef: string;
  revision: string;
  revisionDate: string;
  approvedBy: string;
  companyName: string;
  headOffice: string;
  contact: string;
  branchOffice: string;
  qualityPolicy: string;
  permissibleExclusions: string;
  riskRegisterRef: string;
  scopeStatement: string;
  subsidiarySpecialist: string;
  processes: Array<{ number: number; name: string; leadDivision: string }>;
  statutoryCertificates: Array<{ name: string; authority: string; reference: string; status: string }>;
}

interface ContinualImprovementRecord {
  sectionTitle: string;
  vision: string;
  mission: string;
  coreValues: string[];
  services: string[];
  strategy: string;
  registeredImprovements: Array<{ category: string; title: string; description: string; impact: string }>;
}

interface OfficialDocumentsResponse {
  contextFactors: ContextFactorRecord[];
  interestedParties: InterestedPartyRecord[];
  communicationMatrix: CommunicationItem[];
  scopeRecord: ScopeRecord;
  continualImprovement: ContinualImprovementRecord;
}

type TabType = 'context' | 'parties' | 'scope' | 'communication' | 'continual';

const OrganizationContext: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('context');
  
  // Database state
  const [dbIssues, setDbIssues] = useState<OrgIssue[]>([]);
  const [dbParties, setDbParties] = useState<InterestedParty[]>([]);
  
  // Official ISO records state
  const [officialData, setOfficialData] = useState<OfficialDocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [contextFilter, setContextFilter] = useState<'ALL' | 'Internal' | 'External'>('ALL');
  const [partyFilter, setPartyFilter] = useState<'ALL' | 'External' | 'Internal' | 'P1'>('ALL');
  const [commsFilter, setCommsFilter] = useState<'ALL' | 'Internal' | 'External'>('ALL');
  const [viewMode, setViewMode] = useState<'official' | 'custom'>('official');

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
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch official ISO records
      const resOfficial = await fetch('/api/context/official-documents', { headers });
      if (resOfficial.ok) {
        const data = await resOfficial.json();
        setOfficialData(data);
      }

      // Fetch custom database issues
      const resIssues = await fetch('/api/context/issues', { headers });
      if (resIssues.ok) {
        const data = await resIssues.json();
        setDbIssues(data);
      }

      // Fetch custom database parties
      const resParties = await fetch('/api/context/parties', { headers });
      if (resParties.ok) {
        const data = await resParties.json();
        setDbParties(data);
      }
    } catch (error) {
      console.error('Failed to fetch org context data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedOfficialData = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/context/seed-official', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(`✅ ${data.message || 'Seeded official ISO records successfully.'}`);
        fetchData();
      } else {
        setSeedMessage(`⚠️ ${data.error || 'Failed to seed records'}`);
      }
    } catch (err: any) {
      setSeedMessage(`❌ Error: ${err.message}`);
    } finally {
      setSeeding(false);
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

  // Filter context factors
  const filteredFactors = (officialData?.contextFactors || []).filter(item => {
    if (contextFilter !== 'ALL' && item.type !== contextFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.context.toLowerCase().includes(q) ||
        item.aspectFromContext.toLowerCase().includes(q) ||
        item.mitigationAction.toLowerCase().includes(q) ||
        item.factorCategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter interested parties
  const filteredParties = (officialData?.interestedParties || []).filter(item => {
    if (partyFilter === 'P1' && item.prioritization !== 'P1') return false;
    if (partyFilter !== 'ALL' && partyFilter !== 'P1' && item.category !== partyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.actionToManageIp.toLowerCase().includes(q) ||
        item.followUpAndReviewBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter communication items
  const filteredComms = (officialData?.communicationMatrix || []).filter(item => {
    if (commsFilter !== 'ALL' && item.type !== commsFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.whatToCommunicate.toLowerCase().includes(q) ||
        item.byWhom.toLowerCase().includes(q) ||
        item.toWhom.toLowerCase().includes(q) ||
        item.evidence.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="layout-container" style={{ padding: '2rem 1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div style={{ backgroundColor: '#fee2e2', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe color="#cc0000" size={24} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Organization Context & Mandatory ISO Records
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
            Official Approved Documentation under PROME QMS (Clauses 4.1, 4.2, 4.3, 7.4 & Section 10 Continual Improvement)
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSeedOfficialData}
            disabled={seeding}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
            title="Populate live database tables with approved ISO records"
          >
            <Database size={16} /> {seeding ? 'Syncing...' : 'Sync to Live DB'}
          </button>
          {activeTab === 'context' && (
            <button className="btn btn-primary" onClick={() => setIsIssueModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.55rem 1rem' }}>
              <Plus size={16} /> Log Custom Issue
            </button>
          )}
          {activeTab === 'parties' && (
            <button className="btn btn-primary" onClick={() => setIsPartyModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.55rem 1rem' }}>
              <Plus size={16} /> Add Custom Party
            </button>
          )}
        </div>
      </div>

      {seedMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: seedMessage.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${seedMessage.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, color: seedMessage.startsWith('✅') ? '#166534' : '#991b1b', marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{seedMessage}</span>
          <button onClick={() => setSeedMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* COMPLIANCE OVERVIEW BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Controlled Document</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>PROME-QSP-CSVM-18</div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> Approved Rev 05 (Jan 2023)
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Quality Policy</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#991b1b' }}>"DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME"</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Managing Director Approved</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Permissible Exclusions</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>NONE (Zero Exclusions)</div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} /> Design & Development Included
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Core QMS Processes</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>16 Core Processes</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Across PMO, PED, PDMD, AFD & CSVM</div>
        </div>
      </div>

      {/* 5 TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
        <button 
          onClick={() => { setActiveTab('context'); setSearchQuery(''); }}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'context' ? '3px solid #cc0000' : '3px solid transparent',
            color: activeTab === 'context' ? '#cc0000' : '#64748b',
            fontWeight: activeTab === 'context' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Building size={17} /> Clause 4.1: Context Factors ({officialData?.contextFactors.length || 12})
        </button>

        <button 
          onClick={() => { setActiveTab('parties'); setSearchQuery(''); }}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'parties' ? '3px solid #cc0000' : '3px solid transparent',
            color: activeTab === 'parties' ? '#cc0000' : '#64748b',
            fontWeight: activeTab === 'parties' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={17} /> Clause 4.2: Interested Parties ({officialData?.interestedParties.length || 10})
        </button>

        <button 
          onClick={() => { setActiveTab('scope'); setSearchQuery(''); }}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'scope' ? '3px solid #cc0000' : '3px solid transparent',
            color: activeTab === 'scope' ? '#cc0000' : '#64748b',
            fontWeight: activeTab === 'scope' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={17} /> Clause 4.3: QMS Scope & Processes
        </button>

        <button 
          onClick={() => { setActiveTab('communication'); setSearchQuery(''); }}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'communication' ? '3px solid #cc0000' : '3px solid transparent',
            color: activeTab === 'communication' ? '#cc0000' : '#64748b',
            fontWeight: activeTab === 'communication' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Radio size={17} /> Clause 7.4: Communication Matrix ({officialData?.communicationMatrix.length || 11})
        </button>

        <button 
          onClick={() => { setActiveTab('continual'); setSearchQuery(''); }}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'continual' ? '3px solid #cc0000' : '3px solid transparent',
            color: activeTab === 'continual' ? '#cc0000' : '#64748b',
            fontWeight: activeTab === 'continual' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={17} /> Clause 10.3: Continual Improvement
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: '#cc0000' }} />
          Loading approved ISO records and context data...
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: CLAUSE 4.1 CONTEXT FACTORS                       */}
          {/* ======================================================== */}
          {activeTab === 'context' && (
            <div>
              {/* Controls bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setContextFilter('ALL')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: contextFilter === 'ALL' ? '#0f172a' : '#fff', color: contextFilter === 'ALL' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    All Factors (12)
                  </button>
                  <button 
                    onClick={() => setContextFilter('Internal')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: contextFilter === 'Internal' ? '#2563eb' : '#fff', color: contextFilter === 'Internal' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    Internal Factors (7)
                  </button>
                  <button 
                    onClick={() => setContextFilter('External')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: contextFilter === 'External' ? '#16a34a' : '#fff', color: contextFilter === 'External' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    External Factors (5)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      placeholder="Search factors or actions..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '220px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => setViewMode('official')}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: 'none', backgroundColor: viewMode === 'official' ? '#cc0000' : '#f8fafc', color: viewMode === 'official' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Official Record (Rev 05)
                    </button>
                    <button 
                      onClick={() => setViewMode('custom')}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: 'none', backgroundColor: viewMode === 'custom' ? '#cc0000' : '#f8fafc', color: viewMode === 'custom' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 600 }}
                    >
                      DB Issues ({dbIssues.length})
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'official' ? (
                <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '100px' }}>Ref / Cat</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '220px' }}>Context of Organization</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Aspect from Context</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Impact to Business</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Mitigation Action</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '180px' }}>Follow Up & Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFactors.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-bg">
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: item.type === 'Internal' ? '#eff6ff' : '#f0fdf4', color: item.type === 'Internal' ? '#1d4ed8' : '#15803d', marginBottom: '4px' }}>
                              {item.type}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{item.factorCategory}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', fontWeight: 600, color: '#0f172a' }}>
                            {item.context}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#334155' }}>
                            {item.aspectFromContext}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#dc2626', fontSize: '0.84rem' }}>
                            {item.impactToBusiness}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#0f766e', fontWeight: 500, fontSize: '0.84rem' }}>
                            {item.mitigationAction}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.followUpAndReviewBy}</div>
                            <div style={{ color: '#64748b' }}>Target: {item.followUpDate}</div>
                            <div style={{ color: '#16a34a', marginTop: '4px', fontSize: '0.75rem' }}>✓ {item.followUpResults}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Official Document Reference: <strong>PROME-QSP-CSVM-01 (Rev 05)</strong></span>
                    <span>Clause 4.1 ISO 9001:2015 / ISO 9001:2018 Standard Compliance</span>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Title</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>PESTLE Factor</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Impact</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbIssues.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                            No custom database issues logged yet. Click "Sync to Live DB" to populate the approved records.
                          </td>
                        </tr>
                      ) : (
                        dbIssues.map(issue => (
                          <tr key={issue.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-bg">
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{issue.issueNumber}</td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{issue.title}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: issue.type === 'Internal' ? '#eff6ff' : '#f0fdf4', color: issue.type === 'Internal' ? '#2563eb' : '#16a34a' }}>
                                {issue.type}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{issue.factor}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: issue.impact === 'Risk' ? '#fef2f2' : issue.impact === 'Opportunity' ? '#f0fdf4' : '#fffbeb', color: issue.impact === 'Risk' ? '#ef4444' : issue.impact === 'Opportunity' ? '#22c55e' : '#f59e0b' }}>
                                {issue.impact}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{issue.owner?.name || 'Unassigned'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CLAUSE 4.2 INTERESTED PARTIES                    */}
          {/* ======================================================== */}
          {activeTab === 'parties' && (
            <div>
              {/* Controls bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setPartyFilter('ALL')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: partyFilter === 'ALL' ? '#0f172a' : '#fff', color: partyFilter === 'ALL' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    All Parties (10)
                  </button>
                  <button 
                    onClick={() => setPartyFilter('P1')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: partyFilter === 'P1' ? '#dc2626' : '#fff', color: partyFilter === 'P1' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    Priority P1 (Mandatory)
                  </button>
                  <button 
                    onClick={() => setPartyFilter('External')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: partyFilter === 'External' ? '#2563eb' : '#fff', color: partyFilter === 'External' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    External Stakeholders (7)
                  </button>
                  <button 
                    onClick={() => setPartyFilter('Internal')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: partyFilter === 'Internal' ? '#16a34a' : '#fff', color: partyFilter === 'Internal' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    Internal Stakeholders (3)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      placeholder="Search stakeholders..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '220px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => setViewMode('official')}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: 'none', backgroundColor: viewMode === 'official' ? '#cc0000' : '#f8fafc', color: viewMode === 'official' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Official Record (Rev 05)
                    </button>
                    <button 
                      onClick={() => setViewMode('custom')}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: 'none', backgroundColor: viewMode === 'custom' ? '#cc0000' : '#f8fafc', color: viewMode === 'custom' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 600 }}
                    >
                      DB Parties ({dbParties.length})
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'official' ? (
                <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '90px' }}>Priority</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '200px' }}>Interested Party</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '120px' }}>Influence</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Action to Manage Interested Party</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '190px' }}>Review & Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParties.map(party => (
                        <tr key={party.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-bg">
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              padding: '3px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              backgroundColor: party.prioritization === 'P1' ? '#fee2e2' : party.prioritization === 'P2' ? '#e0f2fe' : '#f1f5f9',
                              color: party.prioritization === 'P1' ? '#b91c1c' : party.prioritization === 'P2' ? '#0369a1' : '#475569'
                            }}>
                              {party.prioritization} {party.prioritization === 'P1' ? 'Mandatory' : ''}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>{party.category}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', fontWeight: 600, color: '#0f172a' }}>
                            {party.name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', fontSize: '0.78rem' }}>
                            <div style={{ color: '#475569' }}>IP→Co: <strong>{party.ipToCompany}</strong></div>
                            <div style={{ color: '#475569', marginTop: '2px' }}>Co→IP: <strong>{party.companyToIp}</strong></div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#334155', fontSize: '0.85rem', lineHeight: '1.45' }}>
                            {party.actionToManageIp}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{party.followUpAndReviewBy}</div>
                            <div style={{ color: '#64748b' }}>Target: {party.followUpDate}</div>
                            <div style={{ color: '#16a34a', marginTop: '4px', fontSize: '0.75rem' }}>✓ {party.followUpResults}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Official Document Reference: <strong>PROME-QSP-CSVM-21 (Rev 05)</strong></span>
                    <span>Clause 4.2 ISO 9001:2015 / ISO 9001:2018 Standard Compliance</span>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Needs & Expectations</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>Compliance Obligation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbParties.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                            No custom database parties logged yet. Click "Sync to Live DB" to populate the approved records.
                          </td>
                        </tr>
                      ) : (
                        dbParties.map(party => (
                          <tr key={party.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-bg">
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{party.partyNumber}</td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{party.name}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: party.type === 'Internal' ? '#eff6ff' : '#f0fdf4', color: party.type === 'Internal' ? '#2563eb' : '#16a34a' }}>
                                {party.type}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.84rem' }}>{party.needsAndExpectations}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              {party.complianceObligation ? (
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fee2e2', color: '#dc2626' }}>Yes (Mandatory)</span>
                              ) : (
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#64748b' }}>No (Voluntary)</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CLAUSE 4.3 & 4.4 QMS SCOPE & PROCESSES            */}
          {/* ======================================================== */}
          {activeTab === 'scope' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Quality Policy Hero Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)', 
                borderRadius: '12px', 
                padding: '2rem', 
                color: '#fff', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={22} color="#fde047" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fecaca' }}>
                      PROME CONSULTANTS LIMITED — QUALITY POLICY STATEMENT
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px' }}>
                    Ref: PROME-QSP-CSVM-18 (Rev 05)
                  </span>
                </div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.5rem 0 1rem 0', letterSpacing: '0.02em', color: '#fff' }}>
                  "{officialData?.scopeRecord.qualityPolicy || 'DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME'}"
                </h2>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#fee2e2', lineHeight: '1.6', maxWidth: '1000px' }}>
                  {officialData?.scopeRecord.scopeStatement}
                </p>
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#fecaca', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>Approved By: <strong>{officialData?.scopeRecord.approvedBy}</strong></span>
                  <span>Revision Date: <strong>{officialData?.scopeRecord.revisionDate}</strong></span>
                  <span>Head Office: <strong>{officialData?.scopeRecord.headOffice}</strong></span>
                </div>
              </div>

              {/* Exclusion & Scope Statements */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck color="#16a34a" size={18} /> Permissible Exclusions (Clause 4.3)
                  </h3>
                  <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                    <strong>{officialData?.scopeRecord.permissibleExclusions}</strong>
                  </p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
                    All ISO 9001:2015 clauses apply fully to PROME operations. Design and Development (Clause 8.3) is an essential core competency under the Planning & Engineering Division (PED).
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building color="#2563eb" size={18} /> Branch Offices & Specialist Subsidiaries
                  </h3>
                  <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}>
                    <div>• <strong>Branch Office:</strong> {officialData?.scopeRecord.branchOffice}</div>
                    <div style={{ marginTop: '4px' }}>• <strong>Affiliate Specialist:</strong> {officialData?.scopeRecord.subsidiarySpecialist}</div>
                    <div style={{ marginTop: '4px' }}>• <strong>Risk Register Ref:</strong> {officialData?.scopeRecord.riskRegisterRef}</div>
                  </div>
                </div>
              </div>

              {/* Statutory Compliance Certificates */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award color="#cc0000" size={18} /> Statutory & Regulatory Compliance Registrations
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {(officialData?.scopeRecord.statutoryCertificates || []).map((cert, idx) => (
                    <div key={idx} style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{cert.name}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                          ✓ {cert.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{cert.authority}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', fontFamily: 'monospace' }}>{cert.reference}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 16 Core QMS Processes Table */}
              <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      The 16 Core QMS Processes (Clause 4.4 Quality Management System & Its Processes)
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Aligned with PROME Quality Manual and Core Process Interaction Flowchart
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '20px' }}>
                    16 Approved Processes
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0' }}>
                  {(officialData?.scopeRecord.processes || []).map((proc) => (
                    <div 
                      key={proc.number} 
                      style={{ 
                        padding: '1rem 1.25rem', 
                        borderBottom: '1px solid #f1f5f9', 
                        borderRight: '1px solid #f1f5f9',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem' 
                      }}
                      className="hover-bg"
                    >
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        backgroundColor: '#fee2e2', 
                        color: '#991b1b', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}>
                        {proc.number}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.92rem' }}>{proc.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{proc.leadDivision}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CLAUSE 7.4 COMMUNICATION MATRIX                  */}
          {/* ======================================================== */}
          {activeTab === 'communication' && (
            <div>
              {/* Controls bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setCommsFilter('ALL')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: commsFilter === 'ALL' ? '#0f172a' : '#fff', color: commsFilter === 'ALL' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    All Communications ({officialData?.communicationMatrix.length || 11})
                  </button>
                  <button 
                    onClick={() => setCommsFilter('Internal')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: commsFilter === 'Internal' ? '#2563eb' : '#fff', color: commsFilter === 'Internal' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    Internal Communication (8)
                  </button>
                  <button 
                    onClick={() => setCommsFilter('External')}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, backgroundColor: commsFilter === 'External' ? '#16a34a' : '#fff', color: commsFilter === 'External' ? '#fff' : '#475569', cursor: 'pointer' }}
                  >
                    External Communication (3)
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search communication matrix..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '260px' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '90px' }}>Type</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '240px' }}>What to Communicate</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>By Whom</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>How (Medium)</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>To Whom (Target)</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>When (Frequency)</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, width: '200px' }}>Evidentiary Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComms.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-bg">
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            backgroundColor: item.type === 'Internal' ? '#eff6ff' : '#f0fdf4',
                            color: item.type === 'Internal' ? '#1d4ed8' : '#15803d'
                          }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', fontWeight: 600, color: '#0f172a' }}>
                          {item.whatToCommunicate}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#334155', fontWeight: 500 }}>
                          {item.byWhom}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#64748b' }}>
                          {item.how}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#0f172a' }}>
                          {item.toWhom}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#64748b', fontSize: '0.82rem' }}>
                          {item.when}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: '#0f766e', fontSize: '0.82rem', fontWeight: 500 }}>
                          {item.evidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Official Document Reference: <strong>PROME-QSR-AFD-20</strong></span>
                  <span>Clause 7.4 ISO 9001:2015 / ISO 9001:2018 Standard Compliance</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: SECTION 10 CONTINUAL IMPROVEMENT                 */}
          {/* ======================================================== */}
          {activeTab === 'continual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Vision, Mission, Values */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cc0000', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Corporate Vision</div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.5' }}>
                    "{officialData?.continualImprovement.vision}"
                  </p>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Corporate Mission</div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.5' }}>
                    "{officialData?.continualImprovement.mission}"
                  </p>
                </div>
              </div>

              {/* Core Values */}
              <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Corporate Core Values</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(officialData?.continualImprovement.coreValues || []).map((val, idx) => (
                    <span key={idx} style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: '0.85rem' }}>
                      ★ {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Registered Improvements Across Company */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp color="#16a34a" size={20} /> Registered Continual Improvements (Section 10)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                  {(officialData?.continualImprovement.registeredImprovements || []).map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                          {item.category} Improvement
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        {item.title}
                      </h4>
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.84rem', color: '#475569', lineHeight: '1.5', flex: 1 }}>
                        {item.description}
                      </p>
                      <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '0.78rem', color: '#166534', fontWeight: 500 }}>
                        <strong>Impact:</strong> {item.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal for Issue */}
      {isIssueModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIssueModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', fontSize: '1.3rem' }}>Log Internal/External Issue (Clause 4.1)</h2>
            <form onSubmit={handleCreateIssue}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Issue Title / Context</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={iTitle} onChange={e => setITitle(e.target.value)} placeholder="e.g. Strategic Direction & Corporate Objectives" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={iType} onChange={e => setIType(e.target.value)}>
                    <option>Internal</option>
                    <option>External</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Impact</label>
                  <select className="form-input" style={{ width: '100%' }} value={iImpact} onChange={e => setIImpact(e.target.value)}>
                    <option>Risk</option>
                    <option>Opportunity</option>
                    <option>Both</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Factor Category</label>
                <select className="form-input" style={{ width: '100%' }} value={iFactor} onChange={e => setIFactor(e.target.value)}>
                  <option>Strategy & Governance</option>
                  <option>Human Resources</option>
                  <option>Infrastructure & IT</option>
                  <option>Finance & Audit</option>
                  <option>Legal & Regulatory</option>
                  <option>Political & Governance</option>
                  <option>Economic & Market</option>
                  <option>Environmental & Social</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Aspect & Mitigation Action</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={iDescription} onChange={e => setIDescription(e.target.value)} placeholder="Describe the aspect from context and the proposed mitigation action..." />
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
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', fontSize: '1.3rem' }}>Add Interested Party (Clause 4.2)</h2>
            <form onSubmit={handleCreateParty}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Party Name / Stakeholder</label>
                  <input required type="text" className="form-input" style={{ width: '100%' }} value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Clients (UNRA, MoWT, TOTAL)" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Category</label>
                  <select className="form-input" style={{ width: '100%' }} value={pType} onChange={e => setPType(e.target.value)}>
                    <option>External</option>
                    <option>Internal</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Needs & Management Action</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={pNeeds} onChange={e => setPNeeds(e.target.value)} placeholder="What are their expectations and what actions does PROME take to manage them?" />
              </div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="compliance" checked={pCompliance} onChange={e => setPCompliance(e.target.checked)} style={{ width: '1.15rem', height: '1.15rem' }} />
                <label htmlFor="compliance" style={{ fontWeight: 500, fontSize: '0.88rem' }}>Is this a Mandatory Compliance Obligation? (Priority P1)</label>
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
        .hover-bg:hover { background-color: #f8fafc; }
      `}</style>
    </div>
  );
};

export default OrganizationContext;
