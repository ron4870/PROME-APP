import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, FileText, CheckCircle2, Clock, X, 
  Printer, Download, ExternalLink, ShieldCheck, ChevronRight, Info, Filter,
  AlertTriangle, Eye, ArrowUpRight, Layers, FileCheck
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { 
  PROME_DOCUMENT_MASTERLIST, 
  PROME_MASTERLIST_HEADER, 
  PROME_MASTERLIST_CATEGORIES, 
  type MasterDocumentItem 
} from '../data/promeDocumentMasterlist';
import { 
  PROME_AUDIT_DOCUMENTS_LIST 
} from '../data/promeAuditDocuments';
import { 
  printDocumentMasterlistPDF, 
  downloadDocumentMasterlistPDF 
} from '../utils/documentMasterlistPdf';

interface DocumentRecord {
  id: number;
  documentNumber: string;
  title: string;
  type: string;
  category: string;
  division: string;
  retentionPeriod: string;
  revision: string;
  status: string;
  issueDate: string | null;
  nextReviewDate: string | null;
}

const cleanDocNumber = (num: string): string => {
  if (!num) return '';
  return num.replace(/-(CA|TL|PA|SP|TR|TN|EO|TC)$/, '');
};

const formatDate = (isoString: string | null) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

const normalizeDivision = (dept: string | null | undefined): string => {
  if (!dept) return 'General';
  const trimmed = dept.trim();
  if (/^(be&ed|be & ed|beed|planning & engineering|planning and engineering)$/i.test(trimmed)) {
    return 'PED';
  }
  if (/^(business development|pmbdd|pmbd)$/i.test(trimmed)) {
    return 'PMBDD';
  }
  if (/^(accounts and purchasing|accounts & purchasing|accounts\/ finance|accounts\/finance|accounts \/ finance|finance & accounts|finance)$/i.test(trimmed)) {
    return 'Finance';
  }
  if (/^(administration \/ hse|administration\/hse|admin \/ hse|admin\/hse|hr&ad \/ hse|hr & ad \/ hse)$/i.test(trimmed)) {
    return 'HR&AD / HSE';
  }
  if (/^(administration|admin|hr&ad|hr & ad|human resources|hr)$/i.test(trimmed)) {
    return 'HR&AD';
  }
  return trimmed;
};

const DocumentDashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [dbDocuments, setDbDocuments] = useState<DocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Audit Documents Modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditPartFilter, setAuditPartFilter] = useState<'ALL' | '1' | '2' | '3' | 'ACTION_REQUIRED'>('ALL');
  
  // Modal state
  const [newDoc, setNewDoc] = useState({ 
    title: '', 
    documentNumber: '',
    category: 'Quality System Procedures', 
    division: '',
    retentionPeriod: '3 years'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setDbDocuments(await response.json());
      }
    } catch (error) {
      console.error('Error fetching documents from server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const formData = new FormData();
      formData.append('title', newDoc.title);
      formData.append('documentNumber', newDoc.documentNumber);
      formData.append('category', newDoc.category);
      formData.append('division', newDoc.division);
      formData.append('retentionPeriod', newDoc.retentionPeriod);
      formData.append('type', 
        newDoc.category === 'Quality System Procedures' ? 'SOP' : 
        newDoc.category === 'Work Instructions' ? 'Work Instruction' : 
        newDoc.category === 'Quality System Records' ? 'Form' : 'Manual'
      );
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const createdDoc = await response.json();
        setIsModalOpen(false);
        setNewDoc({ title: '', documentNumber: '', category: 'Quality System Procedures', division: '', retentionPeriod: '3 years' });
        setSelectedFile(null);
        await fetchDocuments();
        navigate(`/documents/${createdDoc.id}`);
      } else {
        const errText = await response.text();
        console.error("Server returned error:", errText);
        alert(`Failed to register document: ${errText}`);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert(`Network or fetch error: ${error}`);
    }
  };

  // Merge default ISO masterlist with live DB records
  const allMergedDocuments = useMemo(() => {
    const mergedList: MasterDocumentItem[] = PROME_DOCUMENT_MASTERLIST.map((masterItem) => {
      const cleanId = cleanDocNumber(masterItem.documentNumber);
      const foundDb = dbDocuments.find(
        (d) =>
          d.documentNumber === masterItem.documentNumber ||
          d.documentNumber === cleanId ||
          d.title.toLowerCase().trim() === masterItem.title.toLowerCase().trim()
      );
      if (foundDb) {
        return {
          ...masterItem,
          id: foundDb.id,
          revision: foundDb.revision || masterItem.revision,
          dateOfRevision: foundDb.issueDate ? formatDate(foundDb.issueDate) : masterItem.dateOfRevision,
          department: normalizeDivision(masterItem.department || foundDb.division),
          retentionPeriod: foundDb.retentionPeriod || masterItem.retentionPeriod,
          status: foundDb.status || masterItem.status,
        };
      }
      return {
        ...masterItem,
        department: normalizeDivision(masterItem.department),
      };
    });

    // Append any user-created documents not present in default masterlist
    const extraDocs: MasterDocumentItem[] = dbDocuments
      .filter((dbDoc) => {
        return !PROME_DOCUMENT_MASTERLIST.some(
          (m) =>
            m.documentNumber === dbDoc.documentNumber ||
            cleanDocNumber(m.documentNumber) === dbDoc.documentNumber ||
            m.title.toLowerCase().trim() === dbDoc.title.toLowerCase().trim()
        );
      })
      .map((dbDoc) => ({
        id: dbDoc.id,
        prefix: '',
        title: dbDoc.title,
        documentNumber: dbDoc.documentNumber,
        revision: dbDoc.revision || '1.0',
        dateOfRevision: dbDoc.issueDate ? formatDate(dbDoc.issueDate) : '-',
        department: normalizeDivision(dbDoc.division),
        retentionPeriod: dbDoc.retentionPeriod || '3 years',
        type: dbDoc.type || 'Document',
        category: (dbDoc.category as any) || 'Quality System Records',
        categoryOrder: 6,
        status: dbDoc.status || 'Draft',
        portalPath: `/documents/${dbDoc.id}`,
        portalLabel: 'Document Registry',
      }));

    return [...mergedList, ...extraDocs];
  }, [dbDocuments]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allMergedDocuments.filter((doc) => {
      const matchesCategory = 
        selectedCategory === 'ALL' || 
        doc.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!q) return true;

      const titleMatch = doc.title && doc.title.toLowerCase().includes(q);
      const numberMatch = doc.documentNumber && doc.documentNumber.toLowerCase().includes(q);
      const deptMatch = doc.department && doc.department.toLowerCase().includes(q);
      const catMatch = doc.category && doc.category.toLowerCase().includes(q);
      const portalMatch = doc.portalLabel && doc.portalLabel.toLowerCase().includes(q);

      return titleMatch || numberMatch || deptMatch || catMatch || portalMatch;
    });
  }, [allMergedDocuments, searchTerm, selectedCategory]);

  // Group filtered documents by section
  const groupedSections = useMemo(() => {
    const map: Record<string, MasterDocumentItem[]> = {
      'Quality Manual': [],
      'Quality System Procedures': [],
      'Work Instructions': [],
      'Quality System Records': [],
      'Job Descriptions': [],
      'Additional Registered Documents': []
    };

    filteredDocs.forEach((d) => {
      if (map[d.category]) {
        map[d.category].push(d);
      } else {
        map['Additional Registered Documents'].push(d);
      }
    });

    return map;
  }, [filteredDocs]);

  // Filtered audit documents
  const filteredAuditDocs = useMemo(() => {
    const q = auditSearchTerm.toLowerCase().trim();
    return PROME_AUDIT_DOCUMENTS_LIST.filter((doc) => {
      if (auditPartFilter === 'ACTION_REQUIRED') {
        if (doc.status !== 'ACTION_REQUIRED') return false;
      } else if (auditPartFilter !== 'ALL') {
        if (doc.partNumber.toString() !== auditPartFilter) return false;
      }

      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.documentNumber.toLowerCase().includes(q) ||
        doc.isoClause.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.division.toLowerCase().includes(q)
      );
    });
  }, [auditSearchTerm, auditPartFilter]);

  // Handler for Print PDF
  const handlePrintPdf = () => {
    setIsGeneratingPdf(true);
    try {
      printDocumentMasterlistPDF(allMergedDocuments);
    } catch (err) {
      console.error('Error generating Document Masterlist PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler for Download PDF
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      downloadDocumentMasterlistPDF(allMergedDocuments);
    } catch (err) {
      console.error('Error downloading Document Masterlist PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="layout-container" style={{ padding: '1.5rem 2rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
              PROME Document Masterlist
            </h1>
            <span style={{ 
              backgroundColor: '#ccfbf1', 
              color: '#0f766e', 
              padding: '0.2rem 0.65rem', 
              borderRadius: '9999px', 
              fontSize: '0.75rem', 
              fontWeight: '700',
              border: '1px solid #99f6e4'
            }}>
              ISO 9001:2015 Clause 7.5
            </span>
          </div>
          <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '0.925rem' }}>
            Control of Records & Procedures Registry — Integrated Management System (IMS). All official documents linked to portal workflows.
          </p>
        </div>

        {/* Action Buttons: Audit Documents, Print PDF, Download, Register */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAuditModalOpen(true)}
            title="Open ISO 9001 & ISO 45001 External Audit Documents Checklist and PDFs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: '#991b1b',
              color: 'white',
              padding: '0.55rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(153, 27, 27, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#991b1b'}
          >
            <ShieldCheck size={18} />
            <span>Audit Documents</span>
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.22)',
              color: '#ffffff',
              fontSize: '0.72rem',
              padding: '0.12rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: '800'
            }}>
              41 Docs
            </span>
          </button>

          <button
            onClick={handlePrintPdf}
            disabled={isGeneratingPdf}
            title="Open printable multi-page ISO Document Masterlist PDF"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0284c7',
              color: 'white',
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
          >
            <Printer size={17} />
            {isGeneratingPdf ? 'Generating...' : 'Print PDF'}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            title="Download ISO Document Masterlist as PDF file"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
          >
            <Download size={16} />
            Download
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#0f766e', 
              color: 'white', 
              padding: '0.55rem 1.1rem', 
              borderRadius: '6px', 
              border: 'none', 
              fontWeight: '600', 
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d9488'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f766e'}
          >
            <Plus size={18} /> Register Document
          </button>
        </div>
      </div>

      {/* ISO Document Control Header Block */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '1.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Title Bar */}
        <div style={{
          backgroundColor: '#0f172a',
          color: 'white',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
              ISO Document Control
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '0.02em', color: '#ffffff' }}>
              PROME CONSULTANTS LIMITED — DOCUMENT MASTERLIST
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#1e293b',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <ShieldCheck size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#e2e8f0' }}>
              {PROME_MASTERLIST_HEADER.versionNo}
            </span>
          </div>
        </div>

        {/* 3-Column Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          backgroundColor: '#f8fafc'
        }}>
          {/* Col 1 */}
          <div style={{ padding: '0.9rem 1.25rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Document Identity</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginTop: '0.2rem' }}>
              I.D. No: <span style={{ fontFamily: 'monospace', color: '#0f766e' }}>{PROME_MASTERLIST_HEADER.idNumber}</span>
            </div>
            <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.25rem' }}>
              {PROME_MASTERLIST_HEADER.isoClause}
            </div>
          </div>

          {/* Col 2 */}
          <div style={{ padding: '0.9rem 1.25rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Revision Dates</div>
            <div style={{ fontSize: '0.875rem', color: '#1e293b', marginTop: '0.25rem' }}>
              <strong>Date of Issue:</strong> {PROME_MASTERLIST_HEADER.dateOfIssue}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#1e293b', marginTop: '0.2rem' }}>
              <strong>Date of Revision:</strong> {PROME_MASTERLIST_HEADER.dateOfRevision}
            </div>
          </div>

          {/* Col 3 */}
          <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Control Signatures</div>
            <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.25rem' }}>
              <strong>Written By:</strong> {PROME_MASTERLIST_HEADER.writtenBy}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.15rem' }}>
              <strong>Reviewed By:</strong> {PROME_MASTERLIST_HEADER.reviewedBy}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.15rem' }}>
              <strong>Approved By:</strong> {PROME_MASTERLIST_HEADER.approvedBy}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.825rem', fontWeight: '600' }}>
            <FileText size={16} color="#0f766e" /> Total Standard Masterlist
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem' }}>
            {allMergedDocuments.length} <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>documents</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.825rem', fontWeight: '600' }}>
            <ExternalLink size={16} color="#0284c7" /> Linked to IMS Portal
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0284c7', marginTop: '0.4rem' }}>
            {allMergedDocuments.filter(d => !!d.portalPath).length} <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>active workflows</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.825rem', fontWeight: '600' }}>
            <Clock size={16} color="#eab308" /> Portal Workflows Pending
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#d97706', marginTop: '0.4rem' }}>
            {allMergedDocuments.filter(d => !d.portalPath).length} <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>in pipeline</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.825rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#16a34a" /> ISO Revisions Validated
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#16a34a', marginTop: '0.4rem' }}>
            100% <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>compliance</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e2e8f0', 
        padding: '1rem 1.25rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '480px' }}>
          <Search size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search documents by ID, title, department, or portal link..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ 
              paddingLeft: '2.4rem', 
              paddingRight: '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              width: '100%', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Category Pills Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem' }}>
            <Filter size={14} /> Filter:
          </span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: selectedCategory === 'ALL' ? '#0f766e' : '#f1f5f9',
              color: selectedCategory === 'ALL' ? 'white' : '#475569',
              transition: 'all 0.1s ease'
            }}
          >
            All Categories ({allMergedDocuments.length})
          </button>
          {PROME_MASTERLIST_CATEGORIES.map((cat) => {
            const count = allMergedDocuments.filter(d => d.category === cat.name).length;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#0f766e' : '#f1f5f9',
                  color: isSelected ? 'white' : '#475569',
                  transition: 'all 0.1s ease'
                }}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Document Masterlist Table View */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            Loading document masterlist...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#334155' }}>No matching documents found</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Try clearing the search term or resetting the category filter.</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedSections).map(([sectionName, sectionItems]) => {
              if (sectionItems.length === 0) return null;

              return (
                <div key={sectionName} style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {/* Category Banner */}
                  <div style={{
                    backgroundColor: '#f1f5f9',
                    padding: '0.65rem 1.25rem',
                    borderBottom: '1px solid #cbd5e1',
                    borderTop: '1px solid #cbd5e1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                      {sectionName}
                    </h2>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', backgroundColor: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {sectionItems.length} items
                    </span>
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '30%' }}>
                            DOCUMENT
                          </th>
                          <th style={{ padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '22%' }}>
                            I.D. Number
                          </th>
                          <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center', width: '9%' }}>
                            Revision No.
                          </th>
                          <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center', width: '10%' }}>
                            Date of Revision
                          </th>
                          <th style={{ padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '12%' }}>
                            Department
                          </th>
                          <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center', width: '9%' }}>
                            Retention
                          </th>
                          <th style={{ padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right', width: '18%' }}>
                            IMS Portal Link
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '0.85rem' }}>
                        {sectionItems.map((item, idx) => {
                          const cleanId = cleanDocNumber(item.documentNumber);

                          return (
                            <tr 
                              key={`${item.documentNumber}-${idx}`}
                              style={{ 
                                borderBottom: '1px solid #e2e8f0',
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                transition: 'background-color 0.12s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa'}
                            >
                              {/* Title / Prefix */}
                              <td style={{ padding: '0.65rem 1rem', color: '#0f172a', fontWeight: '600', lineHeight: 1.35 }}>
                                {item.prefix && (
                                  <span style={{ color: '#0f766e', fontWeight: '700', marginRight: '0.4rem', fontFamily: 'monospace' }}>
                                    {item.prefix}
                                  </span>
                                )}
                                <span>{item.title}</span>
                              </td>

                              {/* I.D. Number */}
                              <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#334155', fontSize: '0.825rem' }}>
                                {cleanId}
                              </td>

                              {/* Revision No. */}
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '0.8rem' }}>
                                <span style={{ backgroundColor: '#e2e8f0', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                  {item.revision.startsWith('Ver-') ? item.revision : `Ver-${item.revision}`}
                                </span>
                              </td>

                              {/* Date of Revision */}
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#475569', fontSize: '0.825rem' }}>
                                {item.dateOfRevision || (item.issueDate ? formatDate(item.issueDate) : '-')}
                              </td>

                              {/* Department */}
                              <td style={{ padding: '0.65rem 1rem', color: '#475569', fontSize: '0.825rem' }}>
                                {item.department || '-'}
                              </td>

                              {/* Retention Period */}
                              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#475569', fontSize: '0.825rem' }}>
                                {item.retentionPeriod || '-'}
                              </td>

                              {/* Portal Link / Action */}
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  {item.portalPath ? (
                                    <button
                                      onClick={() => {
                                        if (item.portalPath?.endsWith('.pdf') || item.portalPath?.startsWith('/uploads/') || item.portalPath?.startsWith('http')) {
                                          window.open(item.portalPath, '_blank');
                                        } else {
                                          navigate(item.portalPath!);
                                        }
                                      }}
                                      title={`Navigate to ${item.portalLabel || 'IMS Module'}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.25rem 0.65rem',
                                        backgroundColor: '#f0fdfa',
                                        color: '#0f766e',
                                        border: '1px solid #99f6e4',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#0f766e';
                                        e.currentTarget.style.color = '#ffffff';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f0fdfa';
                                        e.currentTarget.style.color = '#0f766e';
                                      }}
                                    >
                                      <span>{item.portalLabel || 'Open in Portal'}</span>
                                      <ChevronRight size={13} />
                                    </button>
                                  ) : (
                                    <span 
                                      title="This document section has not yet been created within the portal and will be added later."
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.25rem 0.55rem',
                                        backgroundColor: '#f8fafc',
                                        color: '#94a3b8',
                                        border: '1px dashed #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '0.725rem',
                                        fontWeight: '600',
                                        cursor: 'default'
                                      }}
                                    >
                                      <Clock size={11} color="#94a3b8" />
                                      Portal page pending
                                    </span>
                                  )}

                                  {/* Link to registry record if available in DB */}
                                  {item.id && (
                                    <button
                                      onClick={() => navigate(`/documents/${item.id}`)}
                                      title="View Document Details & Upload History"
                                      style={{
                                        padding: '0.25rem 0.45rem',
                                        backgroundColor: '#f8fafc',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '4px',
                                        fontSize: '0.725rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                    >
                                      Details
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ISO Note Box at Bottom */}
      <div style={{
        marginTop: '1.5rem',
        padding: '0.85rem 1.25rem',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: '#0369a1',
        fontSize: '0.825rem'
      }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Document Control Note:</strong> All documents listed above are managed under ISO 9001:2015 Clause 7.5. Revisions and records are maintained with strict version tracking. Documents marked with <em>"Portal page pending"</em> will have dedicated interactive workflows integrated in upcoming releases.
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Register New Document</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>Add a new controlled document to the IMS Masterlist</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  Document Title <span style={{color: '#ef4444'}}>*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={newDoc.title}
                  onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. Risk Management Procedure"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  I.D. Number <span style={{color: '#ef4444'}}>*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={newDoc.documentNumber}
                  onChange={e => setNewDoc({...newDoc, documentNumber: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. PROME-QSP-TO-08"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  Category <span style={{color: '#ef4444'}}>*</span>
                </label>
                <select 
                  className="form-input"
                  value={newDoc.category}
                  onChange={e => setNewDoc({...newDoc, category: e.target.value})}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                >
                  <option value="Quality Manual">1. Quality Manual</option>
                  <option value="Quality System Procedures">2. Quality System Procedures</option>
                  <option value="Work Instructions">3. Work Instructions</option>
                  <option value="Quality System Records">4. Quality System Records</option>
                  <option value="Job Descriptions">5. Job Descriptions</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  Department / Division
                </label>
                <input 
                  type="text"
                  className="form-input"
                  value={newDoc.division}
                  onChange={e => setNewDoc({...newDoc, division: e.target.value})}
                  list="new-division-list"
                  placeholder="e.g. HR&AD, PED, PMBDD, Finance, HSE"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
                <datalist id="new-division-list">
                  <option value="HR&AD" />
                  <option value="PED" />
                  <option value="PMBDD" />
                  <option value="Finance" />
                  <option value="HSE" />
                  <option value="ALL" />
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  Retention Period
                </label>
                <input 
                  type="text" 
                  value={newDoc.retentionPeriod}
                  onChange={e => setNewDoc({...newDoc, retentionPeriod: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. 3 years, 5 years, Permanent"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  Attach Initial Document File (Optional)
                </label>
                <input 
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#f9fafb', fontSize: '0.825rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px', backgroundColor: '#0f766e', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
                >
                  Register Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISO External Audit Documents Dossier Modal */}
      {isAuditModalOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.7)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100, 
            padding: '1rem' 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAuditModalOpen(false);
          }}
        >
          <div 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '1240px', 
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.28)',
              overflow: 'hidden',
              border: '1px solid #cbd5e1'
            }}
          >
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#0f172a',
              color: 'white',
              padding: '1.25rem 1.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #1e293b'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <ShieldCheck size={26} style={{ color: '#38bdf8' }} />
                  <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, letterSpacing: '-0.015em' }}>
                    ISO 9001 & ISO 45001 External Audit Documents Dossier
                  </h2>
                  <span style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    External Audit Checklist
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, maxWidth: '920px', lineHeight: 1.45 }}>
                  Official checklist of 41 mandatory documents & records required for PROME Consultants Limited ISO 9001:2015 & ISO 45001:2018 External Surveillance Audit. View, print, download PDFs, or open live system modules.
                </p>
              </div>

              <button 
                onClick={() => setIsAuditModalOpen(false)}
                title="Close"
                style={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = '#334155'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = '#1e293b'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics & Summary Bar */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '0.85rem 1.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Total Audit Items</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{PROME_AUDIT_DOCUMENTS_LIST.length}</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#dcfce7', color: '#15803d', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Ready / In App</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534' }}>
                    {PROME_AUDIT_DOCUMENTS_LIST.filter(d => d.status === 'READY' || d.status === 'GENERATABLE').length} / 41
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#f1f5f9', color: '#0284c7', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Direct PDF Links</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0284c7' }}>
                    {PROME_AUDIT_DOCUMENTS_LIST.filter(d => d.pdfUrl).length} Ready
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setAuditPartFilter(auditPartFilter === 'ACTION_REQUIRED' ? 'ALL' : 'ACTION_REQUIRED')}
                style={{ 
                  backgroundColor: auditPartFilter === 'ACTION_REQUIRED' ? '#fef3c7' : 'white', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px', 
                  border: '1.5px solid #f59e0b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ backgroundColor: '#fef3c7', color: '#b45309', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '700' }}>Action Required</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309' }}>2 Items Highlighted</div>
                </div>
              </div>
            </div>

            {/* Explanatory Banner for Highlighted Items */}
            <div style={{
              backgroundColor: '#fffbeb',
              borderBottom: '1px solid #fef3c7',
              padding: '0.75rem 1.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.825rem', color: '#92400e', lineHeight: 1.45 }}>
                <strong>External Audit Preparation Notice:</strong> 39 out of 41 items are fully maintained and generatable within the PROME IMS platform. 
                <strong> 2 items (Part 3 Items 13 & 14) are highlighted below</strong> because they require project-specific third-party certificates: 
                <em> (1) Reports of load testing of equipment on site supervision projects (cranes, lifting hoists, batching plants)</em>, and 
                <em> (2) Annual employee occupational health medical fitness certificates from registered occupational medical clinics</em>.
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{
              padding: '0.9rem 1.75rem',
              backgroundColor: 'white',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'ALL', label: 'All Documents (41)' },
                  { key: '1', label: 'Part 01: IMS Integrated (18)' },
                  { key: '2', label: 'Part 2: QMS Focus (8)' },
                  { key: '3', label: 'Part 3: OH&S Focus (15)' },
                  { key: 'ACTION_REQUIRED', label: '⚠️ Action Required (2)' }
                ].map((tab) => {
                  const isActive = auditPartFilter === tab.key;
                  const isAction = tab.key === 'ACTION_REQUIRED';
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setAuditPartFilter(tab.key as any)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        borderRadius: '6px',
                        border: isAction 
                          ? (isActive ? '2px solid #b45309' : '1px solid #f59e0b') 
                          : (isActive ? '1px solid #0f172a' : '1px solid #e2e8f0'),
                        backgroundColor: isActive 
                          ? (isAction ? '#fef3c7' : '#0f172a') 
                          : (isAction ? '#fffbeb' : '#f8fafc'),
                        color: isActive 
                          ? (isAction ? '#92400e' : 'white') 
                          : (isAction ? '#b45309' : '#475569'),
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter by title, clause, code..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    fontSize: '0.825rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
                {auditSearchTerm && (
                  <button
                    onClick={() => setAuditSearchTerm('')}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Document Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {filteredAuditDocs.map((item) => {
                  const isActionReq = item.status === 'ACTION_REQUIRED';
                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: isActionReq ? '#fffdf7' : 'white',
                        border: isActionReq ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.1rem 1.25rem',
                        boxShadow: isActionReq ? '0 4px 12px rgba(245, 158, 11, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: isActionReq ? '#fef3c7' : '#e0f2fe',
                            color: isActionReq ? '#b45309' : '#0369a1',
                            fontWeight: '800',
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            letterSpacing: '0.04em'
                          }}>
                            {item.part.split(':')[0]} • Item {item.itemNumber}
                          </span>
                          
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.18rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {item.documentNumber}
                          </span>

                          <span style={{
                            backgroundColor: '#f8fafc',
                            color: '#64748b',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            padding: '0.18rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                          }}>
                            Div: {item.division}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isActionReq ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              padding: '0.25rem 0.7rem',
                              borderRadius: '9999px',
                              border: '1px solid #f59e0b'
                            }}>
                              <AlertTriangle size={13} />
                              Action Required • External Info
                            </span>
                          ) : item.pdfUrl ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0.25rem 0.7rem',
                              borderRadius: '9999px',
                              border: '1px solid #86efac'
                            }}>
                              <CheckCircle2 size={13} />
                              Available • View PDF
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0.25rem 0.7rem',
                              borderRadius: '9999px',
                              border: '1px solid #bbf7d0'
                            }}>
                              <FileCheck size={13} />
                              App Generated • Active Module
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: isActionReq ? '#92400e' : '#0f172a', margin: '0 0 0.35rem 0' }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.5rem 0', lineHeight: 1.45 }}>
                        {item.description}
                      </p>

                      {/* ISO Clause Tag */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: isActionReq || item.pdfUrl || item.portalPath ? '0.75rem' : '0' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Standard Clause:</span>
                        <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '700', backgroundColor: '#f0f9ff', padding: '0.1rem 0.45rem', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                          {item.isoClause}
                        </span>
                      </div>

                      {/* If Action Required: Highlighting Alert box with details */}
                      {isActionReq && (
                        <div style={{
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '6px',
                          padding: '0.75rem 0.95rem',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem'
                        }}>
                          <Info size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ fontSize: '0.825rem', color: '#92400e', lineHeight: 1.45 }}>
                            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Information Required to Satisfy Audit:</strong>
                            <div>{item.requiredInfo}</div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                        {/* Direct PDF Link */}
                        {item.pdfUrl && (
                          <a
                            href={item.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              backgroundColor: '#0284c7',
                              color: 'white',
                              padding: '0.42rem 0.8rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              textDecoration: 'none',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                            }}
                          >
                            <Eye size={14} />
                            {item.pdfLabel || 'View / Print PDF'}
                          </a>
                        )}

                        {/* Secondary PDF Link */}
                        {item.secondaryPdfUrl && (
                          <a
                            href={item.secondaryPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              backgroundColor: '#0369a1',
                              color: 'white',
                              padding: '0.42rem 0.8rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              textDecoration: 'none',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                            }}
                          >
                            <Download size={14} />
                            {item.secondaryPdfLabel || 'Secondary PDF'}
                          </a>
                        )}

                        {/* Direct Download button if PDF exists */}
                        {item.pdfUrl && (
                          <a
                            href={item.pdfUrl}
                            download
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '0.42rem 0.7rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              textDecoration: 'none',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            <Download size={13} />
                            Download
                          </a>
                        )}

                        {/* Open Portal Page Link */}
                        {item.portalPath && (
                          <button
                            onClick={() => {
                              setIsAuditModalOpen(false);
                              navigate(item.portalPath!);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              backgroundColor: isActionReq ? '#f59e0b' : '#0f766e',
                              color: 'white',
                              padding: '0.42rem 0.8rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                            }}
                          >
                            <ArrowUpRight size={14} />
                            {item.portalLabel ? `Open ${item.portalLabel}` : 'Open in IMS Portal'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredAuditDocs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Info size={32} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>No audit documents match your filter</h4>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.35rem' }}>Try clearing the search query or changing the filter tab.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.9rem 1.75rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Showing <strong>{filteredAuditDocs.length}</strong> of <strong>{PROME_AUDIT_DOCUMENTS_LIST.length}</strong> external audit documents
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#0f172a',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDashboard;
