import React, { useState, useEffect, useRef } from 'react';
import { Plus, Brain, Briefcase, ChevronRight, XCircle, Upload, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function BidsManagement() {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({ title: '', client: '', country: '', description: '', type: 'RFP', deadline: '' });
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'opportunities') {
        const data = await fetchWithAuth(`${API_BASE}/bids/opportunities`);
        setOpportunities(data);
      } else {
        const data = await fetchWithAuth(`${API_BASE}/bids`);
        setBids(data);
      }
    } catch (error) {
      alert('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleTriage = async (id: number) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/bids/opportunities/${id}/triage`, { method: 'POST' });
      setOpportunities(opportunities.map(opp => opp.id === id ? data : opp));
      alert('AI Triage completed!');
    } catch (error) {
      alert('AI Triage failed');
    }
  };

  const handleCreateBid = async (opportunityId: number) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/bids`, { 
        method: 'POST', 
        body: JSON.stringify({ opportunityId }) 
      });
      alert('Bid Workspace created!');
      navigate(`/division/pmbdd/bids/${data.id}`);
    } catch (error) {
      alert('Failed to create bid workspace');
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth(`${API_BASE}/bids/opportunities`, { 
        method: 'POST', 
        body: JSON.stringify(formData) 
      });
      alert('Opportunity created successfully!');
      setShowModal(false);
      setFormData({ title: '', client: '', country: '', description: '', type: 'RFP', deadline: '' });
      fetchData();
    } catch (error) {
      alert('Failed to create opportunity');
    }
  };

  const handleSearchWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      await fetchWithAuth(`${API_BASE}/bids/opportunities/search`, {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery })
      });
      alert('Search completed! Check your opportunities pipeline for any new items.');
      setShowSearchModal(false);
      setSearchQuery('');
      fetchData();
    } catch (error) {
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const processFile = (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result;
      try {
        await fetchWithAuth(`${API_BASE}/bids/opportunities/ocr`, {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64 })
        });
        alert('Opportunity extracted from newspaper scan!');
        setShowOcrModal(false);
        fetchData();
      } catch (error) {
        alert('Failed to extract opportunity from image');
      } finally {
        setIsUploading(false);
        // Reset the file input so the same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', padding: '0 1rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Bids Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
            Identify, assess, and prepare winning proposals.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowOcrModal(true)} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} /> Upload Newspaper Scan
          </button>
          <button onClick={() => setShowSearchModal(true)} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} /> Search Web
          </button>
          <button onClick={() => setShowModal(true)} className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> New Opportunity
          </button>
        </div>
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '2rem' }}>
          <button 
            onClick={() => setActiveTab('opportunities')}
            style={{ 
              padding: '1rem 0', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'opportunities' ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === 'opportunities' ? 'var(--primary-color)' : '#64748b',
              fontWeight: activeTab === 'opportunities' ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            Opportunities Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('bids')}
            style={{ 
              padding: '1rem 0', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'bids' ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === 'bids' ? 'var(--primary-color)' : '#64748b',
              fontWeight: activeTab === 'bids' ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            Active Bids Workspace
          </button>
        </div>
      </div>

      <div style={{ padding: '0 1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading...</div>
        ) : activeTab === 'opportunities' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {opportunities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                No opportunities found. Click "New Opportunity" to add one.
              </div>
            ) : (
              opportunities.map(opp => (
                <div key={opp.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {opp.title}
                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '12px' }}>
                          {opp.type}
                        </span>
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>{opp.client} • {opp.country}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {opp.aiScore ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: opp.aiScore > 75 ? '#dcfce7' : opp.aiScore > 50 ? '#fef9c3' : '#fee2e2', borderRadius: '8px', color: opp.aiScore > 75 ? '#166534' : opp.aiScore > 50 ? '#854d0e' : '#991b1b' }}>
                          <Brain size={18} />
                          <span style={{ fontWeight: 600 }}>AI Score: {opp.aiScore}%</span>
                        </div>
                      ) : (
                        <button onClick={() => handleTriage(opp.id)} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Brain size={16} /> Run AI Triage
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {opp.description && (
                    <p style={{ color: '#475569', fontSize: '0.9rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      {opp.description}
                    </p>
                  )}

                  {opp.aiRecommendation && (
                    <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', margin: 0 }}><strong>AI Recommendation:</strong> {opp.aiRecommendation}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <button className="secondary-button" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                      Mark No-Go
                    </button>
                    <button onClick={() => handleCreateBid(opp.id)} className="primary-button">
                      Proceed to Bid Workspace
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {bids.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                No active bids. Promote an opportunity to a bid workspace.
              </div>
            ) : (
              bids.map(bid => (
                <div key={bid.id} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate(`/division/pmbdd/bids/${bid.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
                      <Briefcase size={24} />
                    </div>
                    <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px', fontWeight: 500 }}>
                      {bid.status}
                    </span>
                  </div>
                  <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {bid.opportunity?.title}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    {bid.opportunity?.client}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{bid.partners?.length || 0} Partners</span>
                    <span style={{ color: '#0f766e', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Open Workspace <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Opportunity Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>New Opportunity</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOpportunity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Project Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  required 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Client</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.client} 
                    onChange={e => setFormData({...formData, client: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Country</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.country} 
                    onChange={e => setFormData({...formData, country: e.target.value})} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Submission Type</label>
                  <select 
                    className="form-input" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="EOI">Expression of Interest (EOI)</option>
                    <option value="RFP">Request for Proposal (RFP)</option>
                    <option value="DP">Direct Procurement (DP)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Deadline</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.deadline} 
                    onChange={e => setFormData({...formData, deadline: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Project Description</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button">Save Opportunity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Web Search Modal */}
      {showSearchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>Search Web for Tenders</h2>
              <button onClick={() => setShowSearchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSearchWeb} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Search Query</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Road construction tenders in Uganda 2026"
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowSearchModal(false)} className="secondary-button" disabled={isSearching}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OCR Modal */}
      {showOcrModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>Upload Newspaper Scan</h2>
              <button onClick={() => setShowOcrModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ 
                padding: '2rem', 
                border: isDragging ? '2px dashed var(--primary-color)' : '2px dashed #cbd5e1', 
                backgroundColor: isDragging ? 'rgba(187, 10, 10, 0.05)' : 'transparent',
                borderRadius: '8px', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isUploading ? (
                <div style={{ color: '#0284c7', fontWeight: 600 }}>Extracting Data with AI...</div>
              ) : (
                <>
                  <Upload size={32} color="#94a3b8" style={{ margin: '0 auto 1rem', pointerEvents: 'none' }} />
                  <p style={{ color: '#475569', marginBottom: '1rem', pointerEvents: 'none' }}>Select or drag and drop an image file (JPG, PNG)</p>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload} 
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

