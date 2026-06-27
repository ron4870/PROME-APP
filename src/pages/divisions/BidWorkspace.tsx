import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, Trash2, Edit3, Clock, Users, Brain } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BidSectionModule from '../../components/bids/BidSectionModule';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const fetchWithAuth = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export default function BidWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPermittedToDelete = user?.roles?.some(r => ['Admin', 'Managing Director', 'Head of Division'].includes(r.name));
  const [bid, setBid] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sections'); // sections, partners, retrospective
  const [users, setUsers] = useState<any[]>([]);
  const [winLossReason, setWinLossReason] = useState('');
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [suggestedResources, setSuggestedResources] = useState<any>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    fetchBidAndUsers();
  }, [id]);

  const fetchBidAndUsers = async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/bids/${id}`);
      setBid(data);
      const usersData = await fetchWithAuth(`${API_BASE}/users`);
      setUsers(usersData);
    } catch (error) {
      alert('Failed to load bid workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRetrospective = async () => {
    if (!winLossReason) {
      alert('Please provide a win/loss reason to analyze.');
      return;
    }
    setIsGeneratingAdvice(true);
    try {
      await fetchWithAuth(`${API_BASE}/bids/${id}/retrospective`, { 
        method: 'POST',
        body: JSON.stringify({ winLossReason })
      });
      alert('AI Retrospective Generated');
      fetchBidAndUsers();
    } catch (error) {
      alert('Failed to generate retrospective advice');
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const handleSuggestResources = async () => {
    setIsSuggesting(true);
    try {
      const data = await fetchWithAuth(`${API_BASE}/bids/${id}/suggest-resources`);
      setSuggestedResources(data);
    } catch (error) {
      alert('Failed to suggest resources');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!window.confirm('Are you sure you want to delete this Bid Workspace? This action cannot be undone.')) return;
    try {
      await fetchWithAuth(`${API_BASE}/bids/${id}`, { method: 'DELETE' });
      navigate('/division/pmbdd/bids');
    } catch (error) {
      alert('Failed to delete bid workspace');
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Workspace...</div>;
  if (!bid) return <div style={{ padding: '3rem', textAlign: 'center' }}>Bid not found</div>;

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <button 
        onClick={() => navigate('/division/pmbdd/bids')} 
        style={{ background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Back to Bids
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600, margin: 0 }}>
              {bid.opportunity.title}
            </h1>
            <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
              {bid.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>
            {bid.opportunity.client} • Deadline: {bid.opportunity.deadline ? new Date(bid.opportunity.deadline).toLocaleDateString() : 'TBD'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isPermittedToDelete && (
            <button onClick={handleDeleteWorkspace} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease' }}>
              <Trash2 size={18} /> Delete Workspace
            </button>
          )}
          <button className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} /> Finalize Bid
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        {['sections', 'team', 'partners', 'retrospective'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--primary-color)' : '#64748b',
              fontWeight: activeTab === tab ? 600 : 500,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'sections' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {bid.sections.map((sec: any) => {
            const isCompleted = sec.status === 'Completed';
            const isInProgress = sec.status === 'In Progress';
            return (
              <div 
                key={sec.id} 
                onClick={() => setActiveSection(sec)}
                style={{ 
                  padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer', transition: 'all 0.2s',
                  borderTop: isCompleted ? '4px solid #10b981' : isInProgress ? '4px solid #f59e0b' : '4px solid #cbd5e1'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                      <FileText size={20} color="#475569" />
                    </div>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>{sec.name}</h4>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={16} /> {sec.status}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Users size={16} /> {users.find((u: any) => u.id === sec.assigneeId)?.name || 'Unassigned'}
                  </div>
                </div>

                <button style={{ 
                  width: '100%', padding: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', 
                  borderRadius: '6px', color: '#475569', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' 
                }}>
                  <Edit3 size={16} /> Open Workspace
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeSection && (
        <BidSectionModule 
          section={activeSection} 
          users={users} 
          bid={bid} 
          onClose={() => setActiveSection(null)} 
          onUpdate={(updatedSection: any) => {
            setBid((prev: any) => ({
              ...prev,
              sections: prev.sections.map((s: any) => s.id === updatedSection.id ? updatedSection : s)
            }));
            setActiveSection(updatedSection);
          }} 
        />
      )}

      {activeTab === 'team' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 600 }}>Suggested Staff & Past Projects</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>AI matches your bid requirements with HR profiles and completed projects.</p>
            </div>
            <button 
              onClick={handleSuggestResources} 
              disabled={isSuggesting}
              className="primary-button" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            >
              <Brain size={18} /> {isSuggesting ? 'Analyzing...' : 'Suggest Resources'}
            </button>
          </div>

          {suggestedResources ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h4 style={{ color: '#334155', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Recommended Staff</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {suggestedResources.suggestedStaff?.map((staff: any, idx: number) => (
                    <div key={idx} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontWeight: 600, color: '#0284c7', marginBottom: '0.25rem' }}>{staff.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>{staff.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 style={{ color: '#334155', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Relevant Past Projects</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {suggestedResources.suggestedProjects?.map((proj: any, idx: number) => (
                    <div key={idx} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontWeight: 600, color: '#0f766e', marginBottom: '0.25rem' }}>{proj.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>{proj.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
             <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
               Click "Suggest Resources" to let AI find the best team members and project references for this bid.
             </div>
          )}
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 600 }}>JV Partners & Sub-consultants</h3>
            <button className="primary-button" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Add Partner</button>
          </div>
          {bid.partners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              No partners assigned. Bidding solo.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {bid.partners.map((p: any) => (
                <div key={p.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.companyName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', color: '#334155' }}>{p.contactPerson}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.contactEmail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'retrospective' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 600, marginBottom: '1.5rem' }}>Post-Bid Retrospective & AI Analysis</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
            After the bid results are out, record the outcome to help PROME improve future bids.
          </p>
          
          {bid.retrospective ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Win/Loss Reason</label>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#475569' }}>
                  {bid.retrospective.winLossReason || 'Not provided'}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>AI Advice for Future Bids</label>
                <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '8px', color: '#1e40af', display: 'flex', gap: '1rem', alignItems: 'flex-start', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  <Brain size={24} style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <div>
                    {bid.retrospective.aiAdvice || 'No AI advice generated yet. Enter the win/loss reasons and run analysis.'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Update Win/Loss Reason & Re-analyze</label>
                  <textarea 
                    value={winLossReason} 
                    onChange={e => setWinLossReason(e.target.value)}
                    placeholder="Enter what went wrong or what we did exceptionally well..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>
                <button 
                  className="primary-button" 
                  onClick={handleGenerateRetrospective}
                  disabled={isGeneratingAdvice}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content', padding: '0.75rem 1.5rem', opacity: isGeneratingAdvice ? 0.7 : 1 }}
                >
                  <Brain size={18} /> {isGeneratingAdvice ? 'Analyzing...' : 'Re-analyze Feedback'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Brain size={48} color="#94a3b8" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#334155', fontWeight: 600, marginBottom: '0.5rem', marginTop: 0 }}>Awaiting Results</h4>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Once you know if PROME won or lost this bid, enter the feedback below and have AI analyze it for future improvements.
                  </p>
                  
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Win/Loss Reason</label>
                  <textarea 
                    value={winLossReason} 
                    onChange={e => setWinLossReason(e.target.value)}
                    placeholder="E.g., We lost because our financial proposal was 15% higher than the lowest bidder, despite having the best technical score."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '100px', marginBottom: '1rem', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="primary-button" 
                      onClick={handleGenerateRetrospective}
                      disabled={isGeneratingAdvice}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isGeneratingAdvice ? 0.7 : 1 }}
                    >
                      <Brain size={18} /> {isGeneratingAdvice ? 'Analyzing with AI...' : 'Analyze Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
