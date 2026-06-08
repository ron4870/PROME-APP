import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DocumentSectionNode from './DocumentSectionNode';

export default Node.create({
  name: 'documentSection',

  group: 'block',

  content: 'block+',

  defining: true,
  isolating: true,

  addAttributes() {
    return {
      sectionId: {
        default: null,
      },
      sectionTitle: {
        default: 'New Section',
      },
      sectionType: {
        default: 'General',
      },
      sectionDetails: {
        default: '{}',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="document-section"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'document-section' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentSectionNode);
  },
});
