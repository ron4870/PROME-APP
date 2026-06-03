import re

with open('src/pages/forms/FundsRequisitionForm.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, useSearchParams } from 'react-router-dom';")

# 2. Add searchParams and isReadOnly
hook_str = """  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('id');
  const isReadOnly = !!viewId;"""
content = content.replace("  const navigate = useNavigate();", hook_str)

# 3. Add useEffect to fetch data
fetch_effect = """
  useEffect(() => {
    if (viewId) {
      const fetchFormData = async () => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
          const res = await fetch(`/api/forms/${viewId}`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (res.ok) {
            const result = await res.json();
            if (result.data) {
              setFormData({
                date: result.data.date || '',
                voteProject: result.data.voteProject || '',
                amountInWords: result.data.amountInWords || '',
                purpose: result.data.purpose || '',
              });
              if (result.data.items && Array.isArray(result.data.items)) {
                setItems(result.data.items);
              }
              setUniqueId(result.uniqueId);
            }
          }
        } catch (err) {
          console.error("Failed to load form data", err);
        }
      };
      fetchFormData();
    }
  }, [viewId]);

  const updateItem"""
content = content.replace("  const updateItem", fetch_effect)

# 4. Modify handleSaveAndExport
save_logic = """      // 1. Submit to API to get Unique ID
      const payload = {
        formType: 'FundsRequisition',
        data: {
          ...formData,
          totalAmount,
          items
        }
      };
      
      let currentUniqueId = uniqueId;

      if (!isReadOnly && !currentUniqueId) {"""
content = content.replace("""      // 1. Submit to API to get Unique ID
      const payload = {
        formType: 'FundsRequisition',
        data: {
          ...formData,
          totalAmount,
          items
        }
      };
      
      let currentUniqueId = uniqueId;

      if (!currentUniqueId) {""", save_logic)

# 5. Modify Save button text
content = content.replace("{isSubmitting ? 'Saving...' : <><FileDown size={18} /> Save & Export PDF</>}", "{isSubmitting ? (isReadOnly ? 'Exporting...' : 'Saving...') : <><FileDown size={18} /> {isReadOnly ? 'Export PDF' : 'Save & Export PDF'}</>}")
content = content.replace("alert('Form saved and PDF generated successfully!');", "if (!isReadOnly) alert('Form saved and PDF generated successfully!');")


# 6. Add pointerEvents to disable form if readOnly
content = content.replace("            {/* Form Fields */}", "            {/* Form Fields */}\\n            <div style={{ pointerEvents: isReadOnly ? 'none' : 'auto' }}>")
content = content.replace("            <div style={{ marginBottom: '40px' }}></div>", "            </div>\\n            <div style={{ marginBottom: '40px' }}></div>")

# 7. Modify QR Code value
qr_value = """value={`https://ims.promeconsult.com/forms/funds-requisition?id=${uniqueId || 'PROME-IMSR-AFD-15'}`}"""
content = re.sub(r"value=\{JSON\.stringify\(\{.*?(?=\s+size=\{)\}", qr_value, content, flags=re.DOTALL)


with open('src/pages/forms/FundsRequisitionForm.tsx', 'w') as f:
    f.write(content)

