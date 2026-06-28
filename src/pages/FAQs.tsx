import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Search, ChevronDown, ChevronUp, Bot, ArrowRight, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export default function FAQs() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  // Admin Create FAQ Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'General' });

  const isAdmin = user?.roles?.some((r: any) => r.name === 'Administrator');

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const res = await fetch('/api/faqs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
      }
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFAQ = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      alert("Please fill in both the question and answer.");
      return;
    }
    try {
      const res = await fetch('/api/faqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newFaq)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewFaq({ question: '', answer: '', category: 'General' });
        fetchFAQs();
      } else {
        alert("Failed to save FAQ.");
      }
    } catch (err) {
      console.error('Failed to save FAQ:', err);
    }
  };

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle color="#cc0000" size={28} />
            Frequently Asked Questions
          </h1>
          <p style={{ color: '#64748b' }}>Quick answers for common tools, modules, and processes inside the PROME portal.</p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} /> Add FAQ
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
        
        {/* FAQs List Area */}
        <div>
          {/* Search bar */}
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search FAQs by keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.95rem' }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat ? '#cc0000' : '#e2e8f0',
                  color: selectedCategory === cat ? '#ffffff' : '#475569',
                  transition: 'background-color 0.2s, color 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQs Accordion */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading FAQs...</div>
          ) : filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <HelpCircle size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#334155', margin: '0 0 0.5rem 0' }}>No FAQs found</h3>
              <p style={{ color: '#64748b', margin: 0 }}>Try modifying your search or select a different category.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredFaqs.map((faq) => {
                const isOpen = expandedFaqId === faq.id;
                return (
                  <div 
                    key={faq.id} 
                    style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      overflow: 'hidden',
                      boxShadow: isOpen ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                      transition: 'box-shadow 0.2s'
                    }}
                  >
                    <button
                      onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                      style={{
                        width: '100%',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cc0000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{faq.category}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{faq.question}</span>
                      </div>
                      {isOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid #f1f5f9', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#fafafa' }}>
                        <div style={{ paddingTop: '1rem' }}>{faq.answer}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Assistant Promo */}
        <div>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1rem auto' }}>
              <Bot color="#cc0000" size={24} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Ask PROME Assistant</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>Need specialized help or can't find your question here? Speak to our AI assistant in real-time.</p>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
              onClick={() => navigate('/ai-assistant')}
            >
              Ask Assistant <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Admin Add FAQ Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Frequently Asked Question</h2>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Category</label>
              <select 
                className="form-input" 
                style={{ width: '100%' }}
                value={newFaq.category}
                onChange={e => setNewFaq({...newFaq, category: e.target.value})}
              >
                <option value="General">General</option>
                <option value="CVs Compiler">CVs Compiler</option>
                <option value="Wiki & Documents">Wiki & Documents</option>
                <option value="ISO Quality">ISO Quality</option>
                <option value="Bids & Opportunities">Bids & Opportunities</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Question</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%' }}
                placeholder="e.g., How do I export my CV?"
                value={newFaq.question}
                onChange={e => setNewFaq({...newFaq, question: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Answer</label>
              <textarea 
                className="form-input" 
                style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                placeholder="Provide a clear, detailed answer..."
                value={newFaq.answer}
                onChange={e => setNewFaq({...newFaq, answer: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateFAQ}>Save FAQ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
