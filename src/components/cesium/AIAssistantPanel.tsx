import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, Mic, Pencil, Send, X, Sparkles, Paperclip, Loader2 } from 'lucide-react';

interface AIAssistantPanelProps {
  onSendPrompt?: (prompt: string, attachments?: File[]) => void;
  onToggleDraw?: () => void;
  onToggleVoice?: () => void;
  isDrawing?: boolean;
  isListening?: boolean;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  onSendPrompt,
  onToggleDraw,
  onToggleVoice,
  isDrawing = false,
  isListening = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [pulseChevron, setPulseChevron] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isExpanded]);

  // Stop chevron pulse after first interaction
  useEffect(() => {
    if (isExpanded) setPulseChevron(false);
  }, [isExpanded]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (isExpanded && !prompt.trim()) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, prompt]);

  const handleSend = async () => {
    if (!prompt.trim() || isSending) return;
    setIsSending(true);
    setShowSuggestions(false);
    try {
      if (onSendPrompt) {
        await onSendPrompt(prompt, attachments);
      }
      setPrompt('');
      setAttachments([]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const suggestions = [
    'Generate a building layout at selected coordinates',
    'Analyze terrain elevation profile in this area',
    'Create a road alignment between two points',
    'Calculate earthwork volumes for selected region',
  ];

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: isExpanded ? '16px' : '0px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Expanded Panel ── */}
      <div
        style={{
          width: isExpanded ? '620px' : '0px',
          maxWidth: '90vw',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden',
          pointerEvents: isExpanded ? 'auto' : 'none',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.92))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '20px',
            border: '1px solid rgba(99, 179, 237, 0.15)',
            boxShadow: `
              0 0 0 1px rgba(99, 179, 237, 0.08),
              0 8px 32px rgba(0, 0, 0, 0.5),
              0 2px 8px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
            padding: '16px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#e2e8f0',
                letterSpacing: '0.02em',
              }}>
                PROME AI Assistant
              </span>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.12)',
                padding: '2px 8px',
                borderRadius: '10px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                Beta
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Suggestions */}
          {showSuggestions && !prompt && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '12px',
              animation: 'fadeIn 0.3s ease-out',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setPrompt(s); setShowSuggestions(false); inputRef.current?.focus(); }}
                  style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '10px',
                    color: '#a5b4fc',
                    fontSize: '0.7rem',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    e.currentTarget.style.color = '#c7d2fe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.color = '#a5b4fc';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Attachment Chips */}
          {attachments.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '10px',
            }}>
              {attachments.map((file, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.7rem',
                  color: '#6ee7b7',
                }}>
                  <Paperclip size={11} />
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6ee7b7',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      opacity: 0.7,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '14px',
            padding: '6px 8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {/* Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {/* Plus / Attach Files */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
                style={{
                  background: 'none',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                  e.currentTarget.style.color = '#a5b4fc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <Plus size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept=".dxf,.dwg,.ifc,.pdf,.png,.jpg,.svg,.gltf,.glb,.geojson,.kml,.kmz,.obj,.stl,.3dm,.3ds,.fbx"
              />

              {/* Mic / Voice */}
              <button
                onClick={onToggleVoice}
                title="Voice command"
                style={{
                  background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'none',
                  border: 'none',
                  borderRadius: '10px',
                  color: isListening ? '#f87171' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  animation: isListening ? 'micPulse 1.5s infinite' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isListening) {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                    e.currentTarget.style.color = '#fca5a5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isListening) {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <Mic size={18} />
              </button>

              {/* Pencil / Draw */}
              <button
                onClick={onToggleDraw}
                title="Draw on canvas"
                style={{
                  background: isDrawing ? 'rgba(245, 158, 11, 0.15)' : 'none',
                  border: 'none',
                  borderRadius: '10px',
                  color: isDrawing ? '#fbbf24' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isDrawing) {
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                    e.currentTarget.style.color = '#fcd34d';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDrawing) {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <Pencil size={18} />
              </button>

              {/* Divider */}
              <div style={{
                width: '1px',
                height: '20px',
                background: 'rgba(255, 255, 255, 0.08)',
                margin: '0 4px',
              }} />
            </div>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to design, analyze, or modify..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#f1f5f9',
                fontSize: '0.85rem',
                fontWeight: 400,
                lineHeight: 1.5,
                caretColor: '#818cf8',
              }}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || isSending}
              style={{
                background: prompt.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '10px',
                color: prompt.trim() ? '#fff' : '#475569',
                cursor: prompt.trim() ? 'pointer' : 'default',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s',
                boxShadow: prompt.trim() ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none',
                transform: prompt.trim() ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              {isSending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            </button>
          </div>

          {/* Footer Hint */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '8px',
          }}>
            <span style={{
              fontSize: '0.62rem',
              color: '#475569',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}>
              Press <kbd style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '0.6rem',
                fontFamily: 'monospace',
                color: '#94a3b8',
              }}>Enter</kbd> to send · <kbd style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '0.6rem',
                fontFamily: 'monospace',
                color: '#94a3b8',
              }}>Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>

      {/* ── Collapsed Chevron Trigger ── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isExpanded
            ? 'rgba(99, 102, 241, 0.2)'
            : 'linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.88))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isExpanded
            ? '1px solid rgba(99, 102, 241, 0.3)'
            : '1px solid rgba(99, 179, 237, 0.12)',
          borderRadius: '16px 16px 0 0',
          padding: isExpanded ? '6px 18px' : '10px 22px',
          cursor: 'pointer',
          color: isExpanded ? '#a5b4fc' : '#cbd5e1',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: isExpanded
            ? '0 -2px 12px rgba(99, 102, 241, 0.15)'
            : `0 -4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 179, 237, 0.06)`,
          animation: pulseChevron ? 'chevronPulse 3s ease-in-out infinite' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            e.currentTarget.style.boxShadow = '0 -4px 24px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.15)';
            e.currentTarget.style.color = '#a5b4fc';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.borderColor = 'rgba(99, 179, 237, 0.12)';
            e.currentTarget.style.boxShadow = '0 -4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 179, 237, 0.06)';
            e.currentTarget.style.color = '#cbd5e1';
          }
        }}
      >
        {/* Shimmer effect */}
        {!isExpanded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.08), transparent)',
            animation: 'shimmer 4s ease-in-out infinite',
          }} />
        )}
        <Sparkles size={14} style={{ opacity: 0.7, position: 'relative', zIndex: 1 }} />
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          position: 'relative',
          zIndex: 1,
        }}>
          {isExpanded ? '' : 'AI Assistant'}
        </span>
        {isExpanded ? (
          <ChevronDown size={16} style={{ position: 'relative', zIndex: 1 }} />
        ) : (
          <ChevronUp size={16} style={{ position: 'relative', zIndex: 1 }} />
        )}
      </button>

      {/* Injected Keyframe Animations */}
      <style>{`
        @keyframes chevronPulse {
          0%, 100% { box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 179, 237, 0.06); }
          50% { box-shadow: 0 -4px 24px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.2); }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
