
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AlignmentConverter = () => {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Floating Back Button */}
      <button 
        onClick={() => navigate('/dashboard')}
        className="glass-panel"
        style={{ 
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 100,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          padding: 0,
          borderRadius: '50%',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
        title="Back to Dashboard"
      >
        <ArrowLeft size={20} color="var(--primary-color)" />
      </button>

      {/* Embedded Iframe */}
      <iframe 
        src="/AlignmentConverter/index.html" 
        title="PROME Road Design Alignment Converter"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
};

export default AlignmentConverter;
