import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCode } from 'react-qr-code';
import JsBarcode from 'jsbarcode';
import { useEffect } from 'react';

interface FormItem {
  id: string;
  description: string;
  budget: number;
  expenditure: number;
  amount: number;
}

export default function FundsRequisitionForm() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    voteProject: '',
    amountInWords: '',
    purpose: '',
  });

  const [items, setItems] = useState<FormItem[]>([
    { id: '1', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '2', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '3', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '4', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '5', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '6', description: '', budget: 0, expenditure: 0, amount: 0 }
  ]);

  const [uniqueId, setUniqueId] = useState<string | null>(null);

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalBudget = items.reduce((sum, item) => sum + (item.budget || 0), 0);
  const totalExpenditure = items.reduce((sum, item) => sum + (item.expenditure || 0), 0);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, uniqueId || 'PROME-IMSR-AFD-15', {
          format: 'CODE128',
          displayValue: true,
          height: 40,
          width: 1.5,
          fontSize: 14,
          margin: 0
        });
      } catch (e) {
        console.error('Barcode generation failed', e);
      }
    }
  }, [uniqueId]);

  const updateItem = (id: string, field: keyof FormItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveAndExport = async () => {
    try {
      setIsSubmitting(true);
      
      // 1. Submit to API to get Unique ID
      const token = localStorage.getItem('token');
      const payload = {
        formType: 'FundsRequisition',
        data: {
          ...formData,
          totalAmount,
          items
        }
      };
      
      let currentUniqueId = uniqueId;

      if (!currentUniqueId) {
        const response = await fetch('/api/forms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const result = await response.json();
          currentUniqueId = result.uniqueId;
          setUniqueId(currentUniqueId);
        } else {
          throw new Error('Failed to save form to database');
        }
      }

      // 2. Generate PDF
      if (formRef.current) {
        // Wait a tiny bit for React to render the new Unique ID if it was just set
        setTimeout(async () => {
          const element = formRef.current!;
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${currentUniqueId || 'Funds-Requisition'}.pdf`);
          
          setIsSubmitting(false);
          alert('Form saved and PDF generated successfully!');
          navigate('/forms');
        }, 100);
      } else {
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error(error);
      alert(`An error occurred while saving the form: ${error.message || error}`);
      setIsSubmitting(false);
    }
  };

  return (
      <div className="layout-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => navigate('/forms')}
              style={{ background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={18} color="#374151" />
            </button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', margin: 0 }}>Funds Requisition Form</h1>
          </div>
          
          <button 
            onClick={handleSaveAndExport}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Saving...' : <><FileDown size={18} /> Save & Export PDF</>}
          </button>
        </div>

        {/* This div is the actual page that gets exported to PDF */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div 
            ref={formRef}
            style={{ 
              width: '210mm', 
              height: '297mm', 
              backgroundColor: 'white', 
              padding: '20mm', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontFamily: '"Times New Roman", Times, serif',
              color: 'black',
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src="/prome.png" alt="PROME Logo" style={{ height: '60px' }} />
                <div>
                  <svg ref={barcodeRef}></svg>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                {uniqueId ? (
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '600', color: '#334155', borderBottom: '1px solid #e2e8f0', padding: '4px 8px' }}>
                    {uniqueId}
                  </div>
                ) : (
                  <div style={{ border: '1px dashed #ccc', padding: '4px 8px', color: '#999', fontSize: '12px' }}>
                    ID generated upon save
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#334155', textDecoration: 'underline' }}>FUNDS REQUISITION FORM</h3>
            </div>

            {/* Form Fields */}
            <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', padding: '8px 0', fontWeight: '600', color: '#334155' }}>Date:</td>
                  <td style={{ width: '75%', borderBottom: '1px solid #cbd5e1' }}>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent', color: '#0f172a' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '600', color: '#334155' }}>Vote/Project:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <input 
                      type="text" 
                      value={formData.voteProject}
                      onChange={(e) => setFormData({...formData, voteProject: e.target.value})}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent', color: '#0f172a' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '600', color: '#334155' }}>Amount Requisitioned:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                    {totalAmount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '600', color: '#334155' }}>Amount in Words:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <input 
                      type="text" 
                      value={formData.amountInWords}
                      onChange={(e) => setFormData({...formData, amountInWords: e.target.value})}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent', color: '#0f172a' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '600', verticalAlign: 'top' }}>Purpose:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <textarea 
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      rows={3}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', resize: 'none', backgroundColor: 'transparent', color: '#0f172a' }} 
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '5%', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '40%', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '15%', textAlign: 'right' }}>Budget</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '20%', textAlign: 'right' }}>Expenditure to date</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '20%', textAlign: 'right' }}>Amount Requisitioned</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ borderBottom: '1px solid #e2e8f0', padding: '4px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0' }}>
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.budget || ''}
                        onChange={(e) => updateItem(item.id, 'budget', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.expenditure || ''}
                        onChange={(e) => updateItem(item.id, 'expenditure', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0' }}>
                      <div style={{ display: 'flex' }}>
                        <input 
                          type="number" 
                          value={item.amount || ''}
                          onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', boxSizing: 'border-box', fontWeight: '600'}}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>TOTAL</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalBudget.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalExpenditure.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginBottom: '40px' }}></div>
            {/* Approvals Section */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginTop: '40px' }}>
              <div style={{ color: '#0f172a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px', fontSize: '14px' }}>
                APPROVALS
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 40px 0', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Requested By:</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', color: '#64748b' }}>Signature</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Date: <span style={{display: 'inline-block', width: '120px', borderBottom: '1px solid #cbd5e1'}}></span></p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 40px 0', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Checked By (Project Officer):</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', color: '#64748b' }}>Signature</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Date: <span style={{display: 'inline-block', width: '120px', borderBottom: '1px solid #cbd5e1'}}></span></p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 40px 0', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Approved By (Director):</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', color: '#64748b' }}>Signature</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Date: <span style={{display: 'inline-block', width: '120px', borderBottom: '1px solid #cbd5e1'}}></span></p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
              PROME Consultants Ltd - ISO 9001:2015 Certified
            </div>

            <div style={{ position: 'absolute', bottom: '10mm', left: '20mm' }}>
              <img src="/prome-stamp.png" alt="PROME Stamp" style={{ width: '80px', opacity: 0.9 }} />
            </div>

            <div style={{ position: 'absolute', bottom: '10mm', right: '20mm' }}>
              <QRCode 
                value={JSON.stringify({
                  id: uniqueId || 'PROME-IMSR-AFD-15',
                  date: formData.date,
                  project: formData.voteProject,
                  amount: totalAmount,
                  pdfUrl: `https://ims.promeconsult.com/forms/funds-requisition/${uniqueId || 'PROME-IMSR-AFD-15'}.pdf`
                })} 
                size={80} 
              />
            </div>

          </div>
        </div>
      </div>
  );
}
