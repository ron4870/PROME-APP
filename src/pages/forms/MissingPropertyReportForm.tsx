import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, Printer } from 'lucide-react';
import { QRCode } from 'react-qr-code';

export default function MissingPropertyReportForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('id');
  const isReadOnly = !!viewId;
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    propertyName: '',
    date: new Date().toISOString().split('T')[0],
    propertyNumber: '',
    serialNumber: '',
    deptSection: '',
    propertyDescription: '',
    acquisitionCost: '',
    acquisitionDate: '',
    dateOfDiscovery: new Date().toISOString().split('T')[0],
    condition: 'Good',
    nameOfLastPersonInCustody: '',
    circumstances: 'Missing', // 'Missing' | 'Stolen' | 'Damaged' | 'Destroyed'
    pleaseExplain: '',
    policeReportAttached: false,
    policeReportReference: '',
    // Investigative steps
    physicalSearchDate: '',
    questionPersonDate: '',
    followUpLeadsDate: '',
    staffAidDate: '',
    // Department Head Determination
    departmentHeadFinding: 'not_negligent', // 'negligent' | 'not_negligent' | 'unable_to_determine'
    departmentHeadSignature: '',
    departmentHeadDate: '',
    // Recovery section
    recoveryLocation: '',
    recoverySignature: '',
    recoveryDate: '',
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
      console.error('Failed to fetch property report form details', error);
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
            formType: 'MissingPropertyReport',
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
          pdf.save(`${currentUniqueId || 'PROME-Missing-Property-Report'}.pdf`);

          setIsSubmitting(false);
          if (!isReadOnly) alert('Report Card saved and exported successfully!');
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
      
      {/* Header bar */}
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
              Report Card for Missing, Stolen, Damaged, or Destroyed Property
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              PROME-QMSR-PMBDO-08 · Property Incident & Loss Investigation
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
            padding: '14mm 18mm',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '6px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/prome.png" alt="PROME Logo" style={{ height: '40px' }} />
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              {uniqueId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg ref={barcodeRef}></svg>
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', padding: '3px 8px', color: '#94a3b8', fontSize: '11px', height: '40px', display: 'flex', alignItems: 'center' }}>
                  Barcode generated upon submission
                </div>
              )}
            </div>
          </div>

          {/* Form Control Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', border: '1.5px solid black', padding: '3px 8px', marginBottom: '12px', fontSize: '10.5px', fontWeight: 'bold' }}>
            <div>I.D. No : PROME-QMSR-PMBDO-08</div>
            <div>Version No : 02</div>
            <div>Date of issue : December 2023</div>
          </div>

          {/* Form Title */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 'bold', color: '#000000' }}>
              Report Card for Missing, Stolen, Damaged, or Destroyed Property
            </h2>
          </div>

          {/* Top Property Details Section */}
          <div style={{ border: '1.5px solid black', padding: '8px 10px', fontSize: '10.5px', lineHeight: '1.8', marginBottom: '10px', pointerEvents: isReadOnly ? 'none' : 'auto' }}>
            {/* Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '10px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Property Name:</span>
                <input 
                  type="text"
                  value={formData.propertyName}
                  onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '45px', flexShrink: 0 }}>Date:</span>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', gap: '10px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '75px', flexShrink: 0 }}>Property #:</span>
                <input 
                  type="text"
                  value={formData.propertyNumber}
                  onChange={e => setFormData({ ...formData, propertyNumber: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '55px', flexShrink: 0 }}>Serial #:</span>
                <input 
                  type="text"
                  value={formData.serialNumber}
                  onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '90px', flexShrink: 0 }}>Dept/Section:</span>
              <input 
                type="text"
                value={formData.deptSection}
                onChange={e => setFormData({ ...formData, deptSection: e.target.value })}
                style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
              />
            </div>

            {/* Row 4 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '130px', flexShrink: 0 }}>Property Description:</span>
              <input 
                type="text"
                value={formData.propertyDescription}
                onChange={e => setFormData({ ...formData, propertyDescription: e.target.value })}
                style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
              />
            </div>

            {/* Row 5 */}
            <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', gap: '10px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Acquisition Cost:</span>
                <input 
                  type="text"
                  value={formData.acquisitionCost}
                  onChange={e => setFormData({ ...formData, acquisitionCost: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Acquisition Date:</span>
                <input 
                  type="date"
                  value={formData.acquisitionDate}
                  onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Row 6 */}
            <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', gap: '10px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '115px', flexShrink: 0 }}>Date of Discovery:</span>
                <input 
                  type="date"
                  value={formData.dateOfDiscovery}
                  onChange={e => setFormData({ ...formData, dateOfDiscovery: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', marginRight: '6px' }}>Condition:</span>
                {['Excellent', 'Good', 'Fair', 'Poor'].map((c) => (
                  <label key={c} style={{ marginRight: '8px', cursor: 'pointer', fontSize: '10.5px' }}>
                    <input 
                      type="radio" 
                      name="condition" 
                      value={c} 
                      checked={formData.condition === c} 
                      onChange={() => setFormData({ ...formData, condition: c })}
                      style={{ marginRight: '3px' }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {/* Row 7 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '235px', flexShrink: 0 }}>Name of last person(s) in custody of item:</span>
              <input 
                type="text"
                value={formData.nameOfLastPersonInCustody}
                onChange={e => setFormData({ ...formData, nameOfLastPersonInCustody: e.target.value })}
                style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent' }}
              />
            </div>

            {/* Row 8 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Circumstances regarding property:</span>
              {['Missing', 'Stolen', 'Damaged', 'Destroyed'].map((circ) => (
                <label key={circ} style={{ marginRight: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10.5px' }}>
                  <input 
                    type="radio" 
                    name="circumstances" 
                    value={circ} 
                    checked={formData.circumstances === circ} 
                    onChange={() => setFormData({ ...formData, circumstances: circ })}
                    style={{ marginRight: '4px' }}
                  />
                  {circ}
                </label>
              ))}
            </div>

            {/* Row 9 */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', width: '90px', flexShrink: 0 }}>Please explain:</span>
              <textarea 
                rows={2}
                value={formData.pleaseExplain}
                onChange={e => setFormData({ ...formData, pleaseExplain: e.target.value })}
                style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10.5px', backgroundColor: 'transparent', resize: 'none' }}
              />
            </div>
          </div>

          {/* Stolen Section Note */}
          <div style={{ border: '1.5px solid black', padding: '4px 8px', fontSize: '10.5px', fontWeight: 'bold', marginBottom: '10px', backgroundColor: '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>If Stolen: Original police incident report must be attached</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '10px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.policeReportAttached}
                  onChange={e => setFormData({ ...formData, policeReportAttached: e.target.checked })}
                  style={{ marginRight: '4px' }}
                />
                Police Report Attached
              </label>
              <input 
                type="text" 
                placeholder="Police Ref / Station"
                value={formData.policeReportReference}
                onChange={e => setFormData({ ...formData, policeReportReference: e.target.value })}
                style={{ border: '1px solid #cbd5e1', padding: '2px 4px', fontSize: '10px', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* Investigative Steps Section */}
          <div style={{ border: '1.5px solid black', padding: '6px 8px', fontSize: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid black', paddingBottom: '3px', marginBottom: '6px', fontWeight: 'bold' }}>
              <span>If Missing: The following investigative steps must be completed</span>
              <span>Note date completed</span>
            </div>

            {[
              { key: 'physicalSearchDate', label: 'Physical search of last known location and surrounding area:' },
              { key: 'questionPersonDate', label: 'Question last person(s) in custody of property:' },
              { key: 'followUpLeadsDate', label: 'Follow up any leads. If informed that item was transferred to another department, then contact the department and attempt to confirm transfer' },
              { key: 'staffAidDate', label: 'Department or section head contact all staff to solicit aid in searching for asset and takes preventive action to more fully secure property' },
            ].map((step) => (
              <div key={step.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ width: '75%', lineHeight: '1.3' }}>▪ {step.label}</span>
                <input 
                  type="date"
                  value={(formData as any)[step.key]}
                  onChange={e => setFormData({ ...formData, [step.key]: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', outline: 'none', fontSize: '10px', width: '22%' }}
                />
              </div>
            ))}
          </div>

          {/* Department Head Determination */}
          <div style={{ border: '1.5px solid black', padding: '6px 8px', fontSize: '10px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
              To be completed by Department/section head. Please check box. If applicable, indicate "unable to determine" here.
            </div>

            {/* 2 Comparison Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div 
                onClick={() => setFormData({ ...formData, departmentHeadFinding: 'negligent' })}
                style={{ 
                  border: formData.departmentHeadFinding === 'negligent' ? '2px solid #b91c1c' : '1px solid black', 
                  padding: '6px', 
                  fontSize: '9.5px', 
                  lineHeight: '1.35', 
                  cursor: 'pointer',
                  backgroundColor: formData.departmentHeadFinding === 'negligent' ? '#fef2f2' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    type="radio" 
                    name="finding" 
                    checked={formData.departmentHeadFinding === 'negligent'} 
                    onChange={() => setFormData({ ...formData, departmentHeadFinding: 'negligent' })}
                  />
                  <span>
                    Our investigation of the circumstances surrounding the disappearance of the property listed herein indicates reasonable cause to believe that the loss, destruction, or damage to this property was through negligence of the person(s) charged with the care and custody of this property.
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setFormData({ ...formData, departmentHeadFinding: 'not_negligent' })}
                style={{ 
                  border: formData.departmentHeadFinding === 'not_negligent' ? '2px solid #15803d' : '1px solid black', 
                  padding: '6px', 
                  fontSize: '9.5px', 
                  lineHeight: '1.35', 
                  cursor: 'pointer',
                  backgroundColor: formData.departmentHeadFinding === 'not_negligent' ? '#f0fdf4' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    type="radio" 
                    name="finding" 
                    checked={formData.departmentHeadFinding === 'not_negligent'} 
                    onChange={() => setFormData({ ...formData, departmentHeadFinding: 'not_negligent' })}
                  />
                  <span>
                    Our investigation of the circumstances surrounding the disappearance of the property listed herein indicates that the person(s) charged with the care and custody of this property was/were not negligent.
                  </span>
                </div>
              </div>
            </div>

            {/* Unable to determine */}
            <div style={{ marginBottom: '8px', fontSize: '10px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="radio" 
                  name="finding" 
                  checked={formData.departmentHeadFinding === 'unable_to_determine'} 
                  onChange={() => setFormData({ ...formData, departmentHeadFinding: 'unable_to_determine' })}
                />
                <strong>Unable to determine cause or negligence at this stage</strong>
              </label>
            </div>

            {/* Department Head Signature */}
            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '10px', paddingTop: '4px', borderTop: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '70px' }}>Signature:</span>
                <input 
                  type="text"
                  placeholder="Department Head Signature"
                  value={formData.departmentHeadSignature}
                  onChange={e => setFormData({ ...formData, departmentHeadSignature: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '40px' }}>Date:</span>
                <input 
                  type="date"
                  value={formData.departmentHeadDate}
                  onChange={e => setFormData({ ...formData, departmentHeadDate: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10px' }}
                />
              </div>
            </div>
          </div>

          {/* Recovery Section */}
          <div style={{ border: '1.5px solid black', padding: '6px 8px', fontSize: '10px', marginBottom: '8px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 'bold', fontStyle: 'italic', marginBottom: '4px' }}>
              If recovered: Complete this section and forward to property officer
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '65px' }}>Location:</span>
              <input 
                type="text"
                placeholder="Recovery location and conditions"
                value={formData.recoveryLocation}
                onChange={e => setFormData({ ...formData, recoveryLocation: e.target.value })}
                style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10px', backgroundColor: 'transparent' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '70px' }}>Signature:</span>
                <input 
                  type="text"
                  placeholder="Property Officer Signature"
                  value={formData.recoverySignature}
                  onChange={e => setFormData({ ...formData, recoverySignature: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '40px' }}>Date:</span>
                <input 
                  type="date"
                  value={formData.recoveryDate}
                  onChange={e => setFormData({ ...formData, recoveryDate: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid black', width: '100%', outline: 'none', fontSize: '10px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Approval & Stamp */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '10.5px' }}>
            <div>
              <span>Approved by............................................................</span>
            </div>
            <div>
              <QRCode 
                value={`https://ims.promeconsult.com/forms/missing-property-report?id=${uniqueId || ''}`}
                size={40} 
              />
            </div>
          </div>

          <div style={{ marginTop: '10px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>
            PROME Consultants Ltd · ISO 9001:2015 Integrated Management System · PROME-QMSR-PMBDO-08
          </div>
        </div>
      </div>
    </div>
  );
}
