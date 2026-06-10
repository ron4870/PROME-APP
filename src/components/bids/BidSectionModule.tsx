import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Brain, Download, Paperclip, Save, Loader2, Link as LinkIcon, Trash2 } from 'lucide-react';
import TipTapEditor from '../TipTapEditor';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import GanttChartBuilder from './GanttChartBuilder';
import TeamCVBuilder from './TeamCVBuilder';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const fetchWithAuth = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export default function BidSectionModule({ section, users, bid, onClose, onUpdate }: any) {
  const { user } = useAuth();
  const [content, setContent] = useState(section.content || '');
  const [status, setStatus] = useState(section.status || 'Pending');
  const [assigneeId, setAssigneeId] = useState(section.assigneeId || '');
  const [references, setReferences] = useState<any[]>(
    typeof section.references === 'string' ? JSON.parse(section.references) : (section.references || [])
  );
  const [data, setData] = useState<any[]>(
    typeof section.data === 'string' ? JSON.parse(section.data) : (section.data || [])
  );
  const [wikiPages, setWikiPages] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Fetch wiki pages for Team CVs section
  useEffect(() => {
    if (section.name.toLowerCase().includes('cv') || section.name.toLowerCase().includes('team')) {
      fetchWithAuth(`${API_BASE}/wiki/pages`)
        .then(res => setWikiPages(res))
        .catch(err => console.error('Failed to fetch wiki pages', err));
    }
  }, [section.name]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSave = async (silent = false) => {
    setIsSaving(!silent);
    try {
      const updated = await fetchWithAuth(`${API_BASE}/bids/sections/${section.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          content,
          status,
          assigneeId: assigneeId ? Number(assigneeId) : null,
          references,
          data
        }),
      });
      if (!silent) alert('Section saved successfully');
      onUpdate(updated);
    } catch (err) {
      if (!silent) alert('Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraftAI = async () => {
    setIsDrafting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/bids/sections/${section.id}/draft`, { method: 'POST' });
      if (res.content) {
        setContent(res.content);
        setStatus('In Progress');
        handleSave(true);
      }
    } catch (err) {
      alert('Failed to generate draft with AI');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      const newRef = {
        id: Date.now(),
        name: file.name,
        type: file.type,
        url: base64Str, // Mock upload as base64 string
        date: new Date().toISOString(),
        uploadedBy: user?.name || 'User'
      };
      setReferences(prev => [...prev, newRef]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReference = (id: number) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  };

  const publishPDF = async () => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return alert('No content to publish');

    try {
      const canvas = await html2canvas(editorEl as HTMLElement, {
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If content is very long, it might get cut off in a single page
      // For a robust implementation, jsPDF needs chunking, but for this mock, one page scale is fine.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save(`PROME_${bid.opportunity?.title.replace(/\\s+/g, '_')}_${section.name.replace(/\\s+/g, '_')}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#f8fafc', zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{section.name}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{bid.opportunity?.title}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select 
            value={assigneeId} 
            onChange={(e) => setAssigneeId(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="">Unassigned</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: status === 'Completed' ? '#dcfce7' : 'white' }}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <button 
            onClick={() => handleSave()}
            disabled={isSaving}
            className="secondary-button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
          
          <button 
            onClick={publishPDF}
            className="primary-button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ef4444' }}
          >
            <Download size={18} />
            Publish PDF
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Editor Area */}
        <div style={{ flex: 3, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#334155', margin: 0 }}>Content Draft</h2>
            <button 
              onClick={handleDraftAI}
              disabled={isDrafting}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              {isDrafting ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
              {content ? 'Re-draft with AI' : 'Draft with AI'}
            </button>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }} ref={contentRef}>
          
            {section.name.toLowerCase().includes('work programme') && (
              <GanttChartBuilder 
                tasks={data} 
                onChange={setData} 
                users={users} 
              />
            )}

            {(section.name.toLowerCase().includes('cv') || section.name.toLowerCase().includes('team')) && (
              <TeamCVBuilder
                sectionId={section.id}
                team={data}
                onChange={setData}
                wikiPages={wikiPages}
              />
            )}
            
            <div>
              <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem' }}>Introductory Notes (Optional)</h3>
              <TipTapEditor 
                content={content} 
                onChange={setContent} 
                editable={true}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: References & Section Specific Tools */}
        <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Paperclip size={18} /> Reference Documents
            </h3>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: '0.75rem', border: '1px dashed #cbd5e1',
                borderRadius: '8px', backgroundColor: '#f8fafc', cursor: 'pointer',
                color: '#64748b', fontWeight: 500, marginBottom: '1rem'
              }}
            >
              + Upload Mock Reference
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              {references.map((ref, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px'
                }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '0.5rem' }}>
                    <a href={ref.url} download={ref.name} style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <LinkIcon size={14} /> {ref.name}
                    </a>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Added by {ref.uploadedBy} on {new Date(ref.date).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveReference(ref.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {references.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', margin: '1rem 0' }}>No references attached.</p>
              )}
            </div>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5' }}>
              <Brain size={18} /> Section Tools
            </h3>
            
            {section.name.includes('Methodology') && (
              <div style={{ padding: '1rem', backgroundColor: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#3730a3' }}>TOR Cross-Checker</h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#4f46e5' }}>AI will analyze the current drafted text and compare it against the opportunity Terms of Reference.</p>
                <button className="primary-button" style={{ width: '100%', fontSize: '0.9rem' }}>Run Check</button>
              </div>
            )}
            
            {section.name.includes('Financial') && (
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>BOQ Parser</h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#15803d' }}>Upload an Excel file to automatically extract BOQ totals and calculate VAT / Withholding tax.</p>
                <button className="primary-button" style={{ width: '100%', fontSize: '0.9rem', backgroundColor: '#16a34a' }}>Upload BOQ</button>
              </div>
            )}

            {section.name.includes('CV') && (
              <div style={{ padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#9a3412' }}>CV Auto-Formatter</h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#c2410c' }}>Select PROME users to automatically generate and attach standardized CVs for this bid.</p>
                <button className="primary-button" style={{ width: '100%', fontSize: '0.9rem', backgroundColor: '#f97316' }}>Select Staff</button>
              </div>
            )}
            
            {(!section.name.includes('Methodology') && !section.name.includes('Financial') && !section.name.includes('CV')) && (
               <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No specialized tools available for this section type yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
