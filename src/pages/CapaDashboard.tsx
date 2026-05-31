import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

interface CapaReport {
  id: number;
  reportNumber: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
  reportedBy: { name: string };
  assignedTo: { name: string } | null;
}

const CapaDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [capas, setCapas] = useState<CapaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // New Report Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    title: '',
    type: 'Non-Conformance',
    source: 'Daily Operation',
    severity: 'Medium',
    description: ''
  });

  useEffect(() => {
    fetchCapas();
  }, []);

  const fetchCapas = async () => {
    try {
      const res = await fetch('/api/capa');
      const data = await res.json();
      setCapas(data);
    } catch (error) {
      console.error('Failed to fetch CAPAs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/capa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReport,
          reportedById: user?.id
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewReport({ title: '', type: 'Non-Conformance', source: 'Daily Operation', severity: 'Medium', description: '' });
        fetchCapas();
      }
    } catch (error) {
      console.error('Failed to create report', error);
    }
  };

  const filteredCapas = capas.filter(c => {
    const matchesSearch = c.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'Reported': return 'status-badge draft';
      case 'Under Investigation': return 'status-badge in-review';
      case 'Action Pending': return 'status-badge warning';
      case 'Closed': return 'status-badge approved';
      default: return 'status-badge';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch(severity) {
      case 'Critical': return 'status-badge draft'; // Red
      case 'High': return 'status-badge warning'; // Orange/Yellow
      case 'Medium': return 'status-badge in-review'; // Blue
      case 'Low': return 'status-badge obsolete'; // Gray
      default: return 'status-badge';
    }
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>CAPA & Non-Conformances</h1>
          <p style={{ color: '#64748b' }}>Manage Corrective and Preventive Actions across PROME.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Log Non-Conformance
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '50%', color: '#ef4444' }}><AlertTriangle size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Open Critical</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {capas.filter(c => c.severity === 'Critical' && c.status !== 'Closed').length}
            </h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}><Clock size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Under Investigation</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {capas.filter(c => c.status === 'Under Investigation').length}
            </h3>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '50%', color: '#22c55e' }}><CheckCircle size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Closed (This Year)</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
              {capas.filter(c => c.status === 'Closed').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by NCR number or title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="#64748b" />
            <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Action Pending">Action Pending</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : (
            <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Report No.</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Reported By</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Assigned To</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredCapas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No CAPA reports found.</td>
                  </tr>
                ) : (
                  filteredCapas.map(capa => (
                    <tr 
                      key={capa.id} 
                      style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                      onClick={() => navigate(`/capa/${capa.id}`)}
                      className="hover-bg"
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{capa.reportNumber}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{capa.title}</td>
                      <td style={{ padding: '1rem 1.5rem' }}><span className={getSeverityBadgeClass(capa.severity)}>{capa.severity}</span></td>
                      <td style={{ padding: '1rem 1.5rem' }}><span className={getStatusBadgeClass(capa.status)}>{capa.status}</span></td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{capa.reportedBy?.name || 'Unknown'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{capa.assignedTo?.name || 'Unassigned'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(capa.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText color="#0f172a" /> Log Non-Conformance
            </h2>
            <form onSubmit={handleCreateReport}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title / Brief Summary</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} placeholder="e.g., Concrete cube test failure at Site A" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={newReport.type} onChange={e => setNewReport({...newReport, type: e.target.value})}>
                    <option>Non-Conformance</option>
                    <option>Opportunity for Improvement</option>
                    <option>Near Miss</option>
                    <option>Safety Incident</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Severity</label>
                  <select className="form-input" style={{ width: '100%' }} value={newReport.severity} onChange={e => setNewReport({...newReport, severity: e.target.value})}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Source</label>
                <select className="form-input" style={{ width: '100%' }} value={newReport.source} onChange={e => setNewReport({...newReport, source: e.target.value})}>
                  <option>Daily Operation</option>
                  <option>Internal Audit</option>
                  <option>External Audit</option>
                  <option>Client Complaint</option>
                  <option>Supplier Issue</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Detailed Description</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} value={newReport.description} onChange={e => setNewReport({...newReport, description: e.target.value})} placeholder="Describe exactly what happened, where, and when..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Report</button>
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

export default CapaDashboard;
