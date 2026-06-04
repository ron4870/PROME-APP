import re

with open('src/pages/forms/FundsRequisitionForm.tsx', 'r') as f:
    content = f.read()

# Replace Form Name and Route logic
content = content.replace('FundsRequisitionForm', 'LocalPurchaseOrderForm')
content = content.replace('FundsRequisition', 'LocalPurchaseOrder')
content = content.replace('forms/funds-requisition', 'forms/local-purchase-order')
content = content.replace('FUNDS REQUISITION FORM', 'LOCAL PURCHASE ORDER FORM')

# Replace State Data
old_state = """  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    voteProject: '',
    amountInWords: '',
    purpose: '',
  });"""

new_state = """  const [formData, setFormData] = useState({
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    deptProject: '',
    purchaser: '',
    remarks: '',
  });"""
content = content.replace(old_state, new_state)

# Replace Form Item interface
old_item = """interface FormItem {
  id: string;
  description: string;
  budget: number;
  expenditure: number;
  amount: number;
}"""

new_item = """interface FormItem {
  id: string;
  description: string;
  qty: number;
  amount: number;
  qtyDelivered: number;
  invoiceNo: string;
}"""
content = content.replace(old_item, new_item)

# Replace Items Initial State
old_items_state = """  const [items, setItems] = useState<FormItem[]>([
    { id: '1', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '2', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '3', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '4', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '5', description: '', budget: 0, expenditure: 0, amount: 0 },
    { id: '6', description: '', budget: 0, expenditure: 0, amount: 0 }
  ]);"""

new_items_state = """  const [items, setItems] = useState<FormItem[]>([
    { id: '1', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '2', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '3', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '4', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '5', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '6', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '7', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' },
    { id: '8', description: '', qty: 0, amount: 0, qtyDelivered: 0, invoiceNo: '' }
  ]);"""
content = content.replace(old_items_state, new_items_state)

# Totals
old_totals = """  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalBudget = items.reduce((sum, item) => sum + (item.budget || 0), 0);
  const totalExpenditure = items.reduce((sum, item) => sum + (item.expenditure || 0), 0);"""

new_totals = """  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);"""
content = content.replace(old_totals, new_totals)

# Remove old totals from payload
content = content.replace("          totalAmount,\n          items", "          items")

# We will need to do a custom regex or manual replacement for the form fields HTML
# It's safer to just write the new component from a template instead of regex replacing complex React trees.
