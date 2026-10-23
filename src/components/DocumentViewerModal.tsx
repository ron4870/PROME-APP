import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Download, 
  FileText, 
  Calendar, 
  Maximize2, 
  Minimize2,
  AlertCircle
} from 'lucide-react';

export interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  fileUrl?: string | null;
  documentNumber?: string;
  documentDate?: string;
  categoryLabel?: string;
}

/**
 * Resolves various stored fileUrl formats (JSON strings, Google Drive links, local paths)
 * into appropriate preview and download URLs.
 */
export function resolveDocumentViewUrls(fileUrl?: string | null): { 
  viewUrl: string | null; 
  downloadUrl: string | null; 
  isPdf: boolean; 
  isImage: boolean; 
  isDrive: boolean; 
} {
  if (!fileUrl) {
    return { viewUrl: null, downloadUrl: null, isPdf: false, isImage: false, isDrive: false };
  }

  let rawView: string = fileUrl;
  let rawDownload: string = fileUrl;
  let isPdf = false;
  let isDrive = false;

  // 1. Check if stored as JSON metadata string
  try {
    const parsed = JSON.parse(fileUrl);
    if (parsed && typeof parsed === 'object') {
      if (parsed.id && !String(parsed.id).startsWith('local-')) {
        // Google Drive file ID
        isDrive = true;
        rawView = `https://drive.google.com/file/d/${parsed.id}/preview`;
        rawDownload = parsed.download || `https://drive.google.com/uc?export=download&id=${parsed.id}`;
      } else {
        rawView = parsed.view || parsed.download || fileUrl;
        rawDownload = parsed.download || parsed.view || fileUrl;
      }
      if (parsed.isPdf) isPdf = true;
    }
  } catch {
    // Plain string URL
  }

  // 2. Check if rawView is a Google Drive direct URL
  const driveMatch = rawView.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    isDrive = true;
    rawView = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    rawDownload = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  const lower = rawView.toLowerCase();
  if (lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('/pdf')) {
    isPdf = true;
  }

  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.svg');

  return {
    viewUrl: rawView,
    downloadUrl: rawDownload,
    isPdf,
    isImage,
    isDrive
  };
}

export const DocumentViewerModal: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  documentTitle,
  fileUrl,
  documentNumber,
  documentDate,
  categoryLabel
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasFrameError, setHasFrameError] = useState(false);

  if (!isOpen) return null;

  const { viewUrl, downloadUrl, isImage } = resolveDocumentViewUrls(fileUrl);

  const handleOpenExternal = () => {
    if (viewUrl) {
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: isMaximized ? '0' : '1rem',
        transition: 'all 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: isMaximized ? '0' : '12px',
          width: isMaximized ? '100vw' : '92vw',
          maxWidth: isMaximized ? '100vw' : '1280px',
          height: isMaximized ? '100vh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}
      >
        {/* Top Header */}
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Document metadata left side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={20} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.05rem', 
                  fontWeight: 700, 
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '500px'
                }}>
                  {documentTitle || 'Document Viewer'}
                </h3>
                
                {documentNumber && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontWeight: 600
                  }}>
                    {documentNumber}
                  </span>
                )}

                {categoryLabel && (
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 600
                  }}>
                    {categoryLabel}
                  </span>
                )}
              </div>

              {documentDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#64748b' }}>
                  <Calendar size={13} />
                  <span>Document Date: <strong>{documentDate}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {viewUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                title="Open in new window / tab"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <ExternalLink size={15} /> Open in Window
              </button>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                title="Download document file"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#15803d',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dcfce7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }}
              >
                <Download size={15} /> Download
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore window size" : "Maximize window"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: '#64748b',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close viewer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Viewer Frame / Content */}
        <div style={{ flex: 1, backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}>
          {!viewUrl ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <AlertCircle size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>
                Document File Unavailable
              </h4>
              <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '400px' }}>
                There is no readable file link attached to this document record.
              </p>
            </div>
          ) : isImage ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              overflow: 'auto',
              padding: '1.5rem',
              backgroundColor: '#0f172a'
            }}>
              <img
                src={viewUrl}
                alt={documentTitle}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              />
            </div>
          ) : (
            <iframe
              src={viewUrl}
              title={documentTitle}
              onError={() => setHasFrameError(true)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          )}

          {/* Fallback Banner if embedding is blocked */}
          {hasFrameError && (
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              fontSize: '0.85rem'
            }}>
              <span>Browser security may block inline preview.</span>
              <button
                type="button"
                onClick={handleOpenExternal}
                style={{
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Open in Full Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DocumentViewerModal;
