import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, Printer } from 'lucide-react';
import { QRCode } from 'react-qr-code';

interface FormItem {
  id: string;
  description: string;
  qty: number;
  amount: number;
  qtyDelivered: number;
  invoiceNo: string;
}

export default function LocalPurchaseOrderForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('id');
  const isReadOnly = !!viewId;
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    deptProject: '',
    purchaser: '',
    remarks: '',
  });

  const [items, setItems] = useState<FormItem[]>([
    { id: '1', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '2', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '3', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '4', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '5', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '6', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '7', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '8', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
  ]);

  const [uniqueId, setUniqueId] = useState<string | null>(null);

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  useEffect(() => {
    if (barcodeRef.current && uniqueId) {
      try {
        JsBarcode(barcodeRef.current, uniqueId, {
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
        setFormData(data.data);
        if (data.data.items) setItems(data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch form details', error);
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveAndExport = async () => {
    try {
      setIsSubmitting(true);
      
      const payload = {
        formType: 'LocalPurchaseOrder',
        data: {
          ...formData,
          items
        }
      };
      
      let currentUniqueId = uniqueId;

      if (!isReadOnly && !currentUniqueId) {
        const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
        if (!token) throw new Error('No token');
        const response = await fetch('/api/forms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Failed to save form to database (Status ${response.status} ${response.statusText}): ${await response.text()}`);
        }
        const data = await response.json();
        currentUniqueId = data.uniqueId;
        setUniqueId(data.uniqueId);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!formRef.current) return;

      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${currentUniqueId || 'LPO'}.pdf`);

      if (!isReadOnly) {
        navigate(`/forms/local-purchase-order?id=${currentUniqueId}`, { replace: true });
      }
    } catch (error: any) {
      console.error('Failed to export PDF:', error);
      alert('An error occurred while saving the form: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout-container" style={{ paddingBottom: '40px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/forms')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
        >
          <ArrowLeft size={16} /> Back to Forms
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={handleSaveAndExport}
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#0f766e', border: 'none', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', color: 'white', fontWeight: '500' }}
          >
            {isReadOnly ? <Download size={16} /> : <Save size={16} />}
            {isSubmitting ? 'Saving...' : isReadOnly ? 'Download PDF' : 'Save & Download PDF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* A4 Page Container */}
        <div 
          ref={formRef}
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            fontFamily: 'Arial, sans-serif',
            color: 'black',
            boxSizing: 'border-box',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img src="/prome.png" alt="PROME Logo" style={{ height: '48px' }} />
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              {uniqueId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg ref={barcodeRef}></svg>
                </div>
              ) : (
                <div style={{ border: '1px dashed #ccc', padding: '4px 8px', color: '#999', fontSize: '12px', height: '60px', display: 'flex', alignItems: 'center' }}>
                  Barcode generated upon save
                </div>
              )}
            </div>
          </div>

          <div style={{ pointerEvents: isReadOnly ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '12px', border: '1px solid black', padding: '4px 8px', fontWeight: 'bold' }}>
              <div>I.D. No : PROME-QSR-AFD-12</div>
              <div>Version No : 05</div>
              <div>Date of issue : June 2026</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827', textDecoration: 'underline' }}>LOCAL PURCHASE ORDER FORM</h3>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontStyle: 'italic', color: '#4b5563' }}>To be completed only after approval is granted. This form is carried along or sent to the Suppliers Premises.</p>
            </div>

            {/* Form Fields */}
            <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', width: '25%', fontWeight: '600' }}>Expected delivery date:</td>
                  <td style={{ padding: '8px', width: '25%', borderBottom: '1px solid black' }}>
                    <input 
                      type="date" 
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({...formData, expectedDeliveryDate: e.target.value})}
                      style={{ width: '100%', border: 'none', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                  <td style={{ padding: '8px', width: '20%', fontWeight: '600', textAlign: 'right' }}>Order Date:</td>
                  <td style={{ padding: '8px', width: '30%', borderBottom: '1px solid black' }}>
                    <input 
                      type="date" 
                      value={formData.orderDate}
                      onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                      style={{ width: '100%', border: 'none', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}></td>
                  <td style={{ padding: '8px', width: '20%', fontWeight: '600', textAlign: 'right' }}>Dept/Project:</td>
                  <td style={{ padding: '8px', width: '30%', borderBottom: '1px solid black' }}>
                    <input 
                      type="text" 
                      value={formData.deptProject}
                      onChange={(e) => setFormData({...formData, deptProject: e.target.value})}
                      style={{ width: '100%', border: 'none', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}></td>
                  <td style={{ padding: '8px', width: '20%', fontWeight: '600', textAlign: 'right' }}>Purchaser:</td>
                  <td style={{ padding: '8px', width: '30%', borderBottom: '1px solid black' }}>
                    <input 
                      type="text" 
                      value={formData.purchaser}
                      onChange={(e) => setFormData({...formData, purchaser: e.target.value})}
                      style={{ width: '100%', border: 'none', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }} 
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', border: '1px solid black' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', color: '#111827', borderBottom: '1px solid black' }}>
                  <th style={{ padding: '10px 4px', fontWeight: '600', width: '5%', textAlign: 'center', borderRight: '1px solid black' }}>Item<br/>No.</th>
                  <th style={{ padding: '10px 8px', fontWeight: '600', width: '35%', textAlign: 'left', borderRight: '1px solid black' }}>Description of Item<br/><span style={{fontSize: '10px', fontStyle: 'italic', fontWeight: 'normal'}}>(Give all the necessary specifications of the items, use additional paper)</span></th>
                  <th style={{ padding: '10px 4px', fontWeight: '600', width: '10%', textAlign: 'center', borderRight: '1px solid black' }}>Qty</th>
                  <th style={{ padding: '10px 4px', fontWeight: '600', width: '20%', textAlign: 'center', borderRight: '1px solid black' }}>Amount<br/>(Shs or $)</th>
                  <th style={{ padding: '10px 4px', fontWeight: '600', width: '15%', textAlign: 'center', borderRight: '1px solid black' }}>Qty<br/>delivered</th>
                  <th style={{ padding: '10px 4px', fontWeight: '600', width: '15%', textAlign: 'center' }}>Invoice<br/>No.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '4px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '0' }}>
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', outline: 'none', backgroundColor: 'transparent', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.qty || ''}
                        onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'center', outline: 'none', backgroundColor: 'transparent', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.amount || ''}
                        onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'right', outline: 'none', backgroundColor: 'transparent', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '0' }}>
                      <input 
                        type="number" 
                        value={item.qtyDelivered || ''}
                        onChange={(e) => updateItem(item.id, 'qtyDelivered', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'center', outline: 'none', backgroundColor: 'transparent', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ borderBottom: '1px solid black', padding: '0' }}>
                      <input 
                        type="text" 
                        value={item.invoiceNo || ''}
                        onChange={(e) => updateItem(item.id, 'invoiceNo', e.target.value)}
                        style={{ width: '100%', border: 'none', padding: '8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'center', outline: 'none', backgroundColor: 'transparent', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ padding: '8px', fontWeight: 'bold', textAlign: 'center', color: '#111827', borderRight: '1px solid black', borderBottom: '1px solid black' }}>Total</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: '#111827', borderRight: '1px solid black', borderBottom: '1px solid black' }}>{totalAmount.toLocaleString()}</td>
                  <td colSpan={2} style={{ borderBottom: '1px solid black' }}></td>
                </tr>
                <tr>
                  <td colSpan={6} style={{ padding: '0', borderBottom: '1px solid black' }}>
                    <div style={{ display: 'flex', padding: '8px', fontWeight: 'bold' }}>
                      <span style={{ width: '100px' }}>REMARKS:</span>
                      <textarea 
                        value={formData.remarks}
                        onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                        rows={2}
                        style={{ flex: 1, border: 'none', fontFamily: 'inherit', fontSize: '14px', outline: 'none', resize: 'none', backgroundColor: 'transparent', color: '#111827' }} 
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Approvals Section */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', padding: '12px 8px', borderRight: '1px solid black', borderBottom: '1px solid black', verticalAlign: 'top', height: '80px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>Authorised By:</div>
                  </td>
                  <td style={{ width: '50%', padding: '12px 8px', borderBottom: '1px solid black', verticalAlign: 'top', height: '80px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>Checked By (Accounts Department):</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '50%', padding: '12px 8px', borderRight: '1px solid black', verticalAlign: 'top', height: '80px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>Approved By (Managing Director):</div>
                  </td>
                  <td style={{ width: '50%', padding: '12px 8px', verticalAlign: 'top', height: '80px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>Received By (Supplier signature & Stamp):</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '20px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
              <div>PROME Consultants Ltd - ISO 9001:2015 Certified</div>
              <div>&copy; {new Date().getFullYear()} PROME Consultants Ltd. All Rights Reserved.</div>
            </div>

            <div style={{ position: 'absolute', bottom: '10mm', right: '20mm' }}>
              <QRCode 
                value={`https://ims.promeconsult.com/forms/local-purchase-order?id=${uniqueId || ''}`}
                size={60} 
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
