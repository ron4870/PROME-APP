import { motion } from 'framer-motion';
import { Briefcase, Target, FileText, Users, BarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PMBDD() {
  const modules = [
    { name: 'Project Pipeline', icon: <Briefcase size={24} />, desc: 'Track upcoming projects and leads', path: null },
    { name: 'Business Strategy', icon: <Target size={24} />, desc: 'Define and monitor division goals', path: null },
    { name: 'Bid Management', icon: <FileText size={24} />, desc: 'Manage proposals and tender submissions', path: '/division/pmbdd/bids' },
    { name: 'Client Relations', icon: <Users size={24} />, desc: 'CRM and client feedback tracking', path: null },
    { name: 'Performance Metrics', icon: <BarChart size={24} />, desc: 'Analytics and divisional KPIs', path: null },
  ];
  
  const navigate = useNavigate();

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Project Management & Business Development</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          PMBDD Home Portal
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
            className="glass-panel" 
            onClick={() => mod.path && navigate(mod.path)}
            style={{ 
              padding: '1.5rem', 
              opacity: mod.path ? 1 : 0.6, 
              cursor: mod.path ? 'pointer' : 'not-allowed', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              borderTop: '4px solid #0f766e',
              transition: 'all 0.2s ease',
              ...(mod.path ? { transform: 'translateY(0)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : {})
            }}
            onMouseOver={(e) => mod.path && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => mod.path && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#0f766e' }}>
                {mod.icon}
              </div>
              <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>{mod.name}</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', flex: 1 }}>{mod.desc}</p>
            <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: mod.path ? '#0f766e' : '#94a3b8', fontWeight: 500, fontStyle: mod.path ? 'normal' : 'italic' }}>
              {mod.path ? 'Open Module →' : 'Under Development'}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
