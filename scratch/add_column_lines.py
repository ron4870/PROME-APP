import re

with open('src/pages/forms/FundsRequisitionForm.tsx', 'r') as f:
    content = f.read()

# 1. Update th elements
th_old = """                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '5%', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '40%', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '15%', textAlign: 'right' }}>Budget</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '20%', textAlign: 'right' }}>Expenditure to date</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '20%', textAlign: 'right' }}>Amount Requisitioned</th>"""

th_new = """                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '5%', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>No.</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '40%', textAlign: 'left', borderRight: '1px solid #f1f5f9' }}>Item Description</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '15%', textAlign: 'right', borderRight: '1px solid #f1f5f9' }}>Budget</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '20%', textAlign: 'right', borderRight: '1px solid #f1f5f9' }}>Expenditure to date</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', width: '20%', textAlign: 'right' }}>Amount Requisitioned</th>"""
content = content.replace(th_old, th_new)

# 2. Update td elements (first 4 columns)
td1_old = """<td style={{ borderBottom: '1px solid #e2e8f0', padding: '4px', textAlign: 'center' }}>{index + 1}</td>"""
td1_new = """<td style={{ borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #f1f5f9', padding: '4px', textAlign: 'center' }}>{index + 1}</td>"""
content = content.replace(td1_old, td1_new)

td_input_old = """<td style={{ borderBottom: '1px solid #e2e8f0', padding: '0' }}>"""
td_input_new = """<td style={{ borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #f1f5f9', padding: '0' }}>"""
# Since there are 4 inputs and we only want borderRight on the first 3 input TDs (which are columns 2, 3, 4), and the last one shouldn't have it.
# Wait, let's just do a string replace, but limit to the exact blocks we want.
content = content.replace(td_input_old, td_input_new, 3)

# 3. Update TOTAL row
total_old = """                <tr>
                  <td colSpan={2} style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>TOTAL</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalBudget.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalExpenditure.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalAmount.toLocaleString()}</td>
                </tr>"""

total_new = """                <tr>
                  <td colSpan={2} style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155', borderRight: '1px solid #f1f5f9' }}>TOTAL</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155', borderRight: '1px solid #f1f5f9' }}>{totalBudget.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155', borderRight: '1px solid #f1f5f9' }}>{totalExpenditure.toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right', color: '#334155' }}>{totalAmount.toLocaleString()}</td>
                </tr>"""
content = content.replace(total_old, total_new)

with open('src/pages/forms/FundsRequisitionForm.tsx', 'w') as f:
    f.write(content)

