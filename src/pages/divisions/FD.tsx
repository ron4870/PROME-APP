import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, PieChart, CreditCard, DollarSign, Calculator, TrendingUp } from 'lucide-react';

export default function FD() {
  const navigate = useNavigate();
  
  const modules = [
    { name: 'Invoices', icon: <FileText size={24} />, desc: 'Manage and generate company invoices', path: '/division/fd/invoices', active: true },
    { name: 'Budgeting', icon: <PieChart size={24} />, desc: 'Forecast and track budgets', active: false },
    { name: 'Accounts Payable', icon: <CreditCard size={24} />, desc: 'Manage vendor payments', active: false },
    { name: 'Payroll Processing', icon: <DollarSign size={24} />, desc: 'Staff compensation', active: false },
    { name: 'Expense Tracking', icon: <Calculator size={24} />, desc: 'Monitor corporate spending', active: false },
    { name: 'Financial Reports', icon: <TrendingUp size={24} />, desc: 'P&L, Balance Sheets, Cash Flow', active: false },
  ];

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Finance Division</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          FD Home Portal
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '0 1rem' }}
      >
        {modules.map((mod, idx) => (
          <div 
            key={idx} 
            className={`glass-panel ${mod.active ? 'hover-card' : ''}`} 
            style={{ 
              padding: '1.5rem', 
              opacity: mod.active ? 1 : 0.6, 
              cursor: mod.active ? 'pointer' : 'not-allowed', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              borderTop: `4px solid ${mod.active ? '#cc0000' : '#0f766e'}`,
              transition: 'all 0.2s'
            }}
            onClick={() => mod.active && mod.path && navigate(mod.path)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: mod.active ? '#fee2e2' : '#f1f5f9', borderRadius: '12px', color: mod.active ? '#cc0000' : '#0f766e' }}>
                {mod.icon}
              </div>
              <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>{mod.name}</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', flex: 1 }}>{mod.desc}</p>
            {!mod.active && (
              <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>
                Under Development
              </div>
            )}
            {mod.active && (
              <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#cc0000', fontWeight: 600 }}>
                Access Module →
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
