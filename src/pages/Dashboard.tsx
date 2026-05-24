
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="responsive-container">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel dashboard-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/prome.png" alt="PROME Logo" style={{ height: '32px' }} />
          <h2 style={{ marginBottom: 0 }}>PROME Intranet</h2>
        </div>
        <button className="btn" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
          <LogOut size={18} />
          Sign Out
        </button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="responsive-grid"
      >
        <div 
          className="glass-panel" 
          style={{ padding: '2rem', cursor: 'pointer', transition: 'transform 0.2s', ...{ ':hover': { transform: 'translateY(-5px)' } } }}
          onClick={() => navigate('/alignment-converter')}
        >
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Alignment Converter</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Launch the Road Design Alignment & Coordinate Converter tool.</p>
        </div>

        {[2, 3].map((item) => (
          <div key={item} className="glass-panel" style={{ padding: '2rem', opacity: 0.6 }}>
            <h3 style={{ color: 'var(--accent-color)' }}>Module {item}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>This module is currently under development.</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
