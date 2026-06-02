import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'react-qr-code';
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
    { id: '1', description: '', budget: 0, expenditure: 0, amount: 0 }
  ]);

  const [uniqueId, setUniqueId] = useState<string | null>(null);

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalBudget = items.reduce((sum, item) => sum + (item.budget || 0), 0);
  const totalExpenditure = items.reduce((sum, item) => sum + (item.expenditure || 0), 0);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, uniqueId || 'DRAFT-FORM', {
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

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', budget: 0, expenditure: 0, amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

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
          const canvas = await html2canvas(element, { scale: 2 });
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
    } catch (error) {
      console.error(error);
      alert('An error occurred while saving the form.');
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Funds Requisition Form</h1>
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
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', border: '1px solid black', padding: '4px 8px' }}>
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', textDecoration: 'underline' }}>FUNDS REQUISITION FORM</h3>
            </div>

            {/* Form Fields */}
            <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', padding: '8px 0', fontWeight: 'bold' }}>Date:</td>
                  <td style={{ width: '75%', borderBottom: '1px dotted black' }}>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Vote/Project:</td>
                  <td style={{ borderBottom: '1px dotted black' }}>
                    <input 
                      type="text" 
                      value={formData.voteProject}
                      onChange={(e) => setFormData({...formData, voteProject: e.target.value})}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Amount Requisitioned (UGX):</td>
                  <td style={{ borderBottom: '1px dotted black', fontSize: '14px', fontWeight: 'bold' }}>
                    {totalAmount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Amount in Words:</td>
                  <td style={{ borderBottom: '1px dotted black' }}>
                    <input 
                      type="text" 
                      value={formData.amountInWords}
                      onChange={(e) => setFormData({...formData, amountInWords: e.target.value})}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: 'bold', verticalAlign: 'top' }}>Purpose:</td>
                  <td style={{ borderBottom: '1px dotted black' }}>
                    <textarea 
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      rows={3}
                      style={{ border: 'none', width: '100%', fontFamily: 'inherit', fontSize: '14px', outline: 'none', resize: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid black', padding: '8px', width: '5%', textAlign: 'center' }}>No.</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '40%', textAlign: 'left' }}>Item Description</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '15%', textAlign: 'right' }}>Budget (UGX)</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '20%', textAlign: 'right' }}>Expenditure to date (UGX)</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '20%', textAlign: 'right' }}>Amount Requisitioned (UGX)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ border: '1px solid black', padding: '0' }}>
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ border: '1px solid black', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.budget || ''}
                        onChange={(e) => updateItem(item.id, 'budget', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ border: '1px solid black', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.expenditure || ''}
                        onChange={(e) => updateItem(item.id, 'expenditure', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ border: '1px solid black', padding: '0' }}>
                      <div style={{ display: 'flex' }}>
                        <input 
                          type="number" 
                          value={item.amount || ''}
                          onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box', fontWeight: 'bold' }}
                        />
                        <button 
                          onClick={() => removeItem(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 8px' }}
                          title="Remove item"
                        >×</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{totalBudget.toLocaleString()}</td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{totalExpenditure.toLocaleString()}</td>
                  <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginBottom: '40px' }}>
              <button 
                onClick={addItem}
                style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
              >
                + Add Item
              </button>
            </div>

            {/* Approvals Section */}
            <div style={{ border: '1px solid black' }}>
              <div style={{ borderBottom: '1px solid black', padding: '4px 8px', backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                APPROVALS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '33%', borderRight: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                      <p style={{ margin: '0 0 40px 0', fontWeight: 'bold' }}>Requested By:</p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', borderTop: '1px dotted black', paddingTop: '4px' }}>Name & Signature</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>Date: .......................................</p>
                    </td>
                    <td style={{ width: '33%', borderRight: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                      <p style={{ margin: '0 0 40px 0', fontWeight: 'bold' }}>Checked By (Finance):</p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', borderTop: '1px dotted black', paddingTop: '4px' }}>Name & Signature</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>Date: .......................................</p>
                    </td>
                    <td style={{ width: '34%', padding: '8px', verticalAlign: 'top' }}>
                      <p style={{ margin: '0 0 40px 0', fontWeight: 'bold' }}>Approved By (Director):</p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', borderTop: '1px dotted black', paddingTop: '4px' }}>Name & Signature</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>Date: .......................................</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            
            <div style={{ marginTop: '20px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
              PROME Consultants Ltd - ISO 9001:2015 Certified
            </div>

            <div style={{ position: 'absolute', bottom: '20mm', right: '20mm' }}>
              <QRCode 
                value={JSON.stringify({
                  id: uniqueId || 'DRAFT',
                  date: formData.date,
                  project: formData.voteProject,
                  amount: totalAmount,
                  pdfUrl: `https://ims.promeconsult.com/forms/funds-requisition/${uniqueId || 'DRAFT'}.pdf`
                })} 
                size={80} 
              />
            </div>

          </div>
        </div>
      </div>
  );
}
