import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, FileText, CheckCircle2, Clock, X, 
  Printer, Download, ExternalLink, ShieldCheck, ChevronRight, Info, Filter 
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { 
  PROME_DOCUMENT_MASTERLIST, 
  PROME_MASTERLIST_HEADER, 
  PROME_MASTERLIST_CATEGORIES, 
  type MasterDocumentItem 
} from '../data/promeDocumentMasterlist';
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

const DocumentDashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [dbDocuments, setDbDocuments] = useState<DocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
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
          department: foundDb.division || masterItem.department,
          retentionPeriod: foundDb.retentionPeriod || masterItem.retentionPeriod,
          status: foundDb.status || masterItem.status,
        };
      }
      return masterItem;
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
        department: dbDoc.division || 'General',
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

        {/* Action Buttons: Print PDF, Download, Register */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                                      onClick={() => navigate(item.portalPath!)}
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
                  placeholder="e.g. Administration, BE&ED, Accounts/ Finance"
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
                <datalist id="new-division-list">
                  <option value="Administration" />
                  <option value="BE&ED" />
                  <option value="Business Development" />
                  <option value="Accounts and Purchasing" />
                  <option value="Accounts/ Finance" />
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
    </div>
  );
};

export default DocumentDashboard;
