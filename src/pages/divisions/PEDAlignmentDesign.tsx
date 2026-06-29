export default function PEDAlignmentDesign() {
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '80vh', overflow: 'hidden' }}>
      <iframe 
        src="/PROMEAlignmentDesign/index.html" 
        title="PROME Horizontal Alignment Designer"
        style={{ flexGrow: 1, width: '100%', height: 'calc(100vh - 200px)', border: 'none' }}
      />
    </div>
  );
}
