import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertOctagon, PackageX, DollarSign } from 'lucide-react';

interface NCR {
  id: number;
  ncrNumber: string;
  title: string;
  productOrService: string;
  source: string;
  severity: string;
  disposition: string | null;
  status: string;
  estimatedCost: number | null;
  createdAt: string;
}

export const NcrDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSource, setNewSource] = useState('Final Inspection');
  const [newSeverity, setNewSeverity] = useState('Minor');
  const [newCost, setNewCost] = useState('');

  useEffect(() => {
    fetchNcrs();
  }, []);

  const fetchNcrs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ncr', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNcrs(data);
      }
    } catch (error) {
      console.error('Failed to fetch NCRs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch('/api/ncr', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: newTitle,
          productOrService: newProduct,
          quantityScope: newQuantity,
          description: newDescription,
          source: newSource,
          severity: newSeverity,
          estimatedCost: newCost ? parseFloat(newCost) : null,
          reportedById: user?.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewTitle('');
        setNewProduct('');
        setNewQuantity('');
        setNewDescription('');
        setNewCost('');
        fetchNcrs();
      }
    } catch (error) {
      console.error('Failed to create NCR', error);
    }
  };

  const filtered = ncrs.filter(n => 
    n.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.productOrService.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical': return { bg: '#fef2f2', col: '#ef4444' };
      case 'Major': return { bg: '#fffbeb', col: '#f59e0b' };
      case 'Minor': return { bg: '#f0fdf4', col: '#22c55e' };
      default: return { bg: '#f1f5f9', col: '#64748b' };
    }
  };

  const totalCost = ncrs.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon color="#ef4444" size={28} />
            Product/Service Non-Conformity (NCR)
          </h1>
          <p style={{ color: '#64748b' }}>Log and disposition defective products or service errors (ISO 9001 Clause 8.7).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Log Non-Conformity
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}><PackageX size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Total NCRs</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{ncrs.length}</h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '50%', color: '#ef4444' }}><AlertOctagon size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Open NCRs</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {ncrs.filter(n => n.status === 'Open').length}
            </h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fefce8', borderRadius: '50%', color: '#eab308' }}><DollarSign size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Cost of Poor Quality (COPQ)</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              ${totalCost.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search NCRs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading NCRs...</div>
          ) : (
            <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>NCR No.</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Product / Service</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Source</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Disposition</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No NCRs recorded.</td>
                  </tr>
                ) : (
                  filtered.map(ncr => {
                    const badge = getSeverityBadge(ncr.severity);
                    return (
                      <tr 
                        key={ncr.id} 
                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                        onClick={() => navigate(`/ncr/${ncr.id}`)}
                        className="hover-bg"
                      >
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{ncr.ncrNumber}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                          <div>{ncr.productOrService}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{ncr.title}</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>{ncr.source}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: badge.bg, color: badge.col }}>
                            {ncr.severity}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{ncr.disposition || 'Pending'}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: ncr.status === 'Closed' ? '#f0fdf4' : '#eff6ff', color: ncr.status === 'Closed' ? '#22c55e' : '#3b82f6' }}>
                            {ncr.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(ncr.createdAt).toLocaleDateString()}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Log Non-Conformity (NCR)</h2>
            <form onSubmit={handleReport}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Short Title</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Crack in casting batch" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Product / Service Name</label>
                  <input required type="text" className="form-input" style={{ width: '100%' }} value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="e.g., Steel Pipe 10mm" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Quantity / Scope</label>
                  <input type="text" className="form-input" style={{ width: '100%' }} value={newQuantity} onChange={e => setNewQuantity(e.target.value)} placeholder="e.g., 50 units" />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Source of Discovery</label>
                  <select className="form-input" style={{ width: '100%' }} value={newSource} onChange={e => setNewSource(e.target.value)}>
                    <option>Incoming Inspection</option>
                    <option>In-Process</option>
                    <option>Final Inspection</option>
                    <option>Customer Return</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Severity</label>
                  <select className="form-input" style={{ width: '100%' }} value={newSeverity} onChange={e => setNewSeverity(e.target.value)}>
                    <option>Minor</option>
                    <option>Major</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description of Non-Conformity</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px' }} value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Describe exactly how the product/service failed to meet requirements..."></textarea>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estimated Cost Impact ($) (Optional)</label>
                <input type="number" min="0" step="0.01" className="form-input" style={{ width: '100%' }} value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="e.g., 500.00" />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save NCR</button>
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
