import { useState, useRef, useMemo } from 'react';
import { Upload, Loader2, Plus, Trash2, CheckSquare, AlertCircle, BookOpen } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  mandatory: boolean;
  completed: boolean;
  reference?: string;
}

interface Props {
  sectionId: number;
  checklist: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function BidChecklistBuilder({ sectionId, checklist, onChange }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF document for checklist generation.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('document', file);

      const res = await fetch(`${API_BASE}/bids/sections/${sectionId}/generate-checklist`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to generate checklist');
      }

      const newItems: ChecklistItem[] = await res.json();
      
      // Combine with existing items, avoiding duplicates by task text could be complex, 
      // so we just append. Or replace if the user wants to start fresh.
      onChange([...checklist, ...newItems]);
      
    } catch (err) {
      alert('Error generating checklist. Make sure the file is a readable PDF.');
    } finally {
      setIsGenerating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleItem = (id: string) => {
    onChange(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const removeItem = (id: string) => {
    onChange(checklist.filter(item => item.id !== id));
  };

  const handleAddManualItem = () => {
    if (!newTaskText) return;
    const item: ChecklistItem = {
      id: Math.random().toString(36).substring(7),
      category: newTaskCategory || 'General',
      task: newTaskText,
      mandatory: false,
      completed: false
    };
    onChange([...checklist, item]);
    setNewTaskText('');
  };

  // Group items by category
  const groupedChecklist = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    checklist.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [checklist]);

  const categories = Object.keys(groupedChecklist).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* AI Generator Section */}
      <div style={{ padding: '2rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#166534', margin: '0 0 0.5rem 0' }}>AI Checklist Generator</h3>
        <p style={{ color: '#15803d', fontSize: '0.95rem', margin: '0 0 1.5rem 0' }}>
          Upload the Tender or RFP document (PDF). AI will analyze the requirements and automatically build a robust preparation checklist.
        </p>
        
        <input 
          type="file" 
          accept=".pdf"
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileUpload}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          style={{ 
            padding: '0.75rem 1.5rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '8px', 
            fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer'
          }}
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {isGenerating ? 'Analyzing Document...' : 'Upload Tender PDF'}
        </button>
      </div>

      {/* Manual Add Section */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Category</label>
          <input 
            type="text" 
            value={newTaskCategory}
            onChange={e => setNewTaskCategory(e.target.value)}
            placeholder="e.g. Administrative"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div style={{ flex: 3 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Checklist Item</label>
          <input 
            type="text" 
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            placeholder="e.g. Ensure all pages are stamped..."
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            onKeyDown={e => e.key === 'Enter' && handleAddManualItem()}
          />
        </div>
        <button 
          onClick={handleAddManualItem}
          disabled={!newTaskText}
          style={{ 
            padding: '0.5rem 1rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '6px', 
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', height: '38px' 
          }}
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Checklist Display */}
      {categories.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {categories.map(category => {
            const items = groupedChecklist[category];
            const completedCount = items.filter(i => i.completed).length;
            const progress = Math.round((completedCount / items.length) * 100);
            
            return (
              <div key={category} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} color="#475569" /> {category}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{completedCount} / {items.length} completed</span>
                    <div style={{ width: '100px', height: '6px', backgroundColor: '#cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map((item, idx) => (
                    <div key={item.id} style={{ 
                      padding: '1rem 1.5rem', borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background-color 0.2s',
                      backgroundColor: item.completed ? '#f8fafc' : 'white'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={item.completed}
                        onChange={() => toggleItem(item.id)}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: '#10b981' }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                          <AlertCircle size={12} /> Mandatory
                        </div>
                      )}
                      
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          No checklist items yet. Upload a document to generate items or add them manually.
        </div>
      )}
    </div>
  );
}
