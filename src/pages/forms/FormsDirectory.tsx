import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Plus, FileSignature, History, Laptop, ShieldAlert, 
  Building2, FileWarning, ShoppingCart, DollarSign, ExternalLink 
} from 'lucide-react';

export default function FormsDirectory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
      const response = await fetch('/api/forms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const getFormDetails = (type: string) => {
    switch (type) {
      case 'FundsRequisition':
        return { label: 'Funds Requisition', path: '/forms/funds-requisition', idNo: 'PROME-IMSR-AFD-15' };
      case 'LocalPurchaseOrder':
        return { label: 'Local Purchase Order', path: '/forms/local-purchase-order', idNo: 'PROME-QMS-AFD-16' };
      case 'SoftwareEvaluation':
        return { label: 'Software Evaluation Form', path: '/forms/software-evaluation', idNo: 'PROME-QMSR-PMBDO-06' };
      case 'RiskForm':
        return { label: 'Risk Form', path: '/forms/risk', idNo: 'PROME-IMSR-AFD-14' };
      case 'CustomerProperty':
        return { label: 'Customer Property Info Sheet', path: '/forms/customer-property', idNo: 'PROME-QMSR-AFD-10' };
      case 'MissingPropertyReport':
        return { label: 'Missing / Damaged Property Report', path: '/forms/missing-property-report', idNo: 'PROME-QMSR-PMBDO-08' };
      default:
        return { label: type, path: '/forms', idNo: '' };
    }
  };

  const availableForms = [
    {
      id: 'funds-requisition',
      title: 'Funds Requisition Form',
      idNumber: 'PROME-IMSR-AFD-15',
      department: 'Finance & Accounts',
      category: 'Finance',
      path: '/forms/funds-requisition',
      icon: <DollarSign size={24} color="#0f766e" />,
      description: 'Request project or operational funds with line-item budget allocations, expenditure to date, and three-tier approval workflow.',
      badgeColor: '#0f766e',
      badgeBg: '#f0fdfa'
    },
    {
      id: 'local-purchase-order',
      title: 'Local Purchase Order Form',
      idNumber: 'PROME-QMS-AFD-16',
      department: 'Procurement & Logistics',
      category: 'Procurement',
      path: '/forms/local-purchase-order',
      icon: <ShoppingCart size={24} color="#0284c7" />,
      description: 'Official purchase order carried or transmitted to suppliers for goods, equipment, or contracted services with delivery tracking.',
      badgeColor: '#0284c7',
      badgeBg: '#f0f9ff'
    },
    {
      id: 'software-evaluation',
      title: 'Software Evaluation Form',
      idNumber: 'PROME-QMSR-PMBDO-06',
      department: 'MIS & IT Infrastructure',
      category: 'IT / Operations',
      path: '/forms/software-evaluation',
      icon: <Laptop size={24} color="#7c3aed" />,
      description: 'Ensure software packages are fully tested for consultancy requirements, network compatibility, and licence compliance before purchase.',
      badgeColor: '#7c3aed',
      badgeBg: '#f5f3ff'
    },
    {
      id: 'risk-form',
      title: 'Risk Form',
      idNumber: 'PROME-IMSR-AFD-14',
      department: 'Project Management & Quality',
      category: 'Quality / Risk',
      path: '/forms/risk',
      icon: <ShieldAlert size={24} color="#ea580c" />,
      description: 'Identify project-specific or operational risks, score likelihood & impact, and establish preventative and contingent mitigation actions.',
      badgeColor: '#ea580c',
      badgeBg: '#fff7ed'
    },
    {
      id: 'customer-property',
      title: 'Customer Property Information Sheet',
      idNumber: 'PROME-QMSR-AFD-10',
      department: 'Administration & Asset Registry',
      category: 'Quality / Risk',
      path: '/forms/customer-property',
      icon: <Building2 size={24} color="#0891b2" />,
      description: 'Formally record, track, and protect customer-supplied property, survey equipment, client documents, and software under ISO Clause 8.5.3.',
      badgeColor: '#0891b2',
      badgeBg: '#ecfeff'
    },
    {
      id: 'missing-property-report',
      title: 'Missing / Damaged Property Report',
      idNumber: 'PROME-QMSR-PMBDO-08',
      department: 'Property Officer & Head Office',
      category: 'IT / Operations',
      path: '/forms/missing-property-report',
      icon: <FileWarning size={24} color="#dc2626" />,
      description: 'Formal investigation report card for missing, stolen, damaged, or destroyed property, documenting investigative steps and negligence findings.',
      badgeColor: '#dc2626',
      badgeBg: '#fef2f2'
    }
  ];

  const filteredForms = selectedCategory === 'ALL' 
    ? availableForms 
    : availableForms.filter(f => f.category === selectedCategory);

  return (
    <div className="layout-container" style={{ padding: '1.5rem 2rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
              Company Forms & Records
            </h1>
            <span style={{ 
              backgroundColor: '#ccfbf1', 
              color: '#0f766e', 
              padding: '0.2rem 0.65rem', 
              borderRadius: '9999px', 
              fontSize: '0.75rem', 
              fontWeight: '700',
              border: '1px solid #99f6e4'
            }}>
              ISO 9001:2015 Compliant
            </span>
          </div>
          <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '0.925rem' }}>
            Select an official PROME form to complete, submit with tracking barcodes, or download and print approved PDF copies.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'Finance', 'Procurement', 'IT / Operations', 'Quality / Risk'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedCategory === cat ? '#0f766e' : '#f1f5f9',
                color: selectedCategory === cat ? 'white' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              {cat === 'ALL' ? `All Forms (${availableForms.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Available Forms (Left) + Submission History (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Available Forms Grid */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSignature size={20} color="#0f766e" /> Official Company Forms ({filteredForms.length})
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filteredForms.map((form) => (
              <div 
                key={form.id}
                style={{ 
                  backgroundColor: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '10px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s ease', 
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = form.badgeColor;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                }}
                onClick={() => navigate(form.path)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ backgroundColor: form.badgeBg, padding: '0.75rem', borderRadius: '8px', flexShrink: 0 }}>
                      {form.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.3 }}>
                        {form.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: '700', 
                          color: form.badgeColor, 
                          backgroundColor: form.badgeBg,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          {form.department}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#64748b', fontWeight: '600' }}>
                          {form.idNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.45', margin: 0 }}>
                    {form.description}
                  </p>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                    A4 PDF & Barcode Ready
                  </span>
                  <span style={{ 
                    fontSize: '0.825rem', 
                    fontWeight: '700', 
                    color: form.badgeColor, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem' 
                  }}>
                    Fill Form <Plus size={16} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission History Sidebar */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="#0284c7" /> My Submissions
          </h2>
          
          <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {history.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                <FileText size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: '600', color: '#334155' }}>No submissions yet</div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Completed forms will appear here with verification barcodes.
                </p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {history.map((form) => {
                  const details = getFormDetails(form.formType);

                  return (
                    <li 
                      key={form.id} 
                      onClick={() => navigate(`${details.path}?id=${form.uniqueId || form.id}`)}
                      style={{ 
                        padding: '1rem', 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.825rem', fontFamily: 'monospace' }}>
                          {form.uniqueId}
                        </span>
                        <span style={{ 
                          fontSize: '0.675rem', 
                          padding: '0.15rem 0.5rem', 
                          backgroundColor: form.status === 'Approved' ? '#dcfce7' : '#fef3c7', 
                          color: form.status === 'Approved' ? '#166534' : '#d97706', 
                          borderRadius: '999px', 
                          fontWeight: '700' 
                        }}>
                          {form.status || 'Submitted'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.825rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                        {details.label}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span>{new Date(form.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span style={{ color: '#0f766e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          View <ExternalLink size={11} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
