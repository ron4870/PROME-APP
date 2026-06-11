import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Compass, Layers, ChevronRight, Map, Signpost, BookOpen, Box } from 'lucide-react';
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

export default function PEDRoadsHighways() {
  const navigate = useNavigate();

  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Roads & Highways Design</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Planning & Engineering Division
        </p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', padding: '0 1rem', flexWrap: 'wrap' }}>
        {/* Main Content Area (70%) */}
        <div style={{ flex: '1 1 65%' }}>
           <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
             <img 
               src="https://promeconsult.com/images/engseated.png" 
               alt="Engineering Design" 
               style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1.5rem' }} 
             />
             <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '1rem' }}>Our Approach to Infrastructure Design</h2>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem', fontSize: '1.05rem' }}>
               Engineering design is a key aspect when it comes to solving the infrastructure problems facing the World today. PROME has over the years demonstrated competence in the execution of the art Engineering designs that are fit for purpose, Economical and Environmentally conscious.
             </p>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem', fontSize: '1.05rem' }}>
               Our overall approach for infrastructure design involves identification and packaging of investment proposals, which are technically appropriate, economically justifiable, financially affordable, socially acceptable, environmentally responsible and institutionally manageable. All infrastructure design work is undertaken in accordance with Ministry of Works and Transport/UNRA Standards and Design Manuals. Reference is also made to Internationally recognized standards and Manuals.
             </p>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1.05rem' }}>
               It is a culture of our design team to ensure that all items of works are designed and defined to an adequate level of detail to enable the works to be constructed. Correct specification of the works through material and workmanship specifications and drawings to a sufficient detail is vital held in high regard.
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
              title="Route Optimizer" 
              description="Generate optimal road alignments based on surface topography." 
              icon={<Map size={24} />} 
              onClick={() => navigate('/division/ped/route-optimizer')} 
              colorStart="#2563eb" colorEnd="#1e3a8a" shadowColor="#172554"
            />

            <AppButton 
              title="Alignment Designer" 
              description="Design horizontal alignments and extract coordinate data." 
              icon={<Map size={24} />} 
              onClick={() => navigate('/division/ped/alignment-design')} 
              colorStart="#059669" colorEnd="#064e3b" shadowColor="#022c22"
            />

            <AppButton 
              title="Alignment Converter" 
              description="Launch the Road Design Alignment & Coordinate Converter tool." 
              icon={<Compass size={24} />} 
              onClick={() => navigate('/alignment-converter')} 
              colorStart="#4f46e5" colorEnd="#312e81" shadowColor="#1e1b4b"
            />

            <AppButton 
              title="3D Model Image Extractor" 
              description="Extract high-resolution textured map tiles and georeference files from 3D GLB/GLTF models." 
              icon={<Box size={24} />} 
              onClick={() => window.open('https://ais-pre-sdyisxxv24232oakbl6afr-315674193862.europe-west2.run.app/', '_blank')} 
              colorStart="#ea580c" colorEnd="#7c2d12" shadowColor="#431407"
            />

            <AppButton 
              title="Pavement Designer" 
              description="Design and analyze pavement structures and materials." 
              icon={<Layers size={24} />} 
              onClick={() => window.open('https://www.tensarplus.com/', '_blank')} 
              colorStart="#7c3aed" colorEnd="#4c1d95" shadowColor="#2e1065"
            />

            <AppButton 
              title="Traffic Sign Designer" 
              description="Create and customize road signs with professional template texts and symbols." 
              icon={<Signpost size={24} />} 
              onClick={() => window.open('/PROMETrafficSignDesigner/index.html', '_blank')} 
              colorStart="#eab308" colorEnd="#a16207" shadowColor="#713f12"
            />

            <AppButton 
              title="Book of Drawings Creator" 
              description="Compile and generate standardized engineering drawing booklets." 
              icon={<BookOpen size={24} />} 
              onClick={() => window.open('/book-of-drawings', '_blank')} 
              colorStart="#0ea5e9" colorEnd="#0369a1" shadowColor="#0c4a6e"
            />
          </motion.div>
        </div>
      </div>

    </div>
  );
}
