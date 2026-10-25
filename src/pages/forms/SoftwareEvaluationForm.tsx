import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, Printer } from 'lucide-react';
import { QRCode } from 'react-qr-code';

export default function SoftwareEvaluationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('id');
  const isReadOnly = !!viewId;
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    requestedBy: '',
    date: new Date().toISOString().split('T')[0],
    deptSection: '',
    officePhone: '',
    emailAddress: '',
    isFundingAvailable: 'Yes',
    softwareNameAndManufacturer: '',
    briefDescription: '',
    installLocation: '',
    requiredInstallationDate: '',
    makesObsoleteOtherPackage: 'No',
    testResults: '',
    misSignature: '',
    misDate: '',
    mgmtSignature: '',
    mgmtDate: '',
  });

  const [uniqueId, setUniqueId] = useState<string | null>(null);

  useEffect(() => {
    if (barcodeRef.current && uniqueId) {
      try {
        JsBarcode(barcodeRef.current, uniqueId, {
          format: 'CODE128',
          displayValue: true,
          height: 38,
          width: 1.4,
          fontSize: 13,
          margin: 0
        });
      } catch (e) {
        console.error('Barcode generation failed', e);
      }
    }
  }, [uniqueId]);

  useEffect(() => {
    if (isReadOnly && viewId) {
      fetchFormDetails(viewId);
    }
  }, [isReadOnly, viewId]);

  const fetchFormDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
      const response = await fetch(`/api/forms/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUniqueId(data.uniqueId);
        if (data.data) {
          setFormData(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch software evaluation form details', error);
    }
  };

  const handleSaveAndExport = async () => {
    try {
      setIsSubmitting(true);
      let currentUniqueId = uniqueId;

      if (!isReadOnly && !currentUniqueId) {
        const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
        const response = await fetch('/api/forms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            formType: 'SoftwareEvaluation',
            data: formData
          })
        });

        if (response.ok) {
          const result = await response.json();
          currentUniqueId = result.uniqueId;
          setUniqueId(currentUniqueId);
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to save form');
        }
      }

      // Generate PDF
      if (formRef.current) {
        setTimeout(async () => {
          const element = formRef.current!;
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${currentUniqueId || 'PROME-Software-Evaluation'}.pdf`);

          setIsSubmitting(false);
          if (!isReadOnly) alert('Software Evaluation Form saved and exported successfully!');
          navigate('/forms');
        }, 120);
      } else {
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error saving form: ${error.message || error}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout-container" style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => navigate('/forms')}
            style={{ background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Back to Forms"
          >
            <ArrowLeft size={18} color="#374151" />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Software Evaluation Form
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              PROME-QMSR-PMBDO-06 · ISO Compliance Form
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155', fontWeight: '600', fontSize: '0.875rem' }}
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={handleSaveAndExport}
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', backgroundColor: '#0f766e', border: 'none', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', color: 'white', fontWeight: '600', fontSize: '0.875rem' }}
          >
            {isReadOnly ? <Download size={16} /> : <Save size={16} />}
            {isSubmitting ? 'Saving...' : isReadOnly ? 'Download PDF' : 'Save & Download PDF'}
          </button>
        </div>
      </div>

      {/* Printable A4 Form Sheet */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div 
          ref={formRef}
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '16mm 20mm',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            boxSizing: 'border-box',
            position: 'relative',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Top Company Logo & Barcode Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/prome.png" alt="PROME Logo" style={{ height: '44px' }} />
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              {uniqueId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg ref={barcodeRef}></svg>
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', padding: '4px 8px', color: '#94a3b8', fontSize: '11px', height: '44px', display: 'flex', alignItems: 'center' }}>
                  Barcode generated upon submission
                </div>
              )}
            </div>
          </div>

          {/* Form Control Header Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', border: '1.5px solid black', padding: '4px 8px', marginBottom: '16px', fontSize: '11px', fontWeight: 'bold' }}>
            <div>I.D. No PROME-QMSR-PMBDO-06</div>
            <div>Version Original Issue</div>
            <div>Date : December 2023</div>
          </div>

          {/* Form Title */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', textDecoration: 'none', color: '#000000' }}>
              Software Evaluation Form
            </h2>
          </div>

          {/* Instructional Box */}
          <div style={{ border: '1.5px solid black', padding: '8px 10px', fontSize: '9.5px', lineHeight: '1.35', fontStyle: 'italic', marginBottom: '14px', backgroundColor: '#fafafa' }}>
            The purpose of this process is to ensure that software packages are fully tested to meet the intended Consultancy requirements before they are purchased. This form is to be completed and submitted to the MIS, at least 1 week before the use of the software is required to allow sufficient time to install, test and verify functionality and its compatibility with the Consultancy’s existing configurations. The requisitioner shall supply a copy of the software to be tested to MIS or advise them the website where it can be downloaded.
          </div>

          {/* Form Fields Grid */}
          <div style={{ border: '1.5px solid black', pointerEvents: isReadOnly ? 'none' : 'auto' }}>
            {/* Row 1: Requested by & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid black' }}>
              <div style={{ padding: '6px 8px', borderRight: '1.5px solid black' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Requested by:</span>
                <input 
                  type="text" 
                  value={formData.requestedBy}
                  onChange={e => setFormData({ ...formData, requestedBy: e.target.value })}
                  placeholder="Requisitioner Name"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ padding: '6px 8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Date:</span>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Row 2: Dept/Section & Office Phone / Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid black' }}>
              <div style={{ padding: '6px 8px', borderRight: '1.5px solid black' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Dept/Section:</span>
                <input 
                  type="text" 
                  value={formData.deptSection}
                  onChange={e => setFormData({ ...formData, deptSection: e.target.value })}
                  placeholder="e.g. BE&ED, PMBDD, AFD"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '11px' }}>Office phone: </span>
                  <input 
                    type="text" 
                    value={formData.officePhone}
                    onChange={e => setFormData({ ...formData, officePhone: e.target.value })}
                    placeholder="+256..."
                    style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', width: '60%' }}
                  />
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '11px' }}>Email Address: </span>
                  <input 
                    type="email" 
                    value={formData.emailAddress}
                    onChange={e => setFormData({ ...formData, emailAddress: e.target.value })}
                    placeholder="email@promeconsult.com"
                    style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', width: '60%' }}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Is funding available? */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', marginRight: '8px' }}>Is funding available?</span>
              <input 
                type="text" 
                value={formData.isFundingAvailable}
                onChange={e => setFormData({ ...formData, isFundingAvailable: e.target.value })}
                placeholder="Yes / No (Provide vote/budget details)"
                style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', width: '70%' }}
              />
            </div>

            {/* Row 4: Name of software and manufacturer */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Name of software and manufacturer:</span>
              <input 
                type="text" 
                value={formData.softwareNameAndManufacturer}
                onChange={e => setFormData({ ...formData, softwareNameAndManufacturer: e.target.value })}
                placeholder="e.g. AutoCAD Civil 3D - Autodesk / ArcGIS - Esri"
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
              />
            </div>

            {/* Row 5: Brief description */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Brief description:</span>
              <textarea 
                rows={3}
                value={formData.briefDescription}
                onChange={e => setFormData({ ...formData, briefDescription: e.target.value })}
                placeholder="Provide a description of the software features, modules needed, and consultancy application..."
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
              />
            </div>

            {/* Row 6: Install location & Required Installation date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid black' }}>
              <div style={{ padding: '6px 8px', borderRight: '1.5px solid black' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Install location :</span>
                <input 
                  type="text" 
                  value={formData.installLocation}
                  onChange={e => setFormData({ ...formData, installLocation: e.target.value })}
                  placeholder="e.g. Design Workstation 04 / Head Office Server"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ padding: '6px 8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Required Installation date:</span>
                <input 
                  type="date" 
                  value={formData.requiredInstallationDate}
                  onChange={e => setFormData({ ...formData, requiredInstallationDate: e.target.value })}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Row 7: Does this software make obsolete any other installed package? */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                Does this software make obsolete any other installed package?
              </span>
              <input 
                type="text" 
                value={formData.makesObsoleteOtherPackage}
                onChange={e => setFormData({ ...formData, makesObsoleteOtherPackage: e.target.value })}
                placeholder="Specify any packages to be superseded or retired..."
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
              />
            </div>

            {/* Row 8: Test results */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black', minHeight: '120px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Test results:</span>
              <textarea 
                rows={6}
                value={formData.testResults}
                onChange={e => setFormData({ ...formData, testResults: e.target.value })}
                placeholder="Document installation testing, compatibility with PROME network/OS, licence verification, and performance findings..."
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
              />
            </div>

            {/* MIS Approval */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black', backgroundColor: '#f9fafb' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>MIS approval:</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid black' }}>
              <div style={{ padding: '6px 8px', borderRight: '1.5px solid black' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', marginRight: '6px' }}>Signature :</span>
                <input 
                  type="text" 
                  value={formData.misSignature}
                  onChange={e => setFormData({ ...formData, misSignature: e.target.value })}
                  placeholder="MIS Officer Signature"
                  style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', width: '70%' }}
                />
              </div>
              <div style={{ padding: '6px 8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', marginRight: '6px' }}>Date:</span>
                <input 
                  type="date" 
                  value={formData.misDate}
                  onChange={e => setFormData({ ...formData, misDate: e.target.value })}
                  style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Management Approval */}
            <div style={{ padding: '6px 8px', borderBottom: '1.5px solid black', backgroundColor: '#f9fafb' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Management approval:</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '6px 8px', borderRight: '1.5px solid black' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', marginRight: '6px' }}>Signature :</span>
                <input 
                  type="text" 
                  value={formData.mgmtSignature}
                  onChange={e => setFormData({ ...formData, mgmtSignature: e.target.value })}
                  placeholder="Managing Director / HoD Signature"
                  style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', width: '70%' }}
                />
              </div>
              <div style={{ padding: '6px 8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', marginRight: '6px' }}>Date:</span>
                <input 
                  type="date" 
                  value={formData.mgmtDate}
                  onChange={e => setFormData({ ...formData, mgmtDate: e.target.value })}
                  style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Approval & Stamp */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px' }}>
            <div>
              <span>Approved by............................................................</span>
            </div>
            <div>
              <QRCode 
                value={`https://ims.promeconsult.com/forms/software-evaluation?id=${uniqueId || ''}`}
                size={42} 
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>
            PROME Consultants Ltd · ISO 9001:2015 Integrated Management System · PROME-QMSR-PMBDO-06
          </div>
        </div>
      </div>
    </div>
  );
}
