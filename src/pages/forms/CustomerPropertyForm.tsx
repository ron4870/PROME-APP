import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, Printer } from 'lucide-react';
import { QRCode } from 'react-qr-code';

export default function CustomerPropertyForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('id');
  const isReadOnly = !!viewId;
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    propertyName: '',
    deptSection: '',
    contact: '',
    propertyNumber: '',
    propertyRecordsFileNumber: '',
    description: '',
    cost: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    newUsed: 'New',
    availability: 'In Use',
    condition: 'Good',
    howTagged: '',
    purpose: '',
    comments: '',
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
      console.error('Failed to fetch customer property form details', error);
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
            formType: 'CustomerProperty',
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
          pdf.save(`${currentUniqueId || 'PROME-Customer-Property-Info'}.pdf`);

          setIsSubmitting(false);
          if (!isReadOnly) alert('Customer Property Information Sheet saved and exported successfully!');
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
      
      {/* Header Bar */}
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
              Customer Property Information Sheet
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              PROME-QMSR-AFD-10 · Control of Customer Property (ISO 9001:2015 Clause 8.5.3)
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
          {/* Top Logo & Barcode */}
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

          {/* Form Control Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', border: '1.5px solid black', padding: '4px 8px', marginBottom: '16px', fontSize: '11px', fontWeight: 'bold' }}>
            <div>I.D. No PROME-QMSR-AFD-10</div>
            <div>Version No : 02</div>
            <div>Date : December 2023</div>
          </div>

          {/* Form Title */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000000' }}>
              Customer Property Information Sheet
            </h2>
          </div>

          {/* Form Content Box */}
          <div style={{ border: '1.5px solid black', pointerEvents: isReadOnly ? 'none' : 'auto' }}>
            
            {/* Top 2-Row Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', borderBottom: '1.5px solid black' }}>
              <div style={{ padding: '8px 10px', borderRight: '1.5px solid black' }}>
                <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '11.5px', width: '115px' }}>Property Name:</span>
                  <input 
                    type="text"
                    value={formData.propertyName}
                    onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
                    placeholder="e.g. Total Station Survey Equipment"
                    style={{ border: 'none', borderBottom: '1px solid #000000', width: 'calc(100% - 115px)', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '11.5px', width: '115px' }}>Dept / Section:</span>
                  <input 
                    type="text"
                    value={formData.deptSection}
                    onChange={e => setFormData({ ...formData, deptSection: e.target.value })}
                    placeholder="e.g. Survey & BE&ED"
                    style={{ border: 'none', borderBottom: '1px solid #000000', width: 'calc(100% - 115px)', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                  />
                </div>
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11.5px', width: '65px' }}>Contact:</span>
                <input 
                  type="text"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Client contact person & phone"
                  style={{ border: 'none', borderBottom: '1px solid #000000', width: 'calc(100% - 65px)', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Property Data Rows */}
            {[
              { key: 'propertyNumber', label: 'Property #', placeholder: 'Assigned customer property tag or inventory number' },
              { key: 'propertyRecordsFileNumber', label: 'Property Records File #', placeholder: 'Project file / registry file reference' },
              { key: 'description', label: 'Description:', placeholder: 'Full technical description of property / accessories' },
              { key: 'cost', label: 'Cost', placeholder: 'Declared value / insurance cost (UGX or USD)' },
              { key: 'manufacturer', label: 'Manufacturer:', placeholder: 'Equipment / software manufacturer brand' },
              { key: 'modelNumber', label: 'Model #', placeholder: 'Manufacturer model number' },
              { key: 'serialNumber', label: 'Serial #', placeholder: 'Manufacturer unique serial number' },
              { key: 'acquisitionDate', label: 'Acquisition Date:', isDate: true },
              { key: 'newUsed', label: 'New/Used:', isSelect: true, options: ['New', 'Used'] },
              { key: 'availability', label: 'Availability:', placeholder: 'e.g. Available / In Use on Project Site / In Store' },
              { key: 'condition', label: 'Condition:', placeholder: 'e.g. Excellent / Good / Fair / Functional' },
              { key: 'howTagged', label: 'How Tagged:', placeholder: 'e.g. Barcode label attached / Engraved / Asset tag' },
              { key: 'purpose', label: 'Purpose:', placeholder: 'Project purpose and consultancy scope of use' },
              { key: 'comments', label: 'Comments:', isTextarea: true, placeholder: 'Any special maintenance, handling, calibration or return conditions' },
            ].map((field, idx, arr) => (
              <div 
                key={field.key}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '200px 1fr', 
                  borderBottom: idx === arr.length - 1 ? 'none' : '1px solid black',
                  minHeight: field.isTextarea ? '65px' : '28px'
                }}
              >
                <div style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '11px', borderRight: '1.5px solid black', backgroundColor: '#fdfdfd' }}>
                  {field.label}
                </div>
                <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                  {field.isDate ? (
                    <input 
                      type="date"
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                    />
                  ) : field.isSelect ? (
                    <select
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      style={{ padding: '2px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    >
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.isTextarea ? (
                    <textarea 
                      rows={2}
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                    />
                  ) : (
                    <input 
                      type="text"
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                    />
                  )}
                </div>
              </div>
            ))}

          </div>

          {/* Bottom Approval & Stamp */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px' }}>
            <div>
              <span>Approved by............................................................</span>
            </div>
            <div>
              <QRCode 
                value={`https://ims.promeconsult.com/forms/customer-property?id=${uniqueId || ''}`}
                size={42} 
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>
            PROME Consultants Ltd · ISO 9001:2015 Integrated Management System · PROME-QMSR-AFD-10
          </div>
        </div>
      </div>
    </div>
  );
}
