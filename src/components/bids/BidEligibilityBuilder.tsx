import { useState, useRef, useMemo } from 'react';
import { Upload, Loader2, Plus, Trash2, CheckSquare, AlertCircle, BookOpen, FileCheck } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export interface EligibilityItem {
  id: string;
  category: string;
  task: string;
  mandatory: boolean;
  completed: boolean;
  reference?: string;
}

export interface ComplianceDocument {
  id: string;
  name: string;
  url: string; // base64 string
  type: string;
  date: string;
}

interface Props {
  sectionId: number;
  data: any;
  onChange: (data: any) => void;
}

export default function BidEligibilityBuilder({ sectionId, data, onChange }: Props) {
  const [items, setItems] = useState<EligibilityItem[]>(data?.eligibilityList || []);
  const [documents, setDocuments] = useState<ComplianceDocument[]>(data?.complianceDocuments || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://207.180.197.219:5000/api/bids/sections/${sectionId}/generate-eligibility`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Failed to generate eligibility requirements');
      
      const responseData = await res.json();
      setItems(responseData.checklist);
      onChange({ ...data, eligibilityList: responseData.checklist, complianceDocuments: documents });
    } catch (err) {
      alert('Error generating eligibility requirements');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItem = async (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(newItems);
    onChange({ ...data, eligibilityList: newItems, complianceDocuments: documents });
  };

  const addItem = async () => {
    if (!newItemText.trim()) return;
    const newItem: EligibilityItem = {
      id: Math.random().toString(36).substring(7),
      category: 'Custom',
      task: newItemText,
      mandatory: true,
      completed: false
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    setNewItemText('');
    onChange({ ...data, eligibilityList: newItems, complianceDocuments: documents });
  };

  const deleteItem = async (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    onChange({ ...data, eligibilityList: newItems, complianceDocuments: documents });
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !newDocName.trim()) return alert("Please name the document before uploading");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = reader.result as string;
      const newDoc: ComplianceDocument = {
        id: Math.random().toString(36).substring(7),
        name: newDocName,
        type: file.type,
        url: base64Str,
        date: new Date().toISOString()
      };
      
      const newDocs = [...documents, newDoc];
      setDocuments(newDocs);
      setNewDocName('');
      if (docUploadRef.current) docUploadRef.current.value = '';
      
      onChange({ ...data, eligibilityList: items, complianceDocuments: newDocs });
    };
    reader.readAsDataURL(file);
  };

  const deleteDocument = async (id: string) => {
    const newDocs = documents.filter(doc => doc.id !== id);
    setDocuments(newDocs);
    onChange({ ...data, eligibilityList: items, complianceDocuments: newDocs });
  };

  const compilePDF = async () => {
    if (documents.length === 0) return alert('No documents uploaded to compile.');
    setIsCompiling(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const doc of documents) {
        if (doc.type === 'application/pdf') {
          // It's a base64 Data URL, we need to strip the prefix to load it
          const base64Data = doc.url.split(',')[1];
          const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const loadedPdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(loadedPdf, loadedPdf.getPageIndices());
          copiedPages.forEach(page => mergedPdf.addPage(page));
        } else if (doc.type.startsWith('image/')) {
          const base64Data = doc.url.split(',')[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          let image;
          if (doc.type === 'image/jpeg' || doc.type === 'image/jpg') {
            image = await mergedPdf.embedJpg(imageBytes);
          } else if (doc.type === 'image/png') {
            image = await mergedPdf.embedPng(imageBytes);
          }

          if (image) {
            const page = mergedPdf.addPage();
            const { width, height } = page.getSize();
            const imgDims = image.scaleToFit(width - 40, height - 40);
            page.drawImage(image, {
              x: width / 2 - imgDims.width / 2,
              y: height / 2 - imgDims.height / 2,
              width: imgDims.width,
              height: imgDims.height
            });
          }
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Eligibility_Compiled_${new Date().getTime()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error compiling PDF:', error);
      alert('Failed to compile the PDF. Please check the uploaded files.');
    } finally {
      setIsCompiling(false);
    }
  };

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, EligibilityItem[]>);
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* SECTION 1: Checklist */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Eligibility & Compliance Checklist</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Upload the tender document to auto-extract eligibility requirements, or add them manually.</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 500, fontSize: '0.9rem', border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}
          >
            {isGenerating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={18} />}
            {isGenerating ? 'Analyzing...' : 'Auto-Extract (PDF)'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleGenerate} accept=".pdf" style={{ display: 'none' }} />
        </div>

        {items.length === 0 && !isGenerating && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', border: '2px dashed #cbd5e1' }}>
            <CheckSquare size={32} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>No requirements added yet.</p>
          </div>
        )}

        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{category}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categoryItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: item.completed ? '#f8fafc' : '#ffffff', border: `1px solid ${item.completed ? '#e2e8f0' : '#cbd5e1'}`, borderRadius: '8px', transition: 'all 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleItem(item.id)}
                    style={{ marginTop: '0.25rem', width: '1.1rem', height: '1.1rem', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#94a3b8' : '#0f172a', fontSize: '0.95rem' }}>
                    <div>{item.task}</div>
                    {item.reference && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                        <BookOpen size={12} /> {item.reference}
                      </div>
                    )}
                  </div>
                  {item.mandatory && !item.completed && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: '#fef2f2', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px' }}>
                      <AlertCircle size={12} /> Mandatory
                    </span>
                  )}
                  <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '0.25rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add a custom requirement..."
            style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', color: '#334155', padding: '0 1rem', borderRadius: '8px', fontWeight: 500, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <Plus size={18} /> Add
          </button>
        </div>
      </div>

      {/* SECTION 2: Compliance Documents Compiler */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Compliance Documents</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Upload administrative documents here. You can compile them all into a single PDF later.</p>
          </div>
          
          <button 
            onClick={compilePDF}
            disabled={isCompiling || documents.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 500, fontSize: '0.9rem', border: 'none', cursor: (isCompiling || documents.length === 0) ? 'not-allowed' : 'pointer', opacity: (isCompiling || documents.length === 0) ? 0.7 : 1 }}
          >
            {isCompiling ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <FileCheck size={18} />}
            {isCompiling ? 'Compiling...' : 'Compile Eligibility PDF'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            placeholder="Document Name (e.g. Trading License 2026)"
            style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }}
          />
          <button onClick={() => docUploadRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', color: '#334155', padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: 500, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <Upload size={18} /> Browse File
          </button>
          <input type="file" ref={docUploadRef} onChange={handleDocUpload} accept=".pdf,image/*" style={{ display: 'none' }} />
        </div>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', border: '2px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b' }}>No compliance documents uploaded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, color: '#334155', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{doc.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{new Date(doc.date).toLocaleDateString()}</div>
                </div>
                <button onClick={() => deleteDocument(doc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: 0.7 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
