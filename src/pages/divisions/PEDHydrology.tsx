

const PEDHydrology = () => {
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '80vh' }}>
      {/* Embedded Iframe */}
      <iframe 
        src="/PROMEHydrology/index.html" 
        title="PROME Hydrology & Hydraulic Analysis"
        style={{ flexGrow: 1, width: '100%', border: 'none' }}
      />
    </div>
  );
};

export default PEDHydrology;
