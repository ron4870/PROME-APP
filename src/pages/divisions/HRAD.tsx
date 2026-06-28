import { motion } from 'framer-motion';
import { Users, Calendar, UserPlus, Box, Award, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function HRAD() {
  const { hasPermission } = useAuth();

  const modules = [
    { name: 'Staff Directory', icon: <Users size={24} />, desc: 'Employee records and organization chart' },
    { name: 'Leave Management', icon: <Calendar size={24} />, desc: 'Track vacations and absence' },
    { name: 'Recruitment', icon: <UserPlus size={24} />, desc: 'Job postings and candidate tracking' },
    { name: 'Asset Management', icon: <Box size={24} />, desc: 'Company laptops, vehicles, etc.' },
    { name: 'CVs', icon: <FileText size={24} />, desc: 'Manage employee CVs and qualifications', active: true },
    { name: 'Performance', icon: <Award size={24} />, desc: 'Appraisals and goal tracking' },
  ];

  const handleModuleClick = (mod: any) => {
    if (mod.active) {
      if (mod.name === 'CVs') {
        if (hasPermission('cvs')) {
          window.open('/cvs', '_blank');
        } else {
          alert('Access Denied: You do not have permission to access the CVs module. Contact your administrator.');
        }
      }
    }
  };

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
        {modules.map((mod, idx) => {
          const isActive = mod.active;
          return (
            <div 
              key={idx} 
              className="glass-panel" 
              onClick={() => handleModuleClick(mod)}
              style={{ 
                padding: '1.5rem', 
                opacity: isActive ? 1 : 0.6, 
                cursor: isActive ? 'pointer' : 'not-allowed', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem', 
                borderTop: '4px solid #0f766e',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => isActive && (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={e => isActive && (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#0f766e' }}>
                  {mod.icon}
                </div>
                <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>{mod.name}</h3>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', flex: 1 }}>{mod.desc}</p>
              <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>
                {isActive ? 'Click to Open' : 'Under Development'}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
