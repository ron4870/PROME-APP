import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { 
  Folder, FileText, Download, ChevronRight, ChevronDown, 
  Plus, Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Save, Link as LinkIcon,
  Settings, Trash2
} from 'lucide-react';
import DocumentSection from '../extensions/DocumentSection';
import { generateDynamicPDF } from '../utils/pdfGenerator';

const API_BASE = '/api/wiki';

const fetchWithAuth = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('API Request Failed');
  return res.json();
};

const MenuBar = ({ editor, onInsertSection }: { editor: any; onInsertSection?: () => void }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexWrap: 'wrap' }}>
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`editor-btn ${editor.isActive('bold') ? 'active' : ''}`} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive('bold') ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><Bold size={18} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`editor-btn ${editor.isActive('italic') ? 'active' : ''}`} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive('italic') ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><Italic size={18} /></button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`editor-btn ${editor.isActive('underline') ? 'active' : ''}`} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive('underline') ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><UnderlineIcon size={18} /></button>
      
      <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }}></div>
      <button onClick={setLink} className={`editor-btn ${editor.isActive('link') ? 'active' : ''}`} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive('link') ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><LinkIcon size={18} /></button>
      <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }}></div>

      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive({ textAlign: 'left' }) ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><AlignLeft size={18} /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive({ textAlign: 'center' }) ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><AlignCenter size={18} /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive({ textAlign: 'right' }) ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><AlignRight size={18} /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive({ textAlign: 'justify' }) ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><AlignJustify size={18} /></button>
      <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }}></div>

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive('bulletList') ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><List size={18} /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: editor.isActive('orderedList') ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}><ListOrdered size={18} /></button>
      <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }}></div>
      <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Insert Table</button>
      <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }}></div>
      <button onClick={onInsertSection} style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', background: '#eff6ff', cursor: 'pointer', fontWeight: 500 }}>+ Add Section</button>
    </div>
  );
};

const Modal = ({ isOpen, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', minWidth: '300px' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
};

const extractLinks = (json: any): number[] => {
  const links = new Set<number>();
  const walk = (node: any) => {
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'link' && mark.attrs?.href) {
          const match = mark.attrs.href.match(/\/wiki\/(\d+)/);
          if (match) links.add(Number(match[1]));
        }
      });
    }
    if (node.content) node.content.forEach(walk);
  };
  walk(json);
  return Array.from(links);
};

const Wiki: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = ['Admin', 'Administrator', 'Super Admin'].includes(user?.role?.name || '');
  const canDraft = hasPermission('wiki_draft');
  const canReview = hasPermission('wiki_review');
  const canApprove = hasPermission('wiki_approve');

  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [activePageId, setActivePageId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [menuOpenForFolder, setMenuOpenForFolder] = useState<number | null>(null);

  // Modals
  const [isFolderModalOpen, setFolderModalOpen] = useState(false);
  const [isPageModalOpen, setPageModalOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Section Modal
  const [isSectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionType, setSectionType] = useState('General');
  const [sectionResp, setSectionResp] = useState('');
  const [sectionRef, setSectionRef] = useState('');

  // Export Modal
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [exportDocType, setExportDocType] = useState('Manual');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());

  // Template Modal
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isManageTemplatesModalOpen, setManageTemplatesModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const canManageTemplates = isAdmin || user?.role?.name === 'Managing Director';

  const { data: folders = [] } = useQuery({
    queryKey: ['wikiFolders'],
    queryFn: () => fetchWithAuth(`${API_BASE}/folders`)
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['wikiTemplates'],
    queryFn: () => fetchWithAuth(`${API_BASE}/templates`)
  });

  const { data: activePage } = useQuery({
    queryKey: ['wikiPage', activePageId],
    queryFn: () => fetchWithAuth(`${API_BASE}/pages/${activePageId}`),
    enabled: !!activePageId
  });

  const createFolderMut = useMutation({
    mutationFn: (data: { name: string; parentId?: number }) => 
      fetchWithAuth(`${API_BASE}/folders`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wikiFolders'] })
  });

  const createPageMut = useMutation({
    mutationFn: (data: { title: string; folderId: number; content?: string }) => 
      fetchWithAuth(`${API_BASE}/pages`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wikiFolders'] })
  });

  const createTemplateMut = useMutation({
    mutationFn: (data: { name: string; content: string }) => 
      fetchWithAuth(`${API_BASE}/templates`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wikiTemplates'] })
  });

  const deleteTemplateMut = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`${API_BASE}/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wikiTemplates'] })
  });

  const updatePageMut = useMutation({
    mutationFn: (data: { id: number; content?: string; linkedPageIds?: number[]; status?: string }) => 
      fetchWithAuth(`${API_BASE}/pages/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wikiPage', activePageId] })
  });

  const deleteFolderMut = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`${API_BASE}/folders/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wikiFolders'] })
  });

  const deletePageMut = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`${API_BASE}/pages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiFolders'] });
      setActivePageId(null);
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      DocumentSection,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        style: 'min-height: 800px; padding: 2rem; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 800px; margin: 2rem auto;'
      },
    },
  });

  useEffect(() => {
    if (activePage && editor) {
      editor.commands.setContent(activePage.content || '');
      
      const isDraft = activePage.status === 'Draft' || !activePage.status;
      const isReview = activePage.status === 'Review';
      
      const canEditCurrentPage = (isDraft && canDraft) || (isReview && canReview);
      editor.setEditable(canEditCurrentPage);
    }
  }, [activePage, editor, canDraft, canReview]);

  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSavePage = async () => {
    if (!activePageId || !editor) return;
    const html = editor.getHTML();
    const json = editor.getJSON();
    const linkedPageIds = extractLinks(json);
    
    await updatePageMut.mutateAsync({ 
      id: activePageId, 
      content: html,
      linkedPageIds
    });
    alert('Saved successfully');
  };

  const handleInsertSection = () => {
    if (!editor) return;
    const details = sectionType === 'Procedure Step' ? { roleResponsible: sectionResp } : sectionType === 'Reference' ? { referenceId: sectionRef } : {};
    
    editor.chain().focus().insertContent({
      type: 'documentSection',
      attrs: {
        sectionId: `sec-${Date.now()}`,
        sectionTitle: sectionTitle || 'Untitled Section',
        sectionType: sectionType,
        sectionDetails: JSON.stringify(details)
      },
      content: [{ type: 'paragraph' }]
    }).run();
    setSectionModalOpen(false);
    setSectionTitle('');
    setSectionType('General');
    setSectionResp('');
    setSectionRef('');
  };

  const handleExportPDFClick = () => {
    if (!editor) return;
    const json = editor.getJSON();
    const sections: any[] = [];
    const walk = (node: any) => {
      if (node.type === 'documentSection') {
        sections.push(node);
      }
      if (node.content) node.content.forEach(walk);
    };
    walk(json);
    
    setAvailableSections(sections);
    setSelectedSectionIds(new Set(sections.map(s => s.attrs.sectionId)));
    setExportModalOpen(true);
  };

  const handleGenerateDynamicPDF = async () => {
    setIsExporting(true);
    try {
      const selectedNodes = availableSections.filter(s => selectedSectionIds.has(s.attrs.sectionId));
      await generateDynamicPDF(selectedNodes, exportDocType, activePage?.title || 'Document');
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    } finally {
      setIsExporting(false);
      setExportModalOpen(false);
    }
  };

  const renderFolder = (folder: any, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const children = folders.filter((f: any) => f.parentId === folder.id);
    
    return (
      <div key={folder.id} style={{ marginBottom: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: '4px', backgroundColor: isExpanded ? '#f8fafc' : 'transparent', paddingLeft: `${0.5 + depth}rem` }} onClick={() => toggleFolder(folder.id)}>
          {isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
          <Folder size={14} color="#3b82f6" style={{ margin: '0 6px' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', flex: 1 }}>{folder.name}</span>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setMenuOpenForFolder(menuOpenForFolder === folder.id ? null : folder.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <Plus size={14} />
            </button>
            {menuOpenForFolder === folder.id && (
              <div style={{ position: 'absolute', right: 0, top: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div onClick={(e) => { e.stopPropagation(); setTargetFolderId(folder.id); setNewItemName(''); setPageModalOpen(true); setMenuOpenForFolder(null); }} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}>Add Page</div>
                <div onClick={(e) => { e.stopPropagation(); setTargetFolderId(folder.id); setNewItemName(''); setFolderModalOpen(true); setMenuOpenForFolder(null); }} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', color: '#0f172a' }}>Add Sub-folder</div>
                {isAdmin && (
                  <div onClick={(e) => { e.stopPropagation(); if (confirm('Are you sure you want to delete this folder and all its contents?')) deleteFolderMut.mutate(folder.id); setMenuOpenForFolder(null); }} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', color: '#ef4444', borderTop: '1px solid #e2e8f0' }}>Delete Folder</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div style={{ paddingLeft: '0.5rem' }}>
            {children.map((child: any) => renderFolder(child, depth + 1))}
            {folder.pages?.map((page: any) => (
              <div key={page.id} onClick={() => setActivePageId(page.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.5rem', cursor: 'pointer', borderRadius: '4px', backgroundColor: activePageId === page.id ? '#e0f2fe' : 'transparent', color: activePageId === page.id ? '#0369a1' : '#475569', paddingLeft: `${1.5 + depth}rem` }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <FileText size={12} style={{ marginRight: '6px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.title}</span>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Are you sure you want to delete this page?')) deletePageMut.mutate(page.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }} title="Delete Page">
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f: any) => !f.parentId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: '#f1f5f9' }} onClick={() => setMenuOpenForFolder(null)}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: '300px', backgroundColor: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>PROME Wiki</h2>
          <button onClick={() => { setTargetFolderId(null); setNewItemName(''); setFolderModalOpen(true); }} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', color: '#0f172a', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
            <Folder size={14} /> Add Folder
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {rootFolders.map((folder: any) => renderFolder(folder, 0))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activePageId ? (
          <>
            {/* Document Header */}
            <div style={{ padding: '1rem 2rem', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {activePage?.title || 'Loading...'}
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 500, backgroundColor: activePage?.status === 'Approved' ? '#dcfce7' : '#f1f5f9', color: activePage?.status === 'Approved' ? '#166534' : '#475569' }}>
                    {activePage?.status || 'Draft'}
                  </span>
                </h1>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {canManageTemplates && (
                  <>
                    <button className="btn btn-outline" onClick={() => { setTemplateName(''); setTemplateModalOpen(true); }}>
                      <Save size={16} style={{ marginRight: '8px' }} /> Save as Template
                    </button>
                    <button className="btn btn-outline" onClick={() => setManageTemplatesModalOpen(true)}>
                      <Settings size={16} style={{ marginRight: '8px' }} /> Manage Templates
                    </button>
                  </>
                )}
                <button className="btn btn-outline" onClick={handleExportPDFClick} disabled={isExporting}>
                  <Download size={16} style={{ marginRight: '8px' }} /> {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                
                {/* Workflow Buttons */}
                {(!activePage?.status || activePage?.status === 'Draft') && canDraft && (
                  <>
                    <button className="btn btn-primary" onClick={handleSavePage}>
                      <Save size={16} style={{ marginRight: '8px' }} /> Save Draft
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                      onClick={() => updatePageMut.mutate({ id: activePageId!, status: 'Review' })}
                    >
                      Submit for Review
                    </button>
                  </>
                )}
                
                {activePage?.status === 'Review' && (
                  <>
                    {canReview && (
                      <button 
                        className="btn btn-outline" 
                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={() => updatePageMut.mutate({ id: activePageId!, status: 'Draft' })}
                      >
                        Reject to Draft
                      </button>
                    )}
                    {canApprove && (
                      <button 
                        className="btn btn-primary" 
                        style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        onClick={() => updatePageMut.mutate({ id: activePageId!, status: 'Approved' })}
                      >
                        Approve Document
                      </button>
                    )}
                  </>
                )}

                {activePage?.status === 'Approved' && (canDraft || canApprove) && (
                  <button 
                    className="btn btn-outline" 
                    onClick={() => updatePageMut.mutate({ id: activePageId!, status: 'Draft' })}
                  >
                    Revert to Draft (Edit)
                  </button>
                )}
              </div>
            </div>

            {/* Editor Area */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
              <div style={{ position: 'sticky', top: 0, zIndex: 10, width: '100%', maxWidth: '800px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>
                <MenuBar editor={editor} onInsertSection={() => setSectionModalOpen(true)} />
              </div>
              <div style={{ width: '100%', paddingBottom: '4rem' }}>
                <EditorContent editor={editor} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select a page from the sidebar to start editing
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setFolderModalOpen(false)} title="New Folder">
        <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Folder Name" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => setFolderModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { createFolderMut.mutate({ name: newItemName, parentId: targetFolderId || undefined }); setFolderModalOpen(false); }} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Folder</button>
        </div>
      </Modal>

      <Modal isOpen={isPageModalOpen} onClose={() => setPageModalOpen(false)} title="New Page">
        <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Page Title" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Select Template (Optional)</label>
        <select value={selectedTemplateId || ''} onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}>
          <option value="">No Template (Blank Page)</option>
          {templates.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => setPageModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { 
            if (targetFolderId) {
              const template = templates.find((t: any) => t.id === selectedTemplateId);
              createPageMut.mutate({ title: newItemName, folderId: targetFolderId, content: template ? template.content : '' }); 
            }
            setPageModalOpen(false); 
          }} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Page</button>
        </div>
      </Modal>

      <Modal isOpen={isTemplateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Save as Template">
        <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template Name" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => setTemplateModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { 
            if(editor) { 
              createTemplateMut.mutate({ name: templateName, content: editor.getHTML() }); 
              setTemplateModalOpen(false); 
            } 
          }} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Template</button>
        </div>
      </Modal>

      <Modal isOpen={isManageTemplatesModalOpen} onClose={() => setManageTemplatesModalOpen(false)} title="Manage Templates">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {templates.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No templates found.</div>
          ) : (
            templates.map((t: any) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <span style={{ fontWeight: 500 }}>{t.name}</span>
                <button 
                  onClick={() => { if (confirm('Delete this template?')) deleteTemplateMut.mutate(t.id); }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                  title="Delete Template"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setManageTemplatesModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        </div>
      </Modal>

      <Modal isOpen={isSectionModalOpen} onClose={() => setSectionModalOpen(false)} title="Insert Document Section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Section Title</label>
            <input type="text" value={sectionTitle} onChange={e => setSectionTitle(e.target.value)} placeholder="e.g. Introduction" style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Section Type</label>
            <select value={sectionType} onChange={e => setSectionType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}>
              <option value="General">General</option>
              <option value="Procedure Step">Procedure Step</option>
              <option value="Policy">Policy</option>
              <option value="Technical Spec">Technical Spec</option>
              <option value="Reference">Reference</option>
            </select>
          </div>
          {sectionType === 'Procedure Step' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Role Responsible</label>
              <input type="text" value={sectionResp} onChange={e => setSectionResp(e.target.value)} placeholder="e.g. QA Manager" style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
          )}
          {sectionType === 'Reference' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Document ID / Link</label>
              <input type="text" value={sectionRef} onChange={e => setSectionRef(e.target.value)} placeholder="e.g. DOC-1234" style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => setSectionModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleInsertSection} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Insert Section</button>
        </div>
      </Modal>

      <Modal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} title="Export Document">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Document Template</label>
            <select value={exportDocType} onChange={e => setExportDocType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}>
              <option value="Standard">Standard Document</option>
              <option value="Manual">Company Manual</option>
              <option value="Procedure">Procedure / Workflow</option>
              <option value="CV">Curriculum Vitae</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Select Sections to Include</label>
            {availableSections.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>No document sections found on this page. Add sections using the "+ Add Section" button in the editor.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                {availableSections.map((sec, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedSectionIds.has(sec.attrs.sectionId)} 
                      onChange={(e) => {
                        const newSet = new Set(selectedSectionIds);
                        if (e.target.checked) newSet.add(sec.attrs.sectionId);
                        else newSet.delete(sec.attrs.sectionId);
                        setSelectedSectionIds(newSet);
                      }} 
                    />
                    <span style={{ fontWeight: 500 }}>{sec.attrs.sectionTitle}</span> 
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({sec.attrs.sectionType})</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => setExportModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleGenerateDynamicPDF} disabled={isExporting} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> {isExporting ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default Wiki;
