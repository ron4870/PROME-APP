import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Menu, Plus, Trash2, Loader, Paperclip, X as CloseIcon } from 'lucide-react';

export default function AIAssistant() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(true);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/ai/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (id: number) => {
    try {
      const res = await fetch(`/api/ai/sessions/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: 'New Chat' })
      });
      if (res.ok) {
        const data = await res.json();
        setSessions([data, ...sessions]);
        setActiveSessionId(data.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== id));
        if (activeSessionId === id) {
          setActiveSessionId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      // Create session on the fly
      try {
        const res = await fetch('/api/ai/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ title: (inputText.trim() ? inputText.substring(0, 30) + '...' : 'Document Analysis') })
        });
        if (res.ok) {
          const data = await res.json();
          setSessions([data, ...sessions]);
          currentSessionId = data.id;
          setActiveSessionId(data.id);
        }
      } catch (e) {
        console.error(e);
        return;
      }
    }

    if (!currentSessionId) return;

    const messageToSend = inputText;
    const fileToSend = attachment;
    setInputText('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const displayMsg = fileToSend ? (messageToSend ? `${messageToSend}\n[Attachment: ${fileToSend.name}]` : `[Attachment: ${fileToSend.name}]`) : messageToSend;

    setMessages(prev => [...prev, { id: 'temp', role: 'user', content: displayMsg }]);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', String(currentSessionId));
      if (messageToSend) formData.append('message', messageToSend);
      if (fileToSend) formData.append('file', fileToSend);

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        await fetchMessages(currentSessionId);
        fetchSessions(); // Update titles
      } else {
        const errorData = await res.json();
        alert('Failed to send message: ' + (errorData.error || 'Unknown error'));
        setMessages(prev => prev.filter(m => m.id !== 'temp'));
      }
    } catch (e) {
      console.error(e);
      alert('Network error while sending message.');
      setMessages(prev => prev.filter(m => m.id !== 'temp'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="module-page" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', padding: 0 }}>
      {/* Sidebar for Sessions */}
      <div 
        style={{ 
          width: isSessionsOpen ? '260px' : '0px', 
          backgroundColor: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
          <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: '#1e293b' }}>Chat History</h2>
        </div>
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <button 
            onClick={createSession}
            style={{ 
              width: '100%', padding: '0.75rem', backgroundColor: '#fff', border: '1px dashed #cbd5e1', 
              borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', color: '#0f172a', fontWeight: 500
            }}
          >
            <Plus size={18} /> New Chat
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                style={{ 
                  padding: '0.75rem', 
                  backgroundColor: activeSessionId === session.id ? '#e2e8f0' : 'transparent',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <Bot size={16} color="#64748b" />
                  <span style={{ fontSize: '0.875rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session.title}
                  </span>
                </div>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#fff' }}>
          <button 
            onClick={() => setIsSessionsOpen(!isSessionsOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <Menu size={24} />
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot color="#cc0000" /> PROME AI Assistant
          </h1>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#fcfcfc' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <Bot size={64} color="#e2e8f0" style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>How can I help you today?</h2>
              <p style={{ textAlign: 'center', maxWidth: '600px', lineHeight: 1.5, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                I am the PROME AI Assistant with Lead Auditor & QMS Administrator capabilities. I can help you monitor 2026 Quality Objectives & quarterly reviews, inspect Management Review records, query the Corporate Risk Register & variations, track ISO compliance, and conduct autonomous internal audits.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '820px' }}>
                <button
                  onClick={() => setInputText("List all 2026 Quality Objectives (PROME-QOBJ-PMBDD-01 to 05), showing their strategic goals, 2026 targets, Q1-Q4 quarterly review progress, and verification records.")}
                  style={{ backgroundColor: '#fff', border: '1px solid #fecaca', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#991b1b', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', fontWeight: '600' }}
                >
                  🎯 2026 Quality Objectives & Quarterly Status (ISO 6.2)
                </button>
                <button
                  onClick={() => setInputText("Show our latest Management Review Meeting records (MRM), including executive decisions, ISO 9.3 agenda inputs, and open action items.")}
                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                >
                  📋 Management Review Records (ISO 9.3)
                </button>
                <button
                  onClick={() => setInputText("Review the Corporate Risk Register: show our highest-scoring risks, mitigation plans, deadlines, and project variations & claims.")}
                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                >
                  ⚠️ Risk Register & Variations / Claims
                </button>
                <button
                  onClick={() => setInputText("Search the Document Masterlist and digital Forms Directory for all active procedures, manuals, and updated operational forms.")}
                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                >
                  📝 Forms Directory & Document Masterlist
                </button>
                <button
                  onClick={() => setInputText("Load the official 23 October 2026 ISO Internal Audit Program (PROME-IMSR-PMBDD-28), show the 7 interview sessions with their 36 targeted questions, and prepare the audit.")}
                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                >
                  📅 Load 23 Oct 2026 Audit Program
                </button>
                <button
                  onClick={() => setInputText("What mandatory documents and records are required by ISO standards, where in the PROME IMS are they stored, and which ones are currently missing or need updating?")}
                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                >
                  🛡️ Check ISO Mandatory Records & Missing Docs
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} style={{ display: 'flex', gap: '1rem', maxWidth: '800px', margin: msg.role === 'user' ? '0 0 0 auto' : '0 auto 0 0', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: msg.role === 'user' ? '#e2e8f0' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {msg.role === 'user' ? <User size={20} color="#475569" /> : <Bot size={20} color="#cc0000" />}
                </div>
                <div style={{ 
                  backgroundColor: msg.role === 'user' ? '#1e293b' : '#fff', 
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  padding: '1rem 1.25rem', 
                  borderRadius: '1rem',
                  borderTopRightRadius: msg.role === 'user' ? '0.25rem' : '1rem',
                  borderTopLeftRadius: msg.role === 'model' ? '0.25rem' : '1rem',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  border: msg.role === 'model' ? '1px solid #e2e8f0' : 'none',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {(() => {
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const parts = (msg.content || '').split(urlRegex);
                    return parts.map((part: string, i: number) => {
                      if (part.match(urlRegex)) {
                        return (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: msg.role === 'user' ? '#93c5fd' : '#cc0000',
                              textDecoration: 'underline',
                              fontWeight: 600,
                              wordBreak: 'break-all'
                            }}
                          >
                            {part}
                          </a>
                        );
                      }
                      return part;
                    });
                  })()}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div style={{ display: 'flex', gap: '1rem', maxWidth: '800px', margin: '0 auto 0 0' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={20} color="#cc0000" />
              </div>
              <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '1rem', borderTopLeftRadius: '0.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader size={16} className="spin" color="#64748b" />
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.5rem 2rem', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0' }}>
          {attachment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', width: 'fit-content' }}>
              <Paperclip size={14} color="#64748b" />
              <span style={{ fontSize: '0.875rem', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><CloseIcon size={14} color="#ef4444" /></button>
            </div>
          )}
          <div style={{ 
            maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: '0.5rem',
            backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '1rem', padding: '0.5rem',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
                padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.2s', flexShrink: 0
              }}
            >
              <Paperclip size={20} />
            </button>
            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask PROME AI..."
              style={{ 
                flex: 1, border: 'none', background: 'transparent', resize: 'none', outline: 'none', 
                padding: '0.75rem', fontFamily: 'inherit', fontSize: '1rem', color: '#1e293b',
                maxHeight: '150px', minHeight: '50px'
              }}
              rows={1}
            />
            <button 
              onClick={sendMessage}
              disabled={(!inputText.trim() && !attachment) || isLoading}
              style={{ 
                background: (inputText.trim() || attachment) && !isLoading ? '#cc0000' : '#e2e8f0', 
                color: (inputText.trim() || attachment) && !isLoading ? '#fff' : '#94a3b8', 
                border: 'none', borderRadius: '0.75rem', width: '44px', height: '44px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: (inputText.trim() || attachment) && !isLoading ? 'pointer' : 'default',
                transition: 'all 0.2s', flexShrink: 0
              }}
            >
              <Send size={20} style={{ marginLeft: '2px' }} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            AI Assistant can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
      
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
