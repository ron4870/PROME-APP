import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Building2, 
  Phone, 
  MapPin, 
  RefreshCw
} from 'lucide-react';
import { generateSupplierMasterListPDF } from '../utils/supplierMasterlistPdf';

interface Supplier {
  id: number;
  supplierNumber: string;
  name: string;
  category: string | null;
  contactName?: string | null;
  phone?: string | null;
  status: string;
  nextEvaluationDate: string | null;
}

const SupplierDashboard: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMasterlistPdf = () => {
    setIsExporting(true);
    try {
      const doc = generateSupplierMasterListPDF(suppliers);
      doc.save('PROME_Master_List_of_Suppliers_2026.pdf');
    } catch (error) {
      console.error('Failed to export supplier master list PDF:', error);
      alert('Failed to generate Master List of Suppliers PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncOfficialSuppliers = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/suppliers/seed-2026', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSyncFeedback(`✅ ${data.message || 'Updated 2026 Master List of Suppliers successfully.'}`);
        fetchSuppliers();
      } else {
        setSyncFeedback('⚠️ Failed to sync supplier master list.');
      }
    } catch (err: any) {
      setSyncFeedback(`❌ Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: 'New Approved Supplier',
          category: 'A - Stationery Supplier',
          status: 'Approved'
        })
      });
      if (response.ok) {
        const newSup = await response.json();
        navigate(`/suppliers/${newSup.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Distinct categories
  const categories = Array.from(new Set(suppliers.map(s => s.category).filter(Boolean))) as string[];

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.supplierNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contactName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getEvaluationStatus = (date: string | null) => {
    if (!date) return { label: 'Not Set', color: '#9ca3af', bg: '#f3f4f6', urgent: false };
    const today = new Date();
    const evalDate = new Date(date);
    
    today.setHours(0,0,0,0);
    evalDate.setHours(0,0,0,0);
    
    const diffTime = evalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: '#991b1b', bg: '#fee2e2', urgent: true };
    if (diffDays <= 30) return { label: `Due in ${diffDays}d`, color: '#b45309', bg: '#fef3c7', urgent: true };
    return { label: `Valid (${diffDays}d left)`, color: '#166534', bg: '#dcfce3', urgent: false };
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              Approved Suppliers Master List
            </h1>
            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
              PROME-IMSR-TO-31
            </span>
          </div>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Control of Externally Provided Processes, Products and Services (ISO 9001:2015 Clause 8.4) — 2026 Register
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportMasterlistPdf}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              backgroundColor: '#991b1b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(153, 27, 27, 0.2)'
            }}
            title="Download Master List of Suppliers 2026 PDF (PROME-IMSR-TO-31)"
          >
            <Download size={16} />
            {isExporting ? 'Generating PDF...' : 'Export Master List PDF'}
          </button>

          <button
            onClick={handleSyncOfficialSuppliers}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
            title="Sync official 27 approved suppliers from PROME-IMSR-TO-31"
          >
            <RefreshCw size={15} className={isSyncing ? 'spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Official List'}
          </button>

          <button 
            onClick={handleCreateSupplier}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.88rem', fontWeight: 500, marginBottom: '1.25rem' }}>
          {syncFeedback}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#16a34a" /> Approved Suppliers
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.4rem' }}>
            {suppliers.filter(s => s.status === 'Approved').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>PROME-IMSR-TO-31 (Rev Jan 2026)</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>
            <Building2 size={16} color="#0284c7" /> Approved Categories
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.4rem' }}>
            {categories.length > 0 ? categories.length : 16}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '2px' }}>Categories A through Q</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>
            <AlertCircle size={16} color="#eab308" /> Annual Review Cycle
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.4rem' }}>
            Dec 2026
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ca8a04', marginTop: '2px' }}>Scheduled for ISO 9001 audit</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>
            <Truck size={16} color="#991b1b" /> Total Vendors
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.4rem' }}>
            {suppliers.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '2px' }}>Active Master Registry</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3af' }} />
            <input
              type="text"
              placeholder="Search by supplier name, number, category, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem 0.5rem 2.4rem', fontSize: '0.85rem' }}
            />
          </div>

          {/* Category Filter dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}
            >
              <option value="ALL">All Categories ({suppliers.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading suppliers...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', width: '140px' }}>Supplier Ref</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', minWidth: '220px' }}>Supplier Name</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', minWidth: '180px' }}>Category</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', minWidth: '240px' }}>Contact Address</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', minWidth: '160px' }}>Telephone & Fax</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', width: '110px' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', width: '130px' }}>Next Review</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => {
                  const evalStatus = getEvaluationStatus(s.nextEvaluationDate);
                  return (
                    <tr 
                      key={s.id} 
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => navigate(`/suppliers/${s.id}`)}
                      className="hover-bg"
                    >
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: '700', color: '#991b1b', verticalAlign: 'top' }}>
                        {s.supplierNumber}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: '600', color: '#0f172a', verticalAlign: 'top' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: '#475569', verticalAlign: 'top' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          backgroundColor: '#eff6ff', 
                          color: '#1d4ed8' 
                        }}>
                          {s.category || 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: '#334155', fontSize: '0.82rem', verticalAlign: 'top', lineHeight: '1.4' }}>
                        {s.contactName ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                            <MapPin size={13} color="#94a3b8" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span>{s.contactName}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: '#475569', fontSize: '0.82rem', verticalAlign: 'top' }}>
                        {s.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>{s.phone}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'top' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: 
                            s.status === 'Approved' ? '#dcfce3' : 
                            s.status === 'Rejected' ? '#fee2e2' : 
                            s.status === 'Conditional' ? '#fef3c7' : '#f3f4f6',
                          color: 
                            s.status === 'Approved' ? '#166534' : 
                            s.status === 'Rejected' ? '#991b1b' : 
                            s.status === 'Conditional' ? '#b45309' : '#374151'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'top' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          backgroundColor: evalStatus.bg,
                          color: evalStatus.color
                        }}>
                          {evalStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No approved suppliers found matching your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info ribbon */}
        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            Official Reference: <strong>PROME-IMSR-TO-31 (Version 2026)</strong> — Approved by Eng. Ronald Kibuuka
          </div>
          <div>
            Showing <strong>{filteredSuppliers.length}</strong> of <strong>{suppliers.length}</strong> approved vendors
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
