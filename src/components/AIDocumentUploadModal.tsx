import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Sparkles, 
  Upload, 
  X, 
  FileText, 
  Check, 
  AlertCircle, 
  Loader2, 
  Mail, 
  ClipboardList, 
  FileDiff, 
  CreditCard, 
  Trash2, 
  CheckCircle2, 
  Plus,
  Folder,
  Archive,
  Layers,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { DocumentViewerModal } from './DocumentViewerModal';

export type ProjectDocCategory = 'correspondence' | 'documents' | 'daily_reports' | 'variations' | 'payment_invoices';

export interface ClassifiedItem {
  tempId: string;
  originalName: string;
  size: number;
  mimeType: string;
  fileUrl: string | null;
  category: ProjectDocCategory;
  categoryLabel: string;
  confidence: number;
  reasoning: string;
  fields: Record<string, any>;
  unfilledFields: string[];
  needsReview?: boolean;
  isDuplicate?: boolean;
  duplicateInfo?: {
    existingId?: number;
    existingTitle?: string;
    existingRef?: string;
    category?: string;
    categoryLabel?: string;
    reason?: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  projectName?: string;
  token: string | null;
  onSuccess: () => void;
  onNavigateTab?: (tabId: string) => void;
}

const CATEGORY_CONFIG: Record<ProjectDocCategory, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  correspondence: {
    label: 'Correspondence',
    icon: <Mail size={16} />,
    color: '#0284c7',
    bgColor: '#e0f2fe',
    borderColor: '#7dd3fc'
  },
  documents: {
    label: 'Project Documents',
    icon: <FileText size={16} />,
    color: '#0369a1',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  daily_reports: {
    label: 'Daily Reports',
    icon: <ClipboardList size={16} />,
    color: '#b45309',
    bgColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  variations: {
    label: 'Variations & Claims',
    icon: <FileDiff size={16} />,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  payment_invoices: {
    label: 'Payments / Invoices',
    icon: <CreditCard size={16} />,
    color: '#15803d',
    bgColor: '#dcfce7',
    borderColor: '#bbf7d0'
  }
};

export const AIDocumentUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  token,
  onSuccess,
  onNavigateTab
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [userCategoryHint, setUserCategoryHint] = useState('');
  const [classificationProgress, setClassificationProgress] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs_review' | 'duplicates' | 'ready'>('all');
  const [classifiedItems, setClassifiedItems] = useState<ClassifiedItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const extractZipFiles = async (zipFile: File): Promise<File[]> => {
    const zip = new JSZip();
    const loaded = await zip.loadAsync(zipFile);
    const result: File[] = [];

    for (const [relativePath, entry] of Object.entries(loaded.files)) {
      if (entry.dir || relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) {
        continue;
      }
      const blob = await entry.async('blob');
      const fileName = relativePath.split('/').pop() || relativePath;

      let mime = 'application/octet-stream';
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.pdf')) mime = 'application/pdf';
      else if (lower.endsWith('.docx')) mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (lower.endsWith('.doc')) mime = 'application/msword';
      else if (lower.endsWith('.xlsx')) mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (lower.endsWith('.xls')) mime = 'application/vnd.ms-excel';
      else if (lower.endsWith('.txt')) mime = 'text/plain';
      else if (lower.endsWith('.csv')) mime = 'text/csv';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
      else if (lower.endsWith('.png')) mime = 'image/png';
      else if (lower.endsWith('.dwg') || lower.endsWith('.dxf')) mime = 'application/acad';

      const unpackedFile = new File([blob], fileName, { type: mime, lastModified: Date.now() });
      (unpackedFile as any).customPath = relativePath;
      result.push(unpackedFile);
    }
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      if (e.target) e.target.value = '';
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(
        f => !f.name.startsWith('.') && !f.name.includes('__MACOSX')
      );
      setSelectedFiles(prev => [...prev, ...filesArray]);
      if (e.target) e.target.value = '';
    }
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUnpacking(true);
      setErrorMsg(null);
      try {
        const incoming = Array.from(e.target.files);
        const extracted: File[] = [];
        for (const f of incoming) {
          if (f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip')) {
            const files = await extractZipFiles(f);
            extracted.push(...files);
          } else {
            extracted.push(f);
          }
        }
        setSelectedFiles(prev => [...prev, ...extracted]);
      } catch (err: any) {
        console.error('Failed to unpack zip:', err);
        setErrorMsg(`Failed to extract ZIP archive: ${err.message || 'Corrupt or unreadable zip file'}`);
      } finally {
        setIsUnpacking(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsUnpacking(true);
      setErrorMsg(null);
      try {
        const incoming = Array.from(e.dataTransfer.files);
        const processed: File[] = [];
        for (const f of incoming) {
          if (f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip')) {
            const extracted = await extractZipFiles(f);
            processed.push(...extracted);
          } else {
            processed.push(f);
          }
        }
        setSelectedFiles(prev => [...prev, ...processed]);
      } catch (err: any) {
        console.error('Drop processing error:', err);
        setErrorMsg(`Failed to process dropped files: ${err.message || 'Drop error'}`);
      } finally {
        setIsUnpacking(false);
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAIClassification = async () => {
    if (selectedFiles.length === 0) return;
    setIsClassifying(true);
    setErrorMsg(null);
    setClassificationProgress(null);

    const BATCH_SIZE = 5;
    const filesToProcess = [...selectedFiles];
    const totalFiles = filesToProcess.length;

    try {
      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = filesToProcess.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);

        setClassificationProgress(
          totalBatches > 1
            ? `Analyzing batch ${batchNum} of ${totalBatches} (${batch.length} files)...`
            : `Reading and classifying ${batch.length} document${batch.length !== 1 ? 's' : ''}...`
        );

        const formData = new FormData();
        batch.forEach(file => {
          formData.append('files', file);
        });
        if (userCategoryHint.trim()) {
          formData.append('userHint', userCategoryHint.trim());
        }

        try {
          const res = await fetch(`/api/projects/${projectId}/ai-classify-upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || `Server responded with ${res.status}`);
          }

          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            setClassifiedItems(prev => [...prev, ...data.items]);
          }
        } catch (batchErr: any) {
          console.warn(`Batch ${batchNum} encountered error, creating fallback review cards:`, batchErr);
          const fallbackItems: ClassifiedItem[] = batch.map((file, bIdx) => ({
            tempId: `fallback-${Date.now()}-${i + bIdx}`,
            originalName: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            fileUrl: null,
            category: 'documents',
            categoryLabel: 'Project Documents',
            confidence: 0.2,
            reasoning: 'Document content could not be read automatically. Please verify section and fill missing details.',
            fields: {
              title: file.name.replace(/\.[^/.]+$/, ''),
              documentNumber: '',
              type: 'General',
              revision: '1.0',
              status: 'Draft',
              issueDate: new Date().toISOString().split('T')[0]
            },
            unfilledFields: ['documentNumber', 'title'],
            needsReview: true
          }));
          setClassifiedItems(prev => [...prev, ...fallbackItems]);
        }
      }

      // Clear pending file queue after classification
      setSelectedFiles([]);
    } catch (err: any) {
      console.error('Classification error:', err);
      setErrorMsg(err.message || 'Error occurred while processing documents.');
    } finally {
      setIsClassifying(false);
      setClassificationProgress(null);
    }
  };

  const handleCategoryChange = (tempId: string, newCategory: ProjectDocCategory) => {
    setClassifiedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      
      // Update category and preserve document date across all tabs
      let newFields = { ...item.fields };
      const preservedDocDate = newFields.documentDate || newFields.date || newFields.issueDate || '';

      if (newCategory === 'correspondence') {
        newFields = {
          referenceNumber: newFields.referenceNumber || newFields.documentNumber || `CORR-${Date.now().toString().slice(-4)}`,
          type: newFields.type || 'Incoming',
          category: 'Letter',
          subject: newFields.subject || newFields.title || item.originalName.replace(/\.[^/.]+$/, ''),
          sender: newFields.sender || 'Contractor',
          recipient: newFields.recipient || 'Consultant',
          documentDate: preservedDocDate,
          date: preservedDocDate
        };
      } else if (newCategory === 'documents') {
        newFields = {
          documentNumber: newFields.documentNumber || newFields.referenceNumber || `DOC-${Date.now().toString().slice(-4)}`,
          title: newFields.title || newFields.subject || item.originalName.replace(/\.[^/.]+$/, ''),
          type: newFields.type || 'Report',
          revision: newFields.revision || '1.0',
          status: newFields.status || 'Draft',
          documentDate: preservedDocDate,
          issueDate: preservedDocDate
        };
      } else if (newCategory === 'daily_reports') {
        newFields = {
          documentDate: preservedDocDate,
          date: preservedDocDate,
          location: newFields.location || '',
          weatherCondition: newFields.weatherCondition || 'Fair',
          manpowerCount: newFields.manpowerCount || 0,
          equipmentCount: newFields.equipmentCount || 0,
          summary: newFields.summary || newFields.subject || newFields.title || `Site activities for ${item.originalName}`
        };
      } else if (newCategory === 'variations') {
        newFields = {
          referenceNumber: newFields.referenceNumber || `VO-${Date.now().toString().slice(-4)}`,
          title: newFields.title || newFields.subject || item.originalName.replace(/\.[^/.]+$/, ''),
          description: newFields.description || '',
          costImpact: newFields.costImpact || 0,
          scheduleImpactDays: newFields.scheduleImpactDays || 0,
          documentDate: preservedDocDate,
          date: preservedDocDate,
          status: 'Proposed'
        };
      } else if (newCategory === 'payment_invoices') {
        newFields = {
          documentNumber: newFields.documentNumber || `INV-${Date.now().toString().slice(-4)}`,
          title: newFields.title || item.originalName.replace(/\.[^/.]+$/, ''),
          type: newFields.type || 'Consultant Invoice',
          revision: newFields.revision || '1.0',
          status: newFields.status || 'Submitted',
          documentDate: preservedDocDate,
          issueDate: preservedDocDate
        };
      }

      return {
        ...item,
        category: newCategory,
        categoryLabel: CATEGORY_CONFIG[newCategory].label,
        fields: newFields
      };
    }));
  };

  const handleFieldChange = (tempId: string, fieldName: string, value: any) => {
    setClassifiedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updatedFields: Record<string, any> = {
        ...item.fields,
        [fieldName]: value
      };
      // Keep documentDate synchronized with date/issueDate
      if (fieldName === 'documentDate') {
        if ('date' in updatedFields || item.category === 'correspondence' || item.category === 'daily_reports' || item.category === 'variations') {
          updatedFields.date = value;
        }
        if ('issueDate' in updatedFields || item.category === 'documents' || item.category === 'payment_invoices') {
          updatedFields.issueDate = value;
        }
      } else if (fieldName === 'date' || fieldName === 'issueDate') {
        updatedFields.documentDate = value;
      }
      return {
        ...item,
        fields: updatedFields
      };
    }));
  };

  const removeClassifiedItem = (tempId: string) => {
    setClassifiedItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleSaveAll = async () => {
    if (classifiedItems.length === 0) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        items: classifiedItems.map(item => ({
          category: item.category,
          fields: item.fields,
          fileUrl: item.fileUrl,
          originalName: item.originalName
        }))
      };

      const res = await fetch(`/api/projects/${projectId}/bulk-save-classified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to place documents in project sections');
      }

      const data = await res.json();
      setSavedCount(data.savedCount || classifiedItems.length);
      setSaveSuccess(true);
      onSuccess(); // refresh workspace modules
    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMsg(err.message || 'Failed to place documents. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAndClose = () => {
    setSelectedFiles([]);
    setClassifiedItems([]);
    setUserCategoryHint('');
    setIsUnpacking(false);
    setClassificationProgress(null);
    setReviewFilter('all');
    setSaveSuccess(false);
    setErrorMsg(null);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to right, #f8fafc, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                AI Document Upload & Classification
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                {projectName ? `${projectName} • ` : ''}Automatic classification into Correspondence, Documents, Daily Reports, and more
              </p>
            </div>
          </div>
          <button 
            onClick={handleResetAndClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SUCCESS STATE */}
          {saveSuccess ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                Documents Successfully Placed!
              </h3>
              <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '520px', margin: '0 auto 2rem auto' }}>
                {savedCount} document{savedCount !== 1 ? 's have' : ' has'} been classified, logged, and securely filed into the appropriate project sections.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleResetAndClose}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem' }}
                >
                  <Check size={16} /> Return to Workspace
                </button>
                {onNavigateTab && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        onNavigateTab('correspondence');
                        handleResetAndClose();
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Mail size={16} /> View Correspondence
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        onNavigateTab('documents');
                        handleResetAndClose();
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <FileText size={16} /> View Documents
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        onNavigateTab('daily_reports');
                        handleResetAndClose();
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <ClipboardList size={16} /> View Daily Reports
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: DROPZONE, BULK UPLOAD & PENDING FILES */}
              {classifiedItems.length === 0 && (
                <div>
                  {/* Hidden inputs for multi-files, folder, and zip */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    multiple 
                    style={{ display: 'none' }} 
                  />
                  <input 
                    type="file" 
                    ref={folderInputRef} 
                    {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
                    onChange={handleFolderSelect} 
                    style={{ display: 'none' }} 
                  />
                  <input 
                    type="file" 
                    ref={zipInputRef} 
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleZipSelect} 
                    style={{ display: 'none' }} 
                  />

                  {/* BULK UPLOAD ACTION PANEL */}
                  <div style={{
                    marginBottom: '1.25rem',
                    padding: '1.1rem 1.25rem',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#0284c7',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                      }}>
                        <Layers size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0369a1' }}>
                            Bulk Upload
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: '#0284c7',
                            color: 'white',
                            fontWeight: 600
                          }}>
                            Folder • ZIP • Multi-File
                          </span>
                        </div>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#0c4a6e' }}>
                          Import a complete directory, unpack a ZIP archive, or select multiple files at once.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #7dd3fc',
                          borderRadius: '8px',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: '#0369a1',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                          e.currentTarget.style.borderColor = '#0284c7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#7dd3fc';
                        }}
                      >
                        <Folder size={16} color="#0284c7" /> Select Folder
                      </button>

                      <button
                        type="button"
                        onClick={() => zipInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #7dd3fc',
                          borderRadius: '8px',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: '#0369a1',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                          e.currentTarget.style.borderColor = '#0284c7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#7dd3fc';
                        }}
                      >
                        <Archive size={16} color="#0284c7" /> Select ZIP Archive
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: '#0284c7',
                          border: '1px solid #0284c7',
                          borderRadius: '8px',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0369a1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#0284c7';
                        }}
                      >
                        <Upload size={16} /> Select Multiple Files
                      </button>
                    </div>
                  </div>

                  {/* UNPACKING SPINNER NOTIFICATION */}
                  {isUnpacking && (
                    <div style={{
                      padding: '0.875rem 1.25rem',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      marginBottom: '1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Unpacking ZIP archive contents... Extracting documents for AI classification.</span>
                    </div>
                  )}

                  {/* DROPZONE */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #0284c7',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      padding: '2.25rem 1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem auto'
                    }}>
                      <Upload size={24} />
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
                      Drag and drop files, folders, or ZIP archives here
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                      Supports PDF, Word (.docx), Excel (.xlsx), Drawings (.dwg/.dxf), Images, Text files, and ZIP archives
                    </p>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <FileText size={15} /> Browse Files
                      </button>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }}
                      >
                        <Folder size={15} /> Browse Folder
                      </button>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          zipInputRef.current?.click();
                        }}
                      >
                        <Archive size={15} /> Browse ZIP
                      </button>
                    </div>
                  </div>

                  {/* USER CATEGORY & CONTEXT GUIDANCE (OPTIONAL) */}
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1.1rem 1.25rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Sparkles size={16} color="#4f46e5" />
                        AI Category & Context Guidance (Optional)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Guides Gemini LLM classification & field extraction
                      </span>
                    </div>

                    <input
                      type="text"
                      value={userCategoryHint}
                      onChange={(e) => setUserCategoryHint(e.target.value)}
                      placeholder='e.g., "These are incoming contractor letters and transmittals", "Pier 4 daily progress reports", "Civil drawings", "IPC No. 3 invoices"...'
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    {/* Quick suggestion chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Quick suggestions:</span>
                      {[
                        { label: '✉️ Correspondence', hint: 'Contractor correspondence, transmittals, and formal letters' },
                        { label: '📄 Project Documents', hint: 'Engineering drawings, specs, method statements, and technical documents' },
                        { label: '📋 Daily Reports', hint: 'Daily site progress reports, labor records, and supervisor diary' },
                        { label: '⚖️ Variations & Claims', hint: 'Variation orders, site claims, and extension of time' },
                        { label: '💳 Invoices & IPCs', hint: 'Interim payment certificates (IPC) and consultant invoices' },
                        { label: '📐 Drawings & Plans', hint: 'Civil, structural, and architectural drawings' }
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!userCategoryHint) {
                              setUserCategoryHint(chip.hint);
                            } else if (!userCategoryHint.includes(chip.hint)) {
                              setUserCategoryHint(prev => `${prev}; ${chip.hint}`);
                            }
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '999px',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#0284c7';
                            e.currentTarget.style.color = '#0284c7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                      {userCategoryHint && (
                        <button
                          type="button"
                          onClick={() => setUserCategoryHint('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginLeft: 'auto'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Queue Before AI */}
                  {selectedFiles.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                          Selected Files ({selectedFiles.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles([])}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Trash2 size={13} /> Clear all
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                        {selectedFiles.map((file, idx) => {
                          const subPath = (file as any).customPath || (file as any).webkitRelativePath;
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '0.65rem 0.9rem', 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px' 
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                <FileText size={18} color="#0284c7" style={{ flexShrink: 0 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', overflow: 'hidden' }}>
                                  <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                  </span>
                                  {subPath && subPath !== file.name && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      color: '#0369a1',
                                      backgroundColor: '#e0f2fe',
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '4px',
                                      border: '1px solid #bae6fd'
                                    }}>
                                      {subPath}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    ({formatFileSize(file.size)})
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSelectedFile(idx)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={isClassifying}
                          onClick={startAIClassification}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.65rem 1.5rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {isClassifying ? (
                            <>
                              <Loader2 size={18} className="animate-spin" /> {classificationProgress || 'Analyzing with Gemini AI...'}
                            </>
                          ) : (
                            <>
                              <Sparkles size={18} /> Classify & Extract Fields ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'})
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: CLASSIFIED ITEMS REVIEW & EDIT */}
              {classifiedItems.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontSize: '0.9rem', fontWeight: 500 }}>
                      <CheckCircle2 size={18} />
                      <span>AI has classified {classifiedItems.length} document{classifiedItems.length !== 1 ? 's' : ''}. Review extracted metadata and fill in any non-filled fields below.</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} /> Add Files
                      </button>
                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Folder size={14} /> Add Folder
                      </button>
                      <button
                        type="button"
                        onClick={() => zipInputRef.current?.click()}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Archive size={14} /> Add ZIP
                      </button>
                    </div>
                  </div>

                  {isUnpacking && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      fontSize: '0.85rem'
                    }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Unpacking ZIP archive contents...</span>
                    </div>
                  )}

                  {/* If more files selected while in review mode */}
                  {selectedFiles.length > 0 && (
                    <div style={{
                      marginBottom: '1rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                        {selectedFiles.length} additional file{selectedFiles.length !== 1 ? 's' : ''} queued for classification
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={startAIClassification}
                        disabled={isClassifying}
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        {isClassifying ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> {classificationProgress || 'Analyzing...'}
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} /> Analyze Queue
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* NOTIFICATION BANNER & FILTER: WHICH FILES NEED CLASSIFICATION */}
                  {(() => {
                    const needsReviewCount = classifiedItems.filter(item => 
                      item.needsReview || 
                      item.isDuplicate ||
                      item.confidence < 0.75 || 
                      (item.unfilledFields && item.unfilledFields.length > 0) ||
                      (!item.fields?.documentNumber && !item.fields?.referenceNumber) ||
                      (!item.fields?.documentDate && !item.fields?.date && !item.fields?.issueDate)
                    ).length;
                    const duplicateCount = classifiedItems.filter(item => item.isDuplicate).length;
                    const readyCount = classifiedItems.length - needsReviewCount;

                    return (
                      <>
                        {/* DUPLICATE DOCUMENT NOTIFICATION BANNER */}
                        {duplicateCount > 0 && (
                          <div style={{
                            marginBottom: '1rem',
                            padding: '0.875rem 1.25rem',
                            backgroundColor: '#fff1f2',
                            border: '1.5px solid #fecdd3',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            animation: 'fadeIn 0.2s ease-out'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ color: '#e11d48', flexShrink: 0 }}>
                                <AlertTriangle size={22} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#9f1239' }}>
                                  ⚠️ {duplicateCount} Duplicate {duplicateCount === 1 ? 'Document' : 'Documents'} Detected
                                </div>
                                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#be123c' }}>
                                  One or more uploaded files match an existing document in this project by reference number, title, or filename. Review the highlighted cards below.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReviewFilter(reviewFilter === 'duplicates' ? 'all' : 'duplicates')}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                backgroundColor: reviewFilter === 'duplicates' ? '#e11d48' : '#ffffff',
                                color: reviewFilter === 'duplicates' ? '#ffffff' : '#be123c',
                                border: '1px solid #fecdd3',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {reviewFilter === 'duplicates' ? 'Show All Files' : `Review Duplicates (${duplicateCount})`}
                            </button>
                          </div>
                        )}

                        <div style={{
                          marginBottom: '1.25rem',
                          padding: '1rem 1.25rem',
                          backgroundColor: needsReviewCount > 0 ? '#fffbeb' : '#f0fdf4',
                          border: `1px solid ${needsReviewCount > 0 ? '#fde68a' : '#bbf7d0'}`,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ color: needsReviewCount > 0 ? '#d97706' : '#16a34a' }}>
                              {needsReviewCount > 0 ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.925rem', color: needsReviewCount > 0 ? '#92400e' : '#166534' }}>
                                {needsReviewCount > 0
                                  ? `${needsReviewCount} of ${classifiedItems.length} ${classifiedItems.length === 1 ? 'file needs' : 'files need'} your classification, duplicate review, or missing fields`
                                  : `All ${classifiedItems.length} documents have been successfully categorized`
                                }
                              </div>
                              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: needsReviewCount > 0 ? '#b45309' : '#15803d' }}>
                                {needsReviewCount > 0
                                  ? 'AI extracted what it could read and left missing fields blank for your review. Please check amber highlighted items below.'
                                  : 'Extracted metadata is verified and ready to be placed into project sections.'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Filter Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setReviewFilter('all')}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: reviewFilter === 'all' ? '#0284c7' : '#ffffff',
                                color: reviewFilter === 'all' ? '#ffffff' : '#334155',
                                border: '1px solid #cbd5e1'
                              }}
                            >
                              All Files ({classifiedItems.length})
                            </button>
                            {duplicateCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setReviewFilter('duplicates')}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: reviewFilter === 'duplicates' ? '#e11d48' : '#ffffff',
                                  color: reviewFilter === 'duplicates' ? '#ffffff' : '#be123c',
                                  border: '1px solid #fecdd3'
                                }}
                              >
                                ⚠️ Duplicates ({duplicateCount})
                              </button>
                            )}
                            {needsReviewCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setReviewFilter('needs_review')}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: reviewFilter === 'needs_review' ? '#d97706' : '#ffffff',
                                  color: reviewFilter === 'needs_review' ? '#ffffff' : '#b45309',
                                  border: '1px solid #fde68a'
                                }}
                              >
                                ⚠️ Needs Review ({needsReviewCount})
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setReviewFilter('ready')}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: reviewFilter === 'ready' ? '#16a34a' : '#ffffff',
                                color: reviewFilter === 'ready' ? '#ffffff' : '#15803d',
                                border: '1px solid #bbf7d0'
                              }}
                            >
                              ✅ Complete ({readyCount})
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Review Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {classifiedItems
                      .filter(item => {
                        if (reviewFilter === 'all') return true;
                        if (reviewFilter === 'duplicates') return !!item.isDuplicate;
                        const isNeeding = item.needsReview || 
                                          item.isDuplicate ||
                                          item.confidence < 0.75 || 
                                          (item.unfilledFields && item.unfilledFields.length > 0) ||
                                          (!item.fields?.documentNumber && !item.fields?.referenceNumber) ||
                                          (!item.fields?.documentDate && !item.fields?.date && !item.fields?.issueDate);
                        if (reviewFilter === 'needs_review') return isNeeding;
                        if (reviewFilter === 'ready') return !isNeeding;
                        return true;
                      })
                      .map((item) => {
                      const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.documents;
                      const isNeedingReview = item.needsReview || 
                                              item.isDuplicate ||
                                              item.confidence < 0.75 || 
                                              (item.unfilledFields && item.unfilledFields.length > 0) ||
                                              (!item.fields?.documentNumber && !item.fields?.referenceNumber) ||
                                              (!item.fields?.documentDate && !item.fields?.date && !item.fields?.issueDate);
                      return (
                        <div
                          key={item.tempId}
                          style={{
                            border: `1.5px solid ${item.isDuplicate ? '#f43f5e' : (isNeedingReview ? '#f59e0b' : catConfig.borderColor)}`,
                            borderRadius: '12px',
                            backgroundColor: '#ffffff',
                            overflow: 'hidden',
                            boxShadow: item.isDuplicate ? '0 2px 6px rgba(244, 63, 94, 0.2)' : (isNeedingReview ? '0 2px 6px rgba(245, 158, 11, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)')
                          }}
                        >
                          {/* Card Top Banner */}
                          <div style={{
                            padding: '0.875rem 1.25rem',
                            backgroundColor: item.isDuplicate ? '#fff1f2' : catConfig.bgColor,
                            borderBottom: `1px solid ${item.isDuplicate ? '#fecdd3' : catConfig.borderColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <div style={{ color: item.isDuplicate ? '#e11d48' : catConfig.color }}>
                                {item.isDuplicate ? <AlertTriangle size={18} /> : catConfig.icon}
                              </div>
                              <div>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                                  {item.originalName}
                                </span>
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                  ({formatFileSize(item.size)})
                                </span>
                              </div>

                              {/* View Document in window button */}
                              {item.fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({
                                    title: item.fields?.title || item.fields?.subject || item.originalName,
                                    fileUrl: item.fileUrl,
                                    documentNumber: item.fields?.documentNumber || item.fields?.referenceNumber || '',
                                    date: item.fields?.documentDate || item.fields?.date || item.fields?.issueDate || '',
                                    categoryLabel: item.categoryLabel
                                  })}
                                  title="View document in window without downloading"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '0.2rem 0.5rem',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#0284c7',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                                    e.currentTarget.style.borderColor = '#0284c7';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                  }}
                                >
                                  <Eye size={13} /> View
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {/* Destination Category Dropdown */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                                  Section:
                                </label>
                                <select
                                  value={item.category}
                                  onChange={(e) => handleCategoryChange(item.tempId, e.target.value as ProjectDocCategory)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '6px',
                                    border: isNeedingReview ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                                    backgroundColor: isNeedingReview ? '#fffdf5' : '#ffffff',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: catConfig.color
                                  }}
                                >
                                  <option value="correspondence">✉️ Correspondence</option>
                                  <option value="documents">📄 Project Documents</option>
                                  <option value="daily_reports">📋 Daily Reports</option>
                                  <option value="variations">⚖️ Variations & Claims</option>
                                  <option value="payment_invoices">💳 Payments / Invoices</option>
                                </select>
                              </div>

                              {/* Confidence / Review / Duplicate status badge */}
                              {item.isDuplicate ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#ffe4e6',
                                  color: '#be123c',
                                  border: '1px solid #fda4af',
                                  fontWeight: 700
                                }}>
                                  ⚠️ Duplicate
                                </span>
                              ) : isNeedingReview ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  fontWeight: 700
                                }}>
                                  ⚠️ Needs Review
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#ffffff',
                                  color: catConfig.color,
                                  border: `1px solid ${catConfig.borderColor}`,
                                  fontWeight: 600
                                }}>
                                  {Math.round(item.confidence * 100)}% Confidence
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => removeClassifiedItem(item.tempId)}
                                title="Remove file"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* INLINE DUPLICATE NOTICE IF APPLICABLE */}
                          {item.isDuplicate && (
                            <div style={{
                              padding: '0.65rem 1.25rem',
                              backgroundColor: '#fff1f2',
                              borderBottom: '1px solid #fecdd3',
                              fontSize: '0.825rem',
                              color: '#9f1239',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <AlertTriangle size={15} color="#e11d48" style={{ flexShrink: 0 }} />
                                <span>
                                  <strong>Duplicate Notice:</strong> {item.duplicateInfo?.reason || 'An existing document matches this file.'}
                                  {item.duplicateInfo?.existingRef ? ` (${item.duplicateInfo.existingRef})` : ''} in <strong>{item.duplicateInfo?.categoryLabel || item.duplicateInfo?.category}</strong>.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeClassifiedItem(item.tempId)}
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  backgroundColor: '#ffe4e6',
                                  border: '1px solid #fda4af',
                                  borderRadius: '4px',
                                  color: '#be123c',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Remove Duplicate
                              </button>
                            </div>
                          )}

                          {/* Alert or Reasoning note */}
                          <div style={{
                            padding: '0.6rem 1.25rem',
                            backgroundColor: isNeedingReview ? '#fffbeb' : '#f8fafc',
                            borderBottom: `1px solid ${isNeedingReview ? '#fde68a' : '#f1f5f9'}`,
                            fontSize: '0.8rem',
                            color: isNeedingReview ? '#b45309' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {isNeedingReview ? (
                              <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                            ) : (
                              <Sparkles size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                            )}
                            <span>
                              <strong>{isNeedingReview ? 'Needs Review:' : 'AI Detection:'}</strong> {item.reasoning}
                            </span>
                          </div>

                          {/* Editable Fields Form */}
                          <div style={{ padding: '1.25rem' }}>
                            {/* DYNAMIC FIELDS ACCORDING TO CATEGORY */}
                            
                            {/* 1. CORRESPONDENCE */}
                            {item.category === 'correspondence' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Reference Number {!item.fields.referenceNumber && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.referenceNumber || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'referenceNumber', e.target.value)}
                                    placeholder="e.g. UNRA/KFO/042"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.referenceNumber ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.referenceNumber ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Type (Incoming/Outgoing)
                                  </label>
                                  <select
                                    value={item.fields.type || 'Incoming'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'type', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Incoming">Incoming</option>
                                    <option value="Outgoing">Outgoing</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Category
                                  </label>
                                  <select
                                    value={item.fields.category || 'Letter'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'category', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Letter">Letter</option>
                                    <option value="MoM">Minutes of Meeting (MoM)</option>
                                    <option value="Transmittal">Transmittal</option>
                                    <option value="Notice">Notice</option>
                                    <option value="Email">Email</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Date of Document {(!item.fields.documentDate && !item.fields.date) && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="date" 
                                    value={item.fields.documentDate || item.fields.date || ''} 
                                    onChange={(e) => {
                                      handleFieldChange(item.tempId, 'documentDate', e.target.value);
                                      handleFieldChange(item.tempId, 'date', e.target.value);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: (!item.fields.documentDate && !item.fields.date) ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: (!item.fields.documentDate && !item.fields.date) ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Sender {!item.fields.sender && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.sender || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'sender', e.target.value)}
                                    placeholder="e.g. Contractor / UNRA"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.sender ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.sender ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Recipient {!item.fields.recipient && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.recipient || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'recipient', e.target.value)}
                                    placeholder="e.g. Consultant / PROME"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.recipient ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.recipient ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Subject {!item.fields.subject && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.subject || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'subject', e.target.value)}
                                    placeholder="Correspondence subject..."
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.subject ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.subject ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 2. PROJECT DOCUMENTS */}
                            {item.category === 'documents' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Document No. {!item.fields.documentNumber && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.documentNumber || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'documentNumber', e.target.value)}
                                    placeholder="e.g. DWG-KFO-001"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.documentNumber ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.documentNumber ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Document Title {!item.fields.title && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.title || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'title', e.target.value)}
                                    placeholder="Document title..."
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.title ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.title ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Document Type
                                  </label>
                                  <select
                                    value={item.fields.type || 'Report'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'type', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Project Drawing">Project Drawing</option>
                                    <option value="Design Document">Design Document</option>
                                    <option value="QA/QC Plan">QA/QC Plan</option>
                                    <option value="Method Statement">Method Statement</option>
                                    <option value="Quality Control Form">Quality Control Form</option>
                                    <option value="Report">Report</option>
                                    <option value="Contractual Document">Contractual Document</option>
                                    <option value="Meeting Minutes">Meeting Minutes</option>
                                    <option value="RFI">RFI</option>
                                    <option value="Specification">Specification</option>
                                    <option value="Media">Media</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Revision
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.revision || '1.0'} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'revision', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Status
                                  </label>
                                  <select
                                    value={item.fields.status || 'Draft'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'status', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Draft">Draft</option>
                                    <option value="Issued for Review">Issued for Review</option>
                                    <option value="Issued for Construction">Issued for Construction</option>
                                    <option value="Approved">Approved</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Date of Document / Issue Date {(!item.fields.documentDate && !item.fields.issueDate) && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="date" 
                                    value={item.fields.documentDate || item.fields.issueDate || ''} 
                                    onChange={(e) => {
                                      handleFieldChange(item.tempId, 'documentDate', e.target.value);
                                      handleFieldChange(item.tempId, 'issueDate', e.target.value);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: (!item.fields.documentDate && !item.fields.issueDate) ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: (!item.fields.documentDate && !item.fields.issueDate) ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 3. DAILY REPORTS */}
                            {item.category === 'daily_reports' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Date of Report {(!item.fields.documentDate && !item.fields.date) && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="date" 
                                    value={item.fields.documentDate || item.fields.date || ''} 
                                    onChange={(e) => {
                                      handleFieldChange(item.tempId, 'documentDate', e.target.value);
                                      handleFieldChange(item.tempId, 'date', e.target.value);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: (!item.fields.documentDate && !item.fields.date) ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: (!item.fields.documentDate && !item.fields.date) ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Location / Chainage {!item.fields.location && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.location || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'location', e.target.value)}
                                    placeholder="e.g. Chainage 12+400 / Pier 3"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.location ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.location ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Weather Condition
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.weatherCondition || 'Fair'} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'weatherCondition', e.target.value)}
                                    placeholder="e.g. Sunny / Rainy"
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Active Manpower (Workers)
                                  </label>
                                  <input 
                                    type="number" 
                                    value={item.fields.manpowerCount ?? 0} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'manpowerCount', parseInt(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Active Equipment / Plant
                                  </label>
                                  <input 
                                    type="number" 
                                    value={item.fields.equipmentCount ?? 0} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'equipmentCount', parseInt(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Activities Summary {!item.fields.summary && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <textarea 
                                    rows={2}
                                    value={item.fields.summary || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'summary', e.target.value)}
                                    placeholder="Activities carried out today..."
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.summary ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.summary ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem',
                                      fontFamily: 'inherit'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 4. VARIATIONS & CLAIMS */}
                            {item.category === 'variations' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Reference No. {!item.fields.referenceNumber && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.referenceNumber || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'referenceNumber', e.target.value)}
                                    placeholder="e.g. VO-02"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.referenceNumber ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.referenceNumber ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Title {!item.fields.title && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.title || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'title', e.target.value)}
                                    placeholder="Variation title..."
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.title ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.title ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Cost Impact ($ / UGX)
                                  </label>
                                  <input 
                                    type="number" 
                                    value={item.fields.costImpact ?? 0} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'costImpact', parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Schedule Impact (Days)
                                  </label>
                                  <input 
                                    type="number" 
                                    value={item.fields.scheduleImpactDays ?? 0} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'scheduleImpactDays', parseInt(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Status
                                  </label>
                                  <select
                                    value={item.fields.status || 'Proposed'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'status', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Proposed">Proposed</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Date of Document {(!item.fields.documentDate && !item.fields.date) && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="date" 
                                    value={item.fields.documentDate || item.fields.date || ''} 
                                    onChange={(e) => {
                                      handleFieldChange(item.tempId, 'documentDate', e.target.value);
                                      handleFieldChange(item.tempId, 'date', e.target.value);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: (!item.fields.documentDate && !item.fields.date) ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: (!item.fields.documentDate && !item.fields.date) ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Description / Justification
                                  </label>
                                  <textarea 
                                    rows={2}
                                    value={item.fields.description || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'description', e.target.value)}
                                    placeholder="Variation scope and reason..."
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 5. PAYMENTS / INVOICES */}
                            {item.category === 'payment_invoices' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Invoice / IPC No. {!item.fields.documentNumber && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.documentNumber || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'documentNumber', e.target.value)}
                                    placeholder="e.g. IPC-03"
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.documentNumber ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.documentNumber ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Title {!item.fields.title && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.fields.title || ''} 
                                    onChange={(e) => handleFieldChange(item.tempId, 'title', e.target.value)}
                                    placeholder="Invoice title..."
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: !item.fields.title ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: !item.fields.title ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Invoice Type
                                  </label>
                                  <select
                                    value={item.fields.type || 'Consultant Invoice'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'type', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Consultant Invoice">Consultant Invoice</option>
                                    <option value="Contractor IPC">Contractor IPC</option>
                                    <option value="Payment Certificate">Payment Certificate</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Status
                                  </label>
                                  <select
                                    value={item.fields.status || 'Submitted'}
                                    onChange={(e) => handleFieldChange(item.tempId, 'status', e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                  >
                                    <option value="Draft">Draft</option>
                                    <option value="Submitted">Submitted</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                                    Date of Document / Issue Date {(!item.fields.documentDate && !item.fields.issueDate) && <span style={{ color: '#d97706' }}>* (Unfilled)</span>}
                                  </label>
                                  <input 
                                    type="date" 
                                    value={item.fields.documentDate || item.fields.issueDate || ''} 
                                    onChange={(e) => {
                                      handleFieldChange(item.tempId, 'documentDate', e.target.value);
                                      handleFieldChange(item.tempId, 'issueDate', e.target.value);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      borderRadius: '6px',
                                      border: (!item.fields.documentDate && !item.fields.issueDate) ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                      backgroundColor: (!item.fields.documentDate && !item.fields.issueDate) ? '#fffbeb' : '#ffffff',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!saveSuccess && (
          <div style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetAndClose}
              disabled={isSaving || isClassifying}
            >
              Cancel
            </button>

            {classifiedItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {classifiedItems.length} document{classifiedItems.length !== 1 ? 's' : ''} ready to place
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveAll}
                  disabled={isSaving || isClassifying}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.5rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Placing Documents...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Confirm & Place All Documents
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-Window Document Viewer Modal */}
      {previewDoc && (
        <DocumentViewerModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentTitle={previewDoc.title || 'Document Preview'}
          fileUrl={previewDoc.fileUrl}
          documentNumber={previewDoc.documentNumber}
          documentDate={previewDoc.date}
          categoryLabel={previewDoc.categoryLabel}
        />
      )}
    </div>
  );
};
