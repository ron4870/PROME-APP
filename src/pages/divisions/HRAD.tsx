import { motion } from 'framer-motion';
import { Users, Calendar, UserPlus, Box, DollarSign, Award } from 'lucide-react';

export default function HRAD() {
  const modules = [
    { name: 'Staff Directory', icon: <Users size={24} />, desc: 'Employee records and organization chart' },
    { name: 'Leave Management', icon: <Calendar size={24} />, desc: 'Track vacations and absence' },
    { name: 'Recruitment', icon: <UserPlus size={24} />, desc: 'Job postings and candidate tracking' },
    { name: 'Asset Management', icon: <Box size={24} />, desc: 'Company laptops, vehicles, etc.' },
    { name: 'Payroll & Benefits', icon: <DollarSign size={24} />, desc: 'Manage compensation and benefits' },
    { name: 'Performance', icon: <Award size={24} />, desc: 'Appraisals and goal tracking' },
  ];

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Human Resource & Administration</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          HR&AD Home Portal
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '0 1rem' }}
      >
        {modules.map((mod, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '1.5rem', opacity: 0.6, cursor: 'not-allowed', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #0f766e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#0f766e' }}>
                {mod.icon}
              </div>
              <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>{mod.name}</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', flex: 1 }}>{mod.desc}</p>
            <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>
              Under Development
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
