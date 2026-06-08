import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Trash2 } from 'lucide-react';

const DocumentSectionNode = (props: any) => {
  const { node, deleteNode } = props;
  const attrs = node.attrs;

  let details = {};
  try {
    details = JSON.parse(attrs.sectionDetails);
  } catch (e) {}

  return (
    <NodeViewWrapper className="document-section">
      <div 
        contentEditable={false} 
        style={{ 
          backgroundColor: '#f8fafc', 
          padding: '0.5rem 1rem', 
          borderBottom: '1px solid #cbd5e1', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{attrs.sectionTitle}</span>
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '12px', fontWeight: 500 }}>
            {attrs.sectionType}
          </span>
          {attrs.sectionType === 'Procedure Step' && (
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#dbeafe', color: '#1e3a8a', borderRadius: '12px', fontWeight: 500 }}>
              Resp: {(details as any).roleResponsible || 'N/A'}
            </span>
          )}
          {attrs.sectionType === 'Reference' && (
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontWeight: 500 }}>
              Ref: {(details as any).referenceId || 'N/A'}
            </span>
          )}
        </div>
        <button 
          onClick={deleteNode} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#ef4444', 
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
          title="Remove Section"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <NodeViewContent 
        className="section-content" 
        style={{ padding: '1rem', minHeight: '50px' }} 
      />
    </NodeViewWrapper>
  );
};

export default DocumentSectionNode;
