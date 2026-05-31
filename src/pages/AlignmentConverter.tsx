


const AlignmentConverter = () => {
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '80vh' }}>
      {/* Embedded Iframe */}
      <iframe 
        src="/AlignmentConverter/index.html" 
        title="PROME Road Design Alignment Converter"
        style={{ flexGrow: 1, width: '100%', border: 'none' }}
      />
    </div>
  );
};

export default AlignmentConverter;
