import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Printer, Download, X, Save, Edit3 } from 'lucide-react';

export interface QualityObjectiveData {
  id?: number;
  objectiveNumber: string;
  title: string;
  description?: string | null;
  division?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string;
  corporateStrategicObjective?: string | null;
  departmentalQualityObjective?: string | null;
  strategyMethodology?: string | null;
  measurementMethod?: string | null;
  frequencyOfReview?: number | null;
  kpiTargetPrevious?: string | null;
  statusPreviousYear?: string | null;
  kpiTargetCurrent?: string | null;
  q1Status?: string | null;
  q2Status?: string | null;
  q3Status?: string | null;
  q4Status?: string | null;
  comments?: string | null;
  records?: string | null;
  departmentHeadApproval?: string | null;
  departmentHeadDate?: string | null;
  managingDirectorApproval?: string | null;
  managingDirectorDate?: string | null;
}

interface Props {
  objective: QualityObjectiveData;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: QualityObjectiveData) => Promise<void>;
  editable?: boolean;
}

export const QualityObjectiveIsoSheet: React.FC<Props> = ({
  objective,
  isOpen,
  onClose,
  onSave,
  editable = true,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<QualityObjectiveData>({ ...objective });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${formData.objectiveNumber || 'Quality-Objective'}-Version-3.0.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveInternal = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
      alert('Quality Objective updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save objective.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '2rem 1rem'
    }}>
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '920px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        {/* Modal Controls Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#0f172a',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
              ISO 9001:2015 Clause 6.2 · Quality Objectives Form
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'white' }}>
              {formData.objectiveNumber} · {formData.division || 'PMBDD'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {editable && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  backgroundColor: isEditing ? '#0f766e' : '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={15} /> {isEditing ? 'View Mode' : 'Edit Quarter Values'}
              </button>
            )}

            {isEditing && (
              <button
                onClick={handleSaveInternal}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.95rem',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Download size={15} /> {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>

            <button
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                backgroundColor: '#475569',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Printable Official ISO Sheet (Version 3.0) */}
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', backgroundColor: '#e2e8f0' }}>
          <div
            ref={printRef}
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
              fontSize: '11px',
              lineHeight: '1.4'
            }}
          >
            {/* Top Barcode and Logo Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                {/* Clean Barcode replica */}
                <div style={{ display: 'inline-block', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '1.5px', height: '24px', alignItems: 'stretch' }}>
                    {[2,1,3,1,2,3,1,2,1,3,2,1,2,3,1,2,1,3,2,1,3,1,2,1,3,2,1,2,3,1].map((w, i) => (
                      <div key={i} style={{ width: `${w}px`, backgroundColor: i % 2 === 0 ? '#000' : 'transparent' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.5px', marginTop: '2px', fontFamily: 'monospace' }}>
                    PROME - Quality Objectives
                  </div>
                </div>
              </div>

              <div>
                <img src="/prome.png" alt="PROME Logo" style={{ height: '38px' }} />
              </div>
            </div>

            {/* Red Heading Bar */}
            <div style={{ textAlign: 'center', borderTop: '3px solid #c00000', borderBottom: '1px solid #cbd5e1', padding: '6px 0', marginBottom: '14px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#c00000', letterSpacing: '0.04em' }}>
                QUALITY OBJECTIVES
              </h1>
            </div>

            {/* Department */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px' }}>DEPARTMENT:</span>
              <div style={{ flex: 1, border: '1px solid black', padding: '4px 8px', fontWeight: 'bold', fontSize: '11.5px', backgroundColor: '#fdfdfd' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.division || ''}
                    onChange={e => setFormData({ ...formData, division: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '11.5px', backgroundColor: 'transparent' }}
                  />
                ) : (
                  formData.division || 'PROJECT MANAGEMENT & BUSINESS DEVELOPMENT DIVISION (PMBDD)'
                )}
              </div>
            </div>

            {/* Corporate Strategic Objective */}
            <div style={{ display: 'flex', marginBottom: '14px', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px', lineHeight: '1.25', flexShrink: 0 }}>
                CORPORATE<br />STRATEGIC<br />OBJECTIVE:
              </div>
              <div style={{ flex: 1, border: '1px solid black', padding: '6px 8px', minHeight: '44px', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff' }}>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={formData.corporateStrategicObjective || ''}
                    onChange={e => setFormData({ ...formData, corporateStrategicObjective: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                  />
                ) : (
                  formData.corporateStrategicObjective || '-'
                )}
              </div>
            </div>

            {/* Departmental Quality Objective */}
            <div style={{ display: 'flex', marginBottom: '14px', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px', lineHeight: '1.25', flexShrink: 0 }}>
                DEPARTMENTAL<br />QUALITY<br />OBJECTIVE:
              </div>
              <div style={{ flex: 1, border: '1px solid black', padding: '6px 8px', minHeight: '52px', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff' }}>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={formData.departmentalQualityObjective || ''}
                    onChange={e => setFormData({ ...formData, departmentalQualityObjective: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                  />
                ) : (
                  formData.departmentalQualityObjective || '-'
                )}
              </div>
            </div>

            {/* Strategy / Methodology */}
            <div style={{ display: 'flex', marginBottom: '14px', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px', lineHeight: '1.25', flexShrink: 0 }}>
                STRATEGY/<br />METHODOLOGY:
              </div>
              <div style={{ flex: 1, border: '1px solid black', padding: '6px 8px', minHeight: '56px', backgroundColor: '#ffffff', whiteSpace: 'pre-line' }}>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formData.strategyMethodology || ''}
                    onChange={e => setFormData({ ...formData, strategyMethodology: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                  />
                ) : (
                  formData.strategyMethodology || '-'
                )}
              </div>
            </div>

            {/* Measurement Method */}
            <div style={{ display: 'flex', marginBottom: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px', lineHeight: '1.25', flexShrink: 0 }}>
                MEASUREMENT<br />METHOD:
              </div>
              <div style={{ flex: 1, border: '1px solid black', padding: '6px 8px', minHeight: '32px', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', fontWeight: '500' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.measurementMethod || ''}
                    onChange={e => setFormData({ ...formData, measurementMethod: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                  />
                ) : (
                  formData.measurementMethod || '-'
                )}
              </div>
            </div>

            {/* Quarterly Review Table */}
            <div style={{ border: '1px solid #7dd3fc', marginBottom: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '10.5px' }}>
                <thead>
                  {/* Top Header Row */}
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ width: '15%', padding: '6px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      Frequency of<br />Review
                    </th>
                    <th style={{ width: '15%', padding: '6px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      KPI Target<br />2025
                    </th>
                    <th style={{ width: '15%', padding: '6px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      Status at<br />End 2025
                    </th>
                    <th style={{ width: '15%', padding: '6px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      KPI Target<br />2026
                    </th>
                    <th colSpan={4} style={{ backgroundColor: '#0284c7', color: 'white', padding: '6px 4px', fontWeight: 'bold' }}>
                      Status
                    </th>
                  </tr>
                  {/* Sub Header Row for Q1..Q4 */}
                  <tr style={{ backgroundColor: '#e0f2fe', borderBottom: '1px solid #cbd5e1' }}>
                    <th colSpan={4} style={{ borderRight: '1px solid #cbd5e1' }}></th>
                    <th style={{ width: '10%', padding: '4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>Q1</th>
                    <th style={{ width: '10%', padding: '4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>Q2</th>
                    <th style={{ width: '10%', padding: '4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>Q3</th>
                    <th style={{ width: '10%', padding: '4px', fontWeight: 'bold' }}>Q4</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    {/* Frequency */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1' }}>
                      {formData.frequencyOfReview || 4}
                    </td>

                    {/* KPI Target 2025 */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.kpiTargetPrevious || ''}
                          onChange={e => setFormData({ ...formData, kpiTargetPrevious: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '10.5px' }}
                        />
                      ) : (
                        formData.kpiTargetPrevious || '-'
                      )}
                    </td>

                    {/* Status at End 2025 */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.statusPreviousYear || ''}
                          onChange={e => setFormData({ ...formData, statusPreviousYear: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '10.5px' }}
                        />
                      ) : (
                        formData.statusPreviousYear || '-'
                      )}
                    </td>

                    {/* KPI Target 2026 */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.kpiTargetCurrent || ''}
                          onChange={e => setFormData({ ...formData, kpiTargetCurrent: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '10.5px', fontWeight: 'bold' }}
                        />
                      ) : (
                        formData.kpiTargetCurrent || '-'
                      )}
                    </td>

                    {/* Q1 */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f766e' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.q1Status || ''}
                          onChange={e => setFormData({ ...formData, q1Status: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #0f766e', fontSize: '10.5px', fontWeight: 'bold' }}
                        />
                      ) : (
                        formData.q1Status || '0'
                      )}
                    </td>

                    {/* Q2 */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f766e' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.q2Status || ''}
                          onChange={e => setFormData({ ...formData, q2Status: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #0f766e', fontSize: '10.5px', fontWeight: 'bold' }}
                        />
                      ) : (
                        formData.q2Status || '0'
                      )}
                    </td>

                    {/* Q3 */}
                    <td style={{ padding: '8px 4px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f766e' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.q3Status || ''}
                          onChange={e => setFormData({ ...formData, q3Status: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #0f766e', fontSize: '10.5px', fontWeight: 'bold' }}
                        />
                      ) : (
                        formData.q3Status || '0'
                      )}
                    </td>

                    {/* Q4 */}
                    <td style={{ padding: '8px 4px', fontWeight: 'bold', color: '#0f766e' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.q4Status || ''}
                          onChange={e => setFormData({ ...formData, q4Status: e.target.value })}
                          style={{ width: '90%', textAlign: 'center', border: '1px solid #0f766e', fontSize: '10.5px', fontWeight: 'bold' }}
                        />
                      ) : (
                        formData.q4Status || '0'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comments */}
            <div style={{ display: 'flex', marginBottom: '14px', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px', flexShrink: 0 }}>
                COMMENTS:
              </div>
              <div style={{ flex: 1, border: '1px solid black', padding: '6px 8px', minHeight: '50px', backgroundColor: '#ffffff' }}>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={formData.comments || ''}
                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent', resize: 'none' }}
                  />
                ) : (
                  formData.comments || '-'
                )}
              </div>
            </div>

            {/* Records */}
            <div style={{ display: 'flex', marginBottom: '22px', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 'bold', width: '170px', fontSize: '11.5px', flexShrink: 0 }}>
                RECORDS:
              </div>
              <div style={{ flex: 1, border: '1px solid black', padding: '6px 8px', minHeight: '36px', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.records || ''}
                    onChange={e => setFormData({ ...formData, records: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11px', backgroundColor: 'transparent' }}
                  />
                ) : (
                  formData.records || '-'
                )}
              </div>
            </div>

            {/* Approvals Box & Stamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
              {/* Official Stamp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/prome-stamp.png" alt="PROME Stamp" style={{ width: '90px', opacity: 0.85 }} />
              </div>

              {/* Approvals Table */}
              <div style={{ width: '380px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <th colSpan={2} style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold', color: '#475569' }}>
                        Approvals
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ width: '40%', padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #cbd5e1' }}>Role</th>
                      <th style={{ width: '60%', padding: '4px 6px', textAlign: 'left' }}>Signature and Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ padding: '6px', fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>
                        Department Head
                      </td>
                      <td style={{ padding: '6px', color: '#334155' }}>
                        {formData.departmentHeadApproval || 'Godfrey Ssambwa'} · {formData.departmentHeadDate || '2026-01-15'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px', fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>
                        Managing Director
                      </td>
                      <td style={{ padding: '6px', color: '#334155' }}>
                        {formData.managingDirectorApproval || 'Ronald Kibuuka'} · {formData.managingDirectorDate || '2026-01-15'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Version Tag */}
            <div style={{ position: 'absolute', bottom: '12mm', right: '20mm', fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>
              Version 3.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
