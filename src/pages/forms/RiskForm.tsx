import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, Printer } from 'lucide-react';
import { QRCode } from 'react-qr-code';

export default function RiskForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('id');
  const isReadOnly = !!viewId;
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    projectName: '',
    projectManager: '',
    riskId: '',
    raisedBy: '',
    dateRaised: new Date().toISOString().split('T')[0],
    riskDescription: '',
    riskLikelihood: 'Medium',
    riskImpact: 'Medium',
    recommendedPreventativeActions: '',
    recommendedContingentActions: '',
    supportingDocumentation: '',
    signature: '',
    date: new Date().toISOString().split('T')[0],
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
      console.error('Failed to fetch risk form details', error);
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
            formType: 'RiskForm',
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
          pdf.save(`${currentUniqueId || 'PROME-Risk-Form'}.pdf`);

          setIsSubmitting(false);
          if (!isReadOnly) alert('Risk Form saved and exported successfully!');
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
              Risk Form
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              PROME-IMSR-AFD-14 · Risk Identification & Mitigation Form
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
            <div>I.D. No : PROME-IMSR-AFD-14</div>
            <div>Version No Original Issue</div>
            <div>Date : December 2023</div>
          </div>

          {/* Form Title */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000000' }}>
              Risk Form
            </h2>
          </div>

          {/* Main Boxed Layout */}
          <div style={{ border: '1.5px solid #000000', pointerEvents: isReadOnly ? 'none' : 'auto' }}>
            
            {/* Section 1: PROJECT DETAILS */}
            <div style={{ backgroundColor: '#002060', color: 'white', padding: '5px 8px', fontWeight: 'bold', fontSize: '11.5px', letterSpacing: '0.04em' }}>
              PROJECT DETAILS
            </div>
            <div style={{ borderBottom: '1.5px solid #000000', padding: '6px 8px' }}>
              <div style={{ display: 'flex', marginBottom: '6px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>Project Name:</span>
                <input 
                  type="text"
                  value={formData.projectName}
                  onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="Name of the project to which the risk relates"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '130px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>Project Manager:</span>
                <input 
                  type="text"
                  value={formData.projectManager}
                  onChange={e => setFormData({ ...formData, projectManager: e.target.value })}
                  placeholder="Name of the project manager responsible for mitigating the risk"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* Section 2: RISK DETAILS */}
            <div style={{ backgroundColor: '#002060', color: 'white', padding: '5px 8px', fontWeight: 'bold', fontSize: '11.5px', letterSpacing: '0.04em' }}>
              RISK DETAILS
            </div>
            <div style={{ borderBottom: '1.5px solid #000000', padding: '6px 8px' }}>
              <div style={{ display: 'flex', marginBottom: '6px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>Risk ID:</span>
                <input 
                  type="text"
                  value={formData.riskId}
                  onChange={e => setFormData({ ...formData, riskId: e.target.value })}
                  placeholder="Unique identifier assigned to this risk (e.g. RSK-001)"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', marginBottom: '6px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>Raised By:</span>
                <input 
                  type="text"
                  value={formData.raisedBy}
                  onChange={e => setFormData({ ...formData, raisedBy: e.target.value })}
                  placeholder="Name of person who is raising the risk"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', marginBottom: '8px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>Date Raised:</span>
                <input 
                  type="date"
                  value={formData.dateRaised}
                  onChange={e => setFormData({ ...formData, dateRaised: e.target.value })}
                  style={{ border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>

              {/* Risk Description */}
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '3px' }}>Risk Description:</span>
                <textarea 
                  rows={3}
                  value={formData.riskDescription}
                  onChange={e => setFormData({ ...formData, riskDescription: e.target.value })}
                  placeholder="Add a brief description of the risk identified and its likely impact on the project (e.g. scope, resources, deliverables, timescales and/or budgets)"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                />
              </div>

              {/* Likelihood & Impact Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #000000', margin: '4px -8px -6px -8px' }}>
                <div style={{ padding: '6px 8px', borderRight: '1px solid #000000' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Risk Likelihood:</span>
                  <p style={{ margin: '0 0 4px 0', fontSize: '9.5px', color: '#64748b', fontStyle: 'italic' }}>
                    Describe and rate the likelihood of the risk eventuating (i.e. Low, Medium or High)
                  </p>
                  <select
                    value={formData.riskLikelihood}
                    onChange={e => setFormData({ ...formData, riskLikelihood: e.target.value })}
                    style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Risk Impact:</span>
                  <p style={{ margin: '0 0 4px 0', fontSize: '9.5px', color: '#64748b', fontStyle: 'italic' }}>
                    Describe and rate the impact on the project if the risk eventuates (i.e. Low, Medium or High)
                  </p>
                  <select
                    value={formData.riskImpact}
                    onChange={e => setFormData({ ...formData, riskImpact: e.target.value })}
                    style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: RISK MITIGATION */}
            <div style={{ backgroundColor: '#002060', color: 'white', padding: '5px 8px', fontWeight: 'bold', fontSize: '11.5px', letterSpacing: '0.04em' }}>
              RISK MITIGATION
            </div>
            <div style={{ borderBottom: '1.5px solid #000000', padding: '6px 8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                  Recommended Preventative Actions:
                </span>
                <textarea 
                  rows={3}
                  value={formData.recommendedPreventativeActions}
                  onChange={e => setFormData({ ...formData, recommendedPreventativeActions: e.target.value })}
                  placeholder="Add a brief description of any actions that should be taken to prevent the risk from eventuating"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                />
              </div>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                  Recommended Contingent Actions:
                </span>
                <textarea 
                  rows={3}
                  value={formData.recommendedContingentActions}
                  onChange={e => setFormData({ ...formData, recommendedContingentActions: e.target.value })}
                  placeholder="Add a brief description of any actions that should be taken, in the event that the risk happens, to minimize its impact on the project"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                />
              </div>
            </div>

            {/* Section 4: APPROVAL DETAILS */}
            <div style={{ backgroundColor: '#002060', color: 'white', padding: '5px 8px', fontWeight: 'bold', fontSize: '11.5px', letterSpacing: '0.04em' }}>
              APPROVAL DETAILS
            </div>
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                  Supporting Documentation:
                </span>
                <input 
                  type="text"
                  value={formData.supportingDocumentation}
                  onChange={e => setFormData({ ...formData, supportingDocumentation: e.target.value })}
                  placeholder="Reference any supporting documentation used to substantiate this risk (e.g. site inspection report, contract clause, weather report)"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '11px' }}>Signature: </span>
                  <input 
                    type="text"
                    value={formData.signature}
                    onChange={e => setFormData({ ...formData, signature: e.target.value })}
                    placeholder="Type or sign name"
                    style={{ border: 'none', borderBottom: '1px solid #000000', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', width: '70%' }}
                  />
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '11px' }}>Date: </span>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    style={{ border: 'none', borderBottom: '1px solid #000000', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '11px', letterSpacing: '0.02em', color: '#002060' }}>
                  PLEASE FORWARD THIS FORM TO THE PROJECT MANAGER/HoD
                </strong>
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
                value={`https://ims.promeconsult.com/forms/risk?id=${uniqueId || ''}`}
                size={42} 
              />
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>
            PROME Consultants Ltd · ISO 9001:2015 Integrated Management System · PROME-IMSR-AFD-14
          </div>
        </div>
      </div>
    </div>
  );
}
