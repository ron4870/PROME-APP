import re

with open('src/pages/forms/FormsDirectory.tsx', 'r') as f:
    content = f.read()

# Replace the layout
lpo_card = """              {/* Local Purchase Order */}
              <div 
                style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0f766e'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                onClick={() => navigate('/forms/local-purchase-order')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#f0fdfa', padding: '0.75rem', borderRadius: '8px' }}>
                    <FileText size={24} color="#0f766e" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>Local Purchase Order</h3>
                    <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: '600' }}>Procurement</span>
                  </div>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                  Issue an LPO to suppliers for goods or services needed on-site or in the office.
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Fill Form <Plus size={16} />
                  </span>
                </div>
              </div>

              {/* Add more forms here in the future */}"""

content = content.replace("{/* Add more forms here in the future */}", lpo_card)

# Update the submission history text logic
history_old = """{form.formType === 'FundsRequisition' ? 'Funds Requisition' : form.formType}"""
history_new = """{form.formType === 'FundsRequisition' ? 'Funds Requisition' : form.formType === 'LocalPurchaseOrder' ? 'Local Purchase Order' : form.formType}"""
content = content.replace(history_old, history_new)

with open('src/pages/forms/FormsDirectory.tsx', 'w') as f:
    f.write(content)
