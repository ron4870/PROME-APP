import { motion } from 'framer-motion';

import { ChevronRight, Waves } from 'lucide-react';
import { useState } from 'react';

const AppButton = ({ title, description, icon, onClick, colorStart, colorEnd, shadowColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '1rem',
        padding: '1rem',
        cursor: 'pointer',
        boxShadow: isActive 
          ? `0 0px 0 ${shadowColor}, 0 4px 8px rgba(0,0,0,0.15)`
          : isHovered 
            ? `0 8px 0 ${shadowColor}, 0 15px 25px rgba(0,0,0,0.2)`
            : `0 5px 0 ${shadowColor}, 0 10px 15px rgba(0,0,0,0.1)`,
        transform: isActive 
          ? 'translateY(5px)'
          : isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.15s ease-out',
        marginBottom: '0.5rem'
      }}
    >
      <div style={{
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '0.85rem',
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        backdropFilter: 'blur(4px)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 5px rgba(0,0,0,0.1)'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: '0 0 0.25rem 0', fontWeight: 700, letterSpacing: '0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4, textShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>{description}</p>
      </div>
      <ChevronRight 
        size={24} 
        color="#ffffff"
        style={{ 
          transform: isHovered ? 'translateX(6px)' : 'translateX(0)', 
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isHovered ? 1 : 0.8
        }} 
      />
    </div>
  );
};

export default function PEDWaterSanitation() {

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Hydraulic and Hydrology Design</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Planning & Engineering Division
        </p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', padding: '0 1rem', flexWrap: 'wrap' }}>
        {/* Main Content Area (70%) */}
        <div style={{ flex: '1 1 65%' }}>
           <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
             <img 
               src="https://promeconsult.com/images/irrigation.png" 
               alt="Water and Sanitation" 
               style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1.5rem' }} 
             />
             <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '1rem' }}>Water and Sanitation Services</h2>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem', fontSize: '1.05rem' }}>
               Our Water division specializes in providing comprehensive solutions including Hydrological Assessments, Ground Water Resource Planning, Irrigation and Drainage, and Waste Water Management.
             </p>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem', fontSize: '1.05rem' }}>
               We aim to deliver sustainable water management solutions that are technically appropriate, economically justifiable, and environmentally responsible. We are committed to ensuring reliable access to clean water and adequate sanitation for communities across the region.
             </p>
           </div>
        </div>

        {/* Design Apps Sidebar (30%) */}
        <div style={{ flex: '1 1 30%', minWidth: '300px' }}>
          <h2 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Design Apps
          </h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <AppButton 
              title="Hydraulics & Hydrology" 
              description="Analyze drainage, culverts, and bridge waterways." 
              icon={<Waves size={24} />} 
              onClick={() => window.open('/PROMEHydrology/index.html', '_blank')} 
              colorStart="#0ea5e9" colorEnd="#0369a1" shadowColor="#0c4a6e"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
