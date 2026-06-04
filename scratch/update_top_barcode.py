import re

with open('src/pages/forms/FundsRequisitionForm.tsx', 'r') as f:
    content = f.read()

# 1. Update useEffect for barcode
effect_old = """  useEffect(() => {
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
  }, [uniqueId]);"""

effect_new = """  useEffect(() => {
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
  }, [uniqueId]);"""

content = content.replace(effect_old, effect_new)

# 2. Update Header DOM
header_old = """            {/* Header */}
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
            </div>"""

header_new = """            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src="/prome.png" alt="PROME Logo" style={{ height: '60px' }} />
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
            </div>"""

content = content.replace(header_old, header_new)

# 3. Update QR Code value
qr_old = """value={`https://ims.promeconsult.com/forms/funds-requisition?id=${uniqueId || 'PROME-IMSR-AFD-15'}`}"""
qr_new = """value={`https://ims.promeconsult.com/forms/funds-requisition?id=${uniqueId || ''}`}"""
content = content.replace(qr_old, qr_new)

with open('src/pages/forms/FundsRequisitionForm.tsx', 'w') as f:
    f.write(content)

